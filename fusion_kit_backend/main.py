import base64
from io import BytesIO
import multiprocessing
from PIL import Image
import sys
sys.path.append('./stable_diffusion')

import os
import asyncio
from ariadne import gql, ObjectType, SubscriptionType, UnionType, make_executable_schema, convert_kwargs_to_snake_case
from ariadne.asgi import GraphQL
from ariadne.asgi.handlers import GraphQLTransportWSHandler
from starlette.applications import Starlette
from starlette.routing import Route, WebSocketRoute
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import uvicorn
from manager import FusionKitManager

project_path = os.path.realpath(os.path.join(os.path.realpath(__file__), "..", ".."))
graphql_schema_path = os.path.join(project_path, "schema.graphql")

# Parse and validate GraphQL schema
with open(graphql_schema_path) as file:
    type_defs = gql(file.read())

query = ObjectType("Query")

@query.field("hello")
def resolve_hello(*_):
    return "Hello world!"

mutation = ObjectType("Mutation")

@mutation.field("startDream")
async def resolve_dream(_, info, prompt):
    manager = info.context['manager']

    dream = await manager.start_dream(prompt)
    return dream.id

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

dream_state_type = UnionType("DreamState")

@dream_state_type.type_resolver
def resolve_dream_state_type(obj, *_):
    return obj['state']

dream_image_type = ObjectType("DreamImage")

@dream_image_type.field("imageUri")
def resolve_image_uri(image, *_):
    data = BytesIO()
    image.save(data, format="png")
    b64_data = str(base64.b64encode(data.getvalue()), "utf-8")
    b64_uri = f"data:image/png;base64,{b64_data}"
    return b64_uri

async def main():
    async with FusionKitManager() as manager:
        context = lambda request: {
            'request': request,
            'manager': manager,
        }

        schema = make_executable_schema(type_defs, query, mutation, subscription, dream_state_type, dream_image_type)

        graphql_app = GraphQL(
            schema,
            debug=True,
            websocket_handler=GraphQLTransportWSHandler(),
            context_value=context,
        )

        routes = [
            Route("/graphql", graphql_app, methods=["GET", "POST"]),
            WebSocketRoute("/graphql", endpoint=graphql_app),
        ]

        middleware = [
            Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["POST"])
        ]

        app = Starlette(debug=True, routes=routes, middleware=middleware)

        config = uvicorn.Config(app, host='0.0.0.0', port=2425)
        server = uvicorn.Server(config)
        await server.serve()

if __name__ == "__main__":
    asyncio.run(main())
