import asyncio
from broadcaster import Broadcast
import multiprocessing
import tasks
from ulid import ULID

class FusionKitManager():
    def __init__(self):
        self.process = None
        self.broadcast = Broadcast("memory://")
        self.get_processor()

    async def __aenter__(self):
        await self.broadcast.connect()
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self.broadcast.disconnect()

    async def txt2img(self, prompt):
        request_id = ULID()
        processor = self.get_processor()
        processor['req_queue'].put({
            'id': request_id,
            'request': 'txt2img',
            'prompt': prompt,
        })

        async with self.broadcast.subscribe(channel='response') as subscriber:
            async for event in subscriber:
                response = event.message
                if response['id'] == request_id:
                    return response['images']
                elif response.get('watchdog') == 'process_died':
                    raise Exception("Process died")

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
        print("got request")
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
