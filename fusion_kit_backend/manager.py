import asyncio
from random import randint
from broadcaster import Broadcast
from copy import copy
import blurhash_numba
import numpy
import os
from PIL import Image
from processor import Processor
import re
from ulid import ULID
import db
from domain.dream import Dream

class FusionKitManager():
    def __init__(self, db_config, images_dir):
        self.db_engine = db_config.db_engine
        self.images_dir = images_dir

        self.broadcast = Broadcast("memory://")
        self.processor = Processor(broadcast=self.broadcast)
        self.active_dreams = {}
        self.registered_images = {}

    async def __aenter__(self):
        self.db_conn = self.db_engine.connect()
        await self.broadcast.connect()
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self.broadcast.disconnect()
        self.db_conn.close()

    async def start_dream(self, input_options):
        dream_id = f'd_{ULID()}'

        options = copy(input_options)
        if options.get('seed') is None:
            options['seed'] = randint(0, 1000000)

        if options.get('base_image') is not None:
            base_image_upload = options['base_image']
            options['base_image'] = Image.open(base_image_upload.file)
            options['base_image_details'] = {
                'filename': base_image_upload.filename,
                'content_type': base_image_upload.content_type,
            }
        else:
            options.pop('base_image_decimation', None)

        dream_settings = {
            'options': options,
            'steps_per_image_preview': 10,
        }

        dream = Dream(id=dream_id, settings=dream_settings)

        responses = self.processor.send_request_and_watch(
            request_id=dream_id,
            request='dream',
            body=dream_settings
        )

        watcher_task = asyncio.create_task(dream_watcher(manager=self, dream=dream, responses=responses))
        self.active_dreams[dream_id] = {
            'dream': dream,
            'task': watcher_task,
        }

        return dream

    async def watch_dream(self, dream_id):
        active_dream = self.active_dreams.get(dream_id)
        if active_dream is None:
            raise Exception(f"active dream not found with ID {dream_id}")

        dream = active_dream['dream']
        yield dream
        if dream.is_complete():
            return

        async with self.broadcast.subscribe(channel='dream') as subscriber:
            async for event in subscriber:
                event_dream = event.message
                if event_dream.id == dream_id:
                    yield event_dream
                    if event_dream.is_complete():
                        return

    def persist_dream(self, dream):
        with db.Session() as session:
            db_dream = db.Dream(
                id=dream.id,
                prompt=dream.prompt,
                seed=dream.seed,
                num_images=dream.num_images,
                settings_json=dream.settings_json(),
            )
            session.add(db_dream)

            for index, dream_image in enumerate(dream.images):
                image_dir = os.path.join(self.images_dir, dream_image.id)
                os.mkdir(image_dir)

                image_path = os.path.join(image_dir, 'image.png')
                image = self.get_image(dream_image.image_key)
                image.save(image_path, format='png')

                image_array = numpy.array(image.convert('RGB'), dtype=numpy.float)
                image_blurhash = blurhash_numba.encode(image_array)

                db_image = db.DreamImage(
                    id=dream_image.id,
                    dream_id=dream_image.dream_id,
                    seed=dream_image.seed,
                    index=index,
                    image_path=os.path.relpath(image_path, start=self.images_dir),
                    width=image.width,
                    height=image.height,
                    blurhash=image_blurhash
                )
                session.add(db_image)

            session.commit()

    def register_image(self, image, key):
        if key not in self.registered_images:
            self.registered_images[key] = image

    def get_image(self, key):
        if key not in self.registered_images:
            raise Exception(f"Image not found: {key}")

        return self.registered_images[key]

    def get_image_by_path(self, path):
        result = re.search(r'^/images/(.*)\.png$', path)
        if result is None:
            raise Exception(f"Image not found at path: '{path}'")

        image_key = tuple(result.group(1).split('/'))
        return self.get_image(key=image_key)

    def get_image_uri(self, key):
        if key is None:
            return None

        if key not in self.registered_images:
            raise Exception(f"Image not found: {key}")

        segments = '/'.join(key)
        return f"/images/{segments}.png"

async def dream_watcher(manager, dream, responses):
    broadcast = manager.broadcast

    async for response in responses:
        if response.get('error') is not None:
            dream.state = 'StoppedDream'
            dream.reason = "DREAM_ERROR"
            dream.message = f"Error running dream: {response['error']}"
            for image in dream.images:
                image.state = 'StoppedDreamImage'
        elif response.get('state') == 'running':
            dream.state = 'RunningDream'
            for i, image in enumerate(response['image_progress']):
                if image['state'] == 'pending':
                    dream.images[i].state = 'PendingDreamImage'
                elif image['state'] == 'running':
                    dream.images[i].state = 'RunningDreamImage'
                elif image['state'] == 'complete':
                    dream.images[i].state = 'FinishedDreamImage'
                else:
                    print(f"warning: unexpected image state: {image['state']}")

                if image.get('image') is not None:
                    image_key = (dream.images[i].id, image['image_key'])
                    manager.register_image(image=image['image'], key=image_key)
                    dream.images[i].image_key = image_key

                dream.images[i].num_finished_steps = image.get('completed_steps', 0)
        elif response.get('state') == 'complete':
            dream.state = 'FinishedDream'
            for i, image in enumerate(response['images']):
                if image['state'] != 'complete':
                    raise Exception(f"Unexpected final image state: {image['state']}")

                image_key = (dream.images[i].id, image['image_key'])
                manager.register_image(image=image['image'], key=image_key)

                dream.images[i].state = 'FinishedDreamImage'
                dream.images[i].image_key = image_key
                dream.images[i].num_finished_steps = image.get('completed_steps', 0)
            manager.persist_dream(dream)
        else:
            raise Exception(f"Unknown dream state: {response.get('state')}")

        await broadcast.publish(channel='dream', message=copy(dream))
