import asyncio
from ariadne import InterfaceType
import base64
from io import BytesIO

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
        self.image = None
        self.num_finished_steps = 0
        self.num_total_steps = num_steps

    def complete(self):
        self.state = 'FinishedDreamImage'
        self.num_finished_steps = self.num_total_steps

    def is_complete(self):
        return self.state == 'FinishedDreamImage'

    ### GraphQL resolvers ###

    def image_uri(self, *_):
        return image_to_data_uri(self.image)

    def preview_image_uri(self, *_):
        return image_to_data_uri(self.image)

def image_to_data_uri(image):
    if image is None:
        return

    data = BytesIO()
    image.save(data, format="png")
    b64_data = str(base64.b64encode(data.getvalue()), "utf-8")
    b64_uri = f"data:image/png;base64,{b64_data}"
    return b64_uri
