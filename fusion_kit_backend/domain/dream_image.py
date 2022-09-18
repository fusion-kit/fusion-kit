from ariadne import InterfaceType

gql_dream_image = InterfaceType("DreamImage")

@gql_dream_image.type_resolver
def resolve_dream_image_type(dream_image, *_):
    return dream_image.state

class DreamImage():
    def __init__(self, id, dream_id, num_steps, seed=None):
        self.id = id
        self.seed = seed
        self.dream_id = dream_id
        self.state = 'PendingDreamImage'
        self.image_key = None
        self.num_finished_steps = 0
        self.num_total_steps = num_steps

    def complete(self):
        self.state = 'FinishedDreamImage'
        self.num_finished_steps = self.num_total_steps

    def is_complete(self):
        return self.state == 'FinishedDreamImage'

    ### GraphQL resolvers ###

    def image_path(self, info):
        manager = info.context['manager']
        return manager.get_image_uri(self.image_key)

    def preview_image_path(self, info):
        manager = info.context['manager']
        return manager.get_image_uri(self.image_key)
