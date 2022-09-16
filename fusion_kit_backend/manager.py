import asyncio
from functools import partial
from broadcaster import Broadcast
import blurhash_numba
import json
import multiprocessing
import numpy
import os
from PIL import Image
import tasks
from ulid import ULID
import db
from domain.dream import Dream

class FusionKitManager():
    def __init__(self, db_config, images_dir):
        self.db_engine = db_config.db_engine
        self.images_dir = images_dir

        self.process = None
        self.broadcast = Broadcast("memory://")
        self.dreams = {}
        self.get_processor()

    async def __aenter__(self):
        self.db_conn = self.db_engine.connect()
        await self.broadcast.connect()
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self.broadcast.disconnect()
        self.db_conn.close()

    async def start_dream(self, prompt):
        dream_id = str(ULID())
        processor = self.get_processor()
        processor['req_queue'].put({
            'id': dream_id,
            'request': 'txt2img',
            'prompt': prompt,
        })

        # TODO: Take num_images and num_steps_per_image as input
        dream = Dream(
            dream_id,
            self,
            prompt=prompt,
            num_images=1,
            num_steps_per_image=50
        )

        self.dreams[dream_id] = dream

        return dream

    async def watch_dream(self, dream_id):
        dream = self.dreams[dream_id]
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


    def get_processor(self):
        if self.process is None or not self.process.is_alive():
            self.req_queue = multiprocessing.Queue()
            self.res_queue = multiprocessing.Queue()
            self.process = multiprocessing.Process(
                target=fusion_kit_manager_processor,
                kwargs={
                    'req_queue': self.req_queue,
                    'res_queue': self.res_queue,
                }
            )
            self.process.start()

            self.broadcast_task = asyncio.create_task(
                fusion_kit_manager_broadcaster(
                    res_queue=self.res_queue,
                    broadcast=self.broadcast,
                )
            )

            self.watchdog_task = asyncio.create_task(fusion_kit_manager_watchdog(self))

        return {
            'req_queue': self.req_queue,
            'res_queue': self.res_queue,
        }

def fusion_kit_manager_processor(req_queue, res_queue):
    print("started processor")
    while True:
        request = req_queue.get()
        if request['request'] == 'txt2img':
            image_sample_callback = partial(
                txt2img_sample_callback,
                request_id=request['id'],
                res_queue=res_queue,
            )
            result = tasks.txt2img(request['prompt'], image_sample_callback=image_sample_callback)
            res_queue.put({
                'id': request['id'],
                'state': 'complete',
                'images': result['images'],
                'seed': result['seed'],
            })
        else:
            print(f"Unkown request type: {request['request']}")

def txt2img_sample_callback(images, n, request_id, res_queue):
    res_queue.put({
        'id': request_id,
        'state': 'running',
        'preview_images': images,
    })

async def fusion_kit_manager_broadcaster(res_queue, broadcast):
    print("started broadcaster")
    loop = asyncio.get_running_loop()
    while True:
        response = await loop.run_in_executor(None, res_queue.get)
        await broadcast.publish(channel="response", message=response)


async def fusion_kit_manager_watchdog(fusion_kit_manager):
    print("started watchdog")
    was_active = False
    while True:
        is_active = fusion_kit_manager.process is not None and fusion_kit_manager.process.is_alive()

        # Check if process switched from active to inactive
        if was_active and not is_active:
            print("watchdog failed")
            await fusion_kit_manager.broadcast.publish(
                channel="response",
                message={
                    'id': None,
                    'watchdog': 'process_died'
                }
            )

        was_active = is_active
        await asyncio.sleep(5)
