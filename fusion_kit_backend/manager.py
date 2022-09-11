import asyncio
from broadcaster import Broadcast
import multiprocessing
from PIL import Image
import tasks
from ulid import ULID

async def dream_watcher(dream, broadcast):
    print("starting dream watcher")
    async with broadcast.subscribe(channel='response') as subscriber:
        async for event in subscriber:
            response = event.message
            if response['id'] == dream.id:
                dream.state = {
                    'state': 'DreamComplete',
                    'images': response['images'],
                    'complete': True,
                }
                await broadcast.publish(channel='dream', message=dream)
                return
            elif response.get('watchdog') == 'process_died':
                dream.state = {
                    'state': 'DreamError',
                    'errorMessage': 'Dream process died',
                    'complete': True,
                }
                await broadcast.publish(channel='dream', message=dream)
                raise Exception("Process died while dreaming")

class Dream():
    def __init__(self, id, broadcast):
        self.id = id
        self.state = {
            'state': 'DreamPending',
            'complete': False,
        }

        self.task = asyncio.create_task(dream_watcher(self, broadcast))

class FusionKitManager():
    def __init__(self):
        self.process = None
        self.broadcast = Broadcast("memory://")
        self.dreams = {}
        self.get_processor()

    async def __aenter__(self):
        await self.broadcast.connect()
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self.broadcast.disconnect()

    async def start_dream(self, prompt):
        dream_id = str(ULID())
        processor = self.get_processor()
        processor['req_queue'].put({
            'id': dream_id,
            'request': 'txt2img',
            'prompt': prompt,
        })

        dream = Dream(dream_id, self.broadcast)

        self.dreams[dream_id] = dream

        return dream

    async def watch_dream(self, dream_id):
        dream = self.dreams[dream_id]
        yield dream.state
        if dream.state['complete']:
            return

        async with self.broadcast.subscribe(channel='dream') as subscriber:
            async for event in subscriber:
                event_dream = event.message
                if event_dream.id == dream_id:
                    yield event_dream.state
                    if event_dream.state['complete']:
                        return

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
            images = tasks.txt2img(request['prompt'])
            res_queue.put({
                'id': request['id'],
                'images': images,
            })
        else:
            print(f"Unkown request type: {request['request']}")

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
