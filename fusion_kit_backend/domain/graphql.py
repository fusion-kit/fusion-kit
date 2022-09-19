from ariadne import ObjectType, SubscriptionType, make_executable_schema, convert_kwargs_to_snake_case, snake_case_fallback_resolvers
from domain.dream import gql_dream
from domain.dream_image import gql_dream_image

query = ObjectType("Query")

@query.field("hello")
def resolve_hello(*_):
    return "Hello world!"

mutation = ObjectType("Mutation")

@mutation.field("startDream")
@convert_kwargs_to_snake_case
async def resolve_start_dream(_, info, options):
    manager = info.context['manager']

    dream = await manager.start_dream(options)
    return dream

subscription = SubscriptionType()

@subscription.source("watchDream")
@convert_kwargs_to_snake_case
async def watch_dream_generator(obj, info, dream_id):
    manager = info.context['manager']
    async for dream_state in manager.watch_dream(dream_id = dream_id):
        yield dream_state

@subscription.field("watchDream")
@convert_kwargs_to_snake_case
async def watch_dream_resolver(dream_state, info, dream_id):
    return dream_state

def make_schema(type_defs):
    return make_executable_schema(
        type_defs,
        query,
        mutation,
        subscription,
        snake_case_fallback_resolvers,
        gql_dream,
        gql_dream_image
    )

def context_builder(manager):
    def make_context(request):
        return {
            'request': request,
            'manager': manager,
        }
    return make_context
