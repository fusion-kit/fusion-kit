import sys
sys.path.append('./stable_diffusion')

import os
from ariadne import gql, ObjectType, make_executable_schema
from ariadne.asgi import GraphQL
from starlette.applications import Starlette
from starlette.routing import Route
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

@mutation.field("text_to_image")
def resolve_text_to_image(*_, prompt):
    tasks.txt2img()
    return "Generation complete"

schema = make_executable_schema(type_defs, query, mutation)

routes = [
    Route("/graphql", GraphQL(schema, debug=True), methods=["GET", "POST"])
]

middleware = [
    Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["POST"])
]

app = Starlette(debug=True, routes=routes, middleware=middleware)

if __name__ == "__main__":
    uvicorn.run(app, host='0.0.0.0', port=2425)
