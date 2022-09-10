import base64
from io import BytesIO
import sys
sys.path.append('./stable_diffusion')

import os
import asyncio
from ariadne import gql, ObjectType, SubscriptionType, make_executable_schema
from ariadne.asgi import GraphQL
from ariadne.asgi.handlers import GraphQLTransportWSHandler
from starlette.applications import Starlette
from starlette.routing import Route, WebSocketRoute
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import uvicorn
import tasks

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

@mutation.field("dream")
def resolve_dream(*_, prompt):
    images = tasks.txt2img()
    image_data = []
    for image in images:
        data = BytesIO()
        image.save(data, format="png")
        b64_data = str(base64.b64encode(data.getvalue()), "utf-8")
        b64_uri = f"data:image/png;base64,{b64_data}"
        image_data.append(b64_uri)
    return image_data

subscription = SubscriptionType()

@subscription.source("counter")
async def counter_generator(obj, info):
    for i in range(5):
        await asyncio.sleep(1)
        yield i

@subscription.field("counter")
def counter_resolver(count, info):
    return count + 1

schema = make_executable_schema(type_defs, query, mutation, subscription)

graphql_app = GraphQL(schema, debug=True, websocket_handler=GraphQLTransportWSHandler())

routes = [
    Route("/graphql", graphql_app, methods=["GET", "POST"]),
    WebSocketRoute("/graphql", endpoint=graphql_app),
]

middleware = [
    Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["POST"])
]

app = Starlette(debug=True, routes=routes, middleware=middleware)

if __name__ == "__main__":
    uvicorn.run(app, host='0.0.0.0', port=2425)
