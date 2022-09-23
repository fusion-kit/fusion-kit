from ariadne import InterfaceType
from copy import copy
import json
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
        self.state = 'PendingDream'
        self.images = []

        for image_index in range(self.num_images):
            dream_image_id = f'di_{ULID()}'
            dream_image = DreamImage(
                id=dream_image_id,
                dream_id=id,
                seed=self.seed + image_index,
                sampler_steps=self.sampler_steps,
            )
            self.images.append(dream_image)

    def is_complete(self):
        return self.state == 'FinishedDream' or self.state == 'StoppedDream'

    def settings_json(self):
        settings_json = copy(self.settings)
        settings_json['options'] = copy(settings_json['options'])
        settings_json['options'].pop('base_image', None)
        settings_json['options'].pop('base_image_mask', None)

        return json.dumps(settings_json)

    @property
    def prompt(self):
        return self.settings['options']['prompt']

    @property
    def seed(self):
        return self.settings['options']['seed']

    @property
    def num_images(self):
        return self.settings['options']['num_images']

    @property
    def sampler_steps(self):
        return self.settings['options']['sampler_steps']

    ### GraphQL resolvers ###

    def num_total_images(self, *_):
        return self.num_images

    def num_total_steps(self, *_):
        return self.num_images * self.sampler_steps

    def num_finished_images(self, *_):
        return sum(1 for image in self.images if image.is_complete())

    def num_finished_steps(self, *_):
        return sum(image.num_finished_steps for image in self.images)
