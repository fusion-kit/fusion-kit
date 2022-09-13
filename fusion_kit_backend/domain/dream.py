import asyncio
from ariadne import InterfaceType
from ulid import ULID
from domain.dream_image import DreamImage

gql_dream = InterfaceType("Dream")

@gql_dream.type_resolver
def resolve_dream_type(dream, *_):
    return dream.state

async def dream_watcher(dream, broadcast):
    print("starting dream watcher")
    async with broadcast.subscribe(channel='response') as subscriber:
        async for event in subscriber:
            response = event.message
            if response['id'] == dream.id:
                if response['state'] == 'running':
                    dream.state = 'RunningDream'
                    for i, image in enumerate(response['preview_images']):
                        dream.images[i].state = 'RunningDreamImage'
                        dream.images[i].image = image
                    await broadcast.publish(channel='dream', message=dream)
                elif response['state'] == 'complete':
                    dream.state = 'FinishedDream'
                    for i, image in enumerate(response['images']):
                        dream.images[i].state = 'FinishedDreamImage'
                        dream.images[i].image = image
                    await broadcast.publish(channel='dream', message=dream)
                    return
                else:
                    raise Exception(f"Unknown dream response state: {response['state']}")
            elif response.get('watchdog') == 'process_died':
                print("Got 'process died' message while waiting for dream")
                dream.state = 'StoppedDream'
                dream.reason = "DREAM_ERROR"
                dream.message = 'Error: dream process died'
                for image in dream.images:
                    image.state = 'StoppedDreamImage'
                await broadcast.publish(channel='dream', message=dream)
                return

class Dream():
    def __init__(self, id, broadcast, num_images, num_steps_per_image):
        self.id = id
        self.images = []
        self.state = 'PendingDream'
        self.num_total_images = num_images
        self.num_total_steps = num_images * num_steps_per_image

        for _ in range(num_images):
            dream_image_id = str(ULID())
            dream_image = DreamImage(
                id=dream_image_id,
                dream_id=id,
                num_steps=num_steps_per_image,
            )
            self.images.append(dream_image)

        self.task = asyncio.create_task(dream_watcher(self, broadcast))

    def is_complete(self):
        return self.state == 'FinishedDream' or self.state == 'StoppedDream'

    ### GraphQL resolvers ###

    def num_finished_images(self, *_):
        return sum(1 for image in self.images if image.is_complete())

    def num_finished_steps(self, *_):
        return sum(image.num_finished_steps for image in self.images)
