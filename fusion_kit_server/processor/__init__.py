import asyncio
import queue
from time import time
from broadcaster import Broadcast
import multiprocessing
from .runner import processor_runner

class ProcessorError(Exception):
    pass

class WatchdogFailedError(ProcessorError):
    def __init__(self, request_id):
        super().__init__(f"runner process died while waiting for response")
        self.request_id = request_id

class Processor():
    def __init__(self, broadcast, settings, data_dir):
        self.settings = settings
        self.data_dir = data_dir
        self.runner_process = None
        self.broadcast = broadcast
        self.active_requests = set()
        self.run(recreate_queues=True)

        self.broadcast_task = asyncio.create_task(runner_broadcaster(self))
        self.watchdog_task = asyncio.create_task(runner_watchdog(self))

    def is_running(self):
        return self.runner_process is not None and self.runner_process.is_alive()

    def run(self, recreate_queues=True):
        if not self.is_running():
            if recreate_queues:
                self.req_queue = multiprocessing.Queue()
                self.res_queue = multiprocessing.Queue()

                self.req_queue.cancel_join_thread()
                self.res_queue.cancel_join_thread()

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

    def update_settings(self, settings):
        self.settings = settings
        self.restart()

    def restart(self):
        self.run()

        self.req_queue.put({
            'request_id': None,
            'request': 'stop',
            'body': {},
        })

        self.restart_task = asyncio.create_task(finish_restart(self))

async def runner_broadcaster(processor):
    loop = asyncio.get_running_loop()
    while True:
        try:
            response = await loop.run_in_executor(None, processor.res_queue.get, True, 5)
        except queue.Empty:
            response = None

        if response is not None:
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


async def finish_restart(processor):
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, processor.runner_process.join)

    processor.run(recreate_queues=False)
