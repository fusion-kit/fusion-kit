import sys
sys.path.append('./stable_diffusion')

from ariadne import gql, ObjectType, make_executable_schema
from ariadne.asgi import GraphQL
from starlette.applications import Starlette
import uvicorn
import tasks

type_defs = gql("""
    type Query {
        hello: String!
    }

    type Mutation {
        text_to_image(prompt: String!): String!
    }
""")

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

app = Starlette(debug=True)
app.mount("/graphql", GraphQL(schema, debug=True))

if __name__ == "__main__":
    uvicorn.run(app, host='0.0.0.0', port=2425)
