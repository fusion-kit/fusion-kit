from ariadne import ObjectType, SubscriptionType, make_executable_schema, convert_kwargs_to_snake_case, snake_case_fallback_resolvers, upload_scalar
from domain.dream import gql_dream
from domain.dream_image import gql_dream_image

query = ObjectType("Query")

@query.field("settings")
def resolve_settings(_, info):
    manager = info.context['manager']

    return manager.settings

mutation = ObjectType("Mutation")

@mutation.field("startDream")
@convert_kwargs_to_snake_case
async def resolve_start_dream(_, info, options):
    manager = info.context['manager']

    dream = await manager.start_dream(options)
    return dream

@mutation.field("updateSettings")
@convert_kwargs_to_snake_case
async def resolve_update_settings(_, info, new_settings):
    manager = info.context['manager']

    manager.update_settings(new_settings)
    return manager.settings

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
        upload_scalar,
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
