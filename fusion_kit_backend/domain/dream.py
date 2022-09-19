import asyncio
from ariadne import InterfaceType
from ulid import ULID
from domain.dream_image import DreamImage

gql_dream = InterfaceType("Dream")

@gql_dream.type_resolver
def resolve_dream_type(dream, *_):
    return dream.state

class Dream():
    def __init__(self, id, settings):
        self.id = id
        self.settings = settings
        self.seed = None
        self.state = 'PendingDream'
        self.images = []

        for _ in range(self.num_images):
            dream_image_id = str(ULID())
            dream_image = DreamImage(
                id=dream_image_id,
                dream_id=id,
                num_steps=self.num_steps_per_image,
            )
            self.images.append(dream_image)

    def is_complete(self):
        return self.state == 'FinishedDream' or self.state == 'StoppedDream'

    @property
    def prompt(self):
        return self.settings['options']['prompt']

    @property
    def num_images(self):
        return self.settings['options']['num_images']

    @property
    def num_steps_per_image(self):
        return self.settings['num_steps_per_image']

    ### GraphQL resolvers ###

    def num_total_images(self, *_):
        return self.num_images

    def num_total_steps(self, *_):
        return self.num_images * self.num_steps_per_image

    def num_finished_images(self, *_):
        return sum(1 for image in self.images if image.is_complete())

    def num_finished_steps(self, *_):
        return sum(image.num_finished_steps for image in self.images)
