import asyncio
from broadcaster import Broadcast
import multiprocessing
from .runner import processor_runner

class ProcessorError(Exception):
    pass

class WatchdogFailedError(ProcessorError):
    def __init__(self, request_id):
        super().__init__(f"runner process died while waiting for response")
        self.request_id = request_id\

class Processor():
    def __init__(self, broadcast, settings, data_dir):
        self.settings = settings
        self.data_dir = data_dir
        self.runner_process = None
        self.broadcast = broadcast
        self.active_requests = set()
        self.run()

    def is_running(self):
        return self.runner_process is not None and self.runner_process.is_alive()

    def run(self):
        if not self.is_running():
            self.req_queue = multiprocessing.Queue()
            self.res_queue = multiprocessing.Queue()
            self.runner_process = multiprocessing.Process(
                target=processor_runner,
                kwargs={
                    'settings': self.settings,
                    'data_dir': self.data_dir,
                    'req_queue': self.req_queue,
                    'res_queue': self.res_queue,
                }
            )
            self.runner_process.start()

            self.broadcast_task = asyncio.create_task(runner_broadcaster(self))
            self.watchdog_task = asyncio.create_task(runner_watchdog(self))

    async def send_request_and_watch(self, request_id, request, body):
        self.active_requests.add(request_id)
        self.run()

        async with self.broadcast.subscribe(channel='response') as subscriber:
            self.req_queue.put({
                'request_id': request_id,
                'request': request,
                'body': body,
            })

            async for event in subscriber:
                response = event.message
                if response.get('request_id') == request_id:
                    yield response.get('body')
                    if response.get('stopped', False):
                         return

    async def update_settings(self, settings):
        self.settings = settings
        await self.restart()

    async def restart(self):
        self.run()

        self.req_queue.put({
            'request_id': None,
            'request': 'stop',
            'body': {},
        })

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self.runner_process.join)

        self.run()

async def runner_broadcaster(processor):
    loop = asyncio.get_running_loop()
    while True:
        response = await loop.run_in_executor(None, processor.res_queue.get)
        await processor.broadcast.publish(channel="response", message=response)

        request_id = response.get("request_id")
        is_stopped = response.get("stopped", False)
        if request_id is not None and is_stopped:
            processor.active_requests.discard(request_id)

async def runner_watchdog(processor):
    print("started watchdog")
    while True:
        if len(processor.active_requests) > 0 and not processor.is_running():
            print("watchdog failed")
            for request_id in processor.active_requests:
                await processor.broadcast.publish(
                    channel="response",
                    message={
                        'request_id': request_id,
                        'stopped': True,
                        'body': {
                            'error': WatchdogFailedError(request_id)
                        },
                    }
                )
            processor.active_requests.clear()

        await asyncio.sleep(5)
