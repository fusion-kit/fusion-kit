import asyncio
from broadcaster import Broadcast
from copy import copy
import blurhash_numba
import json
import numpy
import os
from processor import Processor
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

    async def __aenter__(self):
        self.db_conn = self.db_engine.connect()
        await self.broadcast.connect()
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self.broadcast.disconnect()
        self.db_conn.close()

    async def start_dream(self, prompt, num_images):
        dream_id = str(ULID())
        responses = self.processor.send_request_and_watch(
            request_id=dream_id,
            request='txt2img',
            body={
                'prompt': prompt,
                'num_images': num_images,
                'num_images_per_batch': 2,
                'num_steps_per_image': 50,
                'steps_per_image_preview': 10,
            }
        )

        # TODO: Take num_steps_per_image as input
        dream = Dream(
            id=dream_id,
            prompt=prompt,
            num_images=num_images,
            num_steps_per_image=50,
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
                settings_json=json.dumps({}),
            )
            session.add(db_dream)

            for index, image in enumerate(dream.images):
                image_dir = os.path.join(self.images_dir, image.id)
                os.mkdir(image_dir)

                image_path = os.path.join(image_dir, "image.png")
                image.image.save(image_path, format="png")

                image_array = numpy.array(image.image.convert("RGB"), dtype=numpy.float)
                image_blurhash = blurhash_numba.encode(image_array)

                db_image = db.DreamImage(
                    id=image.id,
                    dream_id=image.dream_id,
                    seed=image.seed,
                    index=index,
                    image_path=os.path.relpath(image_path, start=self.images_dir),
                    width=image.image.width,
                    height=image.image.height,
                    blurhash=image_blurhash
                )
                session.add(db_image)

            session.commit()

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

                dream.images[i].image = image.get('image')
                dream.images[i].seed = image.get('seed')
                dream.images[i].num_finished_steps = image.get('completed_steps', 0)
        elif response.get('state') == 'complete':
            dream.state = 'FinishedDream'
            dream.seed = response['seed']
            for i, image in enumerate(response['images']):
                if image['state'] != 'complete':
                    raise Exception(f"Unexpected final image state: {image['state']}")
                dream.images[i].state = 'FinishedDreamImage'
                dream.images[i].image = image['image']
                dream.images[i].seed = image['seed']
                dream.images[i].num_finished_steps = image.get('completed_steps', 0)
            manager.persist_dream(dream)
        else:
            raise Exception(f"Unknown dream state: {response.get('state')}")

        await broadcast.publish(channel='dream', message=copy(dream))
