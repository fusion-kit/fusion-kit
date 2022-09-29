import asyncio
from random import randint
from broadcaster import Broadcast
from copy import copy
import json
import blurhash_numba
import numpy
import os
from PIL import Image
from processor import Processor
import re
from sqlalchemy import select
from ulid import ULID
import db
from domain.dream import Dream
from domain.settings import Settings

DB_SETTINGS_KEY = 'settings_v0'

class FusionKitManager():
    def __init__(self, db_config, data_dir):
        self.db_engine = db_config.db_engine
        self.data_dir = data_dir

        self.settings = Settings.get_default_settings()
        with db.Session() as session:
            result = session.execute(
                select(db.Settings)
                    .where(db.Settings.key == DB_SETTINGS_KEY)
                    .limit(1)
            )
            settings_row = result.scalar()
            if settings_row is None:
                print('Settings not found (first-time setup)')
            else:
                settings_json = json.loads(settings_row.settings_json)
                self.settings = Settings.from_json(settings_json)

        settings_errors = self.settings.validate(self.data_dir)

        if len(settings_errors) == 0:
            print("loaded settings successfully")
            self.settings.synthesize_invoke_ai_config(self.invoke_ai_config_path)
        else:
            print("settings not ready:")
            for error in settings_errors:
                print(error)


        self.broadcast = Broadcast("memory://")
        self.processor = Processor(
            broadcast=self.broadcast,
            settings=self.settings.to_json(),
            data_dir=self.data_dir,
        )
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
            base_image = Image.open(base_image_upload.file)
            options['base_image'] = base_image
            options['base_image_details'] = {
                'filename': base_image_upload.filename,
                'content_type': base_image_upload.content_type,
            }

            base_image_mask_upload = options.get('base_image_mask')
            if base_image_mask_upload is not None:
                options['base_image_mask'] = Image.open(base_image_mask_upload.file)
                options['base_image_mask_details'] = {
                    'filename': base_image_upload.filename,
                    'content_type': base_image_upload.content_type,
                }

            options['width'] = base_image.width
            options['height'] = base_image.width
        else:
            options.pop('base_image_decimation', None)
            options.pop('base_image_mask', None)

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
            dream_dir = os.path.join(self.images_dir, dream.id)
            base_image_path = None
            base_image_mask_path = None

            if dream.base_image is not None:
                os.makedirs(dream_dir, exist_ok=True)
                base_image_path = os.path.join(dream_dir, 'base-image.png')
                image_format = dream.base_image.format
                if image_format is None:
                    image_format = "PNG"
                dream.base_image.save(base_image_path, format=image_format)

            if dream.base_image_mask is not None:
                os.makedirs(dream_dir, exist_ok=True)
                base_image_mask_path = os.path.join(dream_dir, 'base-image-mask.png')
                image_format = dream.base_image_mask.format
                if image_format is None:
                    image_format = "PNG"
                dream.base_image_mask.save(base_image_mask_path, format=image_format)

            db_dream = db.Dream(
                id=dream.id,
                prompt=dream.prompt,
                seed=dream.seed,
                num_images=dream.num_images,
                settings_json=dream.settings_json(),
                base_image_path=base_image_path,
                base_image_mask_path=base_image_mask_path,
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

    def update_settings(self, new_settings):
        updated_settings = Settings(
            models=new_settings['models'],
            device=new_settings['device'],
            show_previews=new_settings['show_previews'],
            steps_per_preview=new_settings['steps_per_preview'],
            use_full_precision=new_settings['use_full_precision'],
        )

        errors = updated_settings.validate(self.data_dir)
        if len(errors) > 0:
            raise Exception(f"errors in settings: {', '.join(errors)}")

        with db.Session() as session:
            db_settings_query = session.execute(
                select(db.Settings)
                    .where(db.Settings.key == DB_SETTINGS_KEY)
                    .limit(1)
            )
            db_settings = db_settings_query.scalar()

            if db_settings is not None:
                db_settings.settings_json = json.dumps(updated_settings.to_json())
                session.merge(db_settings)
            else:
                db_settings = db.Settings(
                    key=DB_SETTINGS_KEY,
                    settings_json=json.dumps(updated_settings.to_json())
                )
                session.add(db_settings)

            session.commit()

        self.settings = updated_settings
        self.settings.synthesize_invoke_ai_config(self.invoke_ai_config_path)
        self.processor.update_settings(self.settings.to_json())

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

    @property
    def images_dir(self):
        return os.path.join(self.data_dir, 'images')

    @property
    def models_dir(self):
        return os.path.join(self.data_dir, 'models')

    @property
    def invoke_ai_config_path(self):
        return self.data_dir.join('/invoke-ai-config.yml')

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
