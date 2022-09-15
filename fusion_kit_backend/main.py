import sys
sys.path.append('./stable_diffusion')

import os
import asyncio
import appdirs
from ariadne import gql
from ariadne.asgi import GraphQL
from ariadne.asgi.handlers import GraphQLWSHandler
import db
import logging
from starlette.applications import Starlette
from starlette.routing import Route, WebSocketRoute
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import uvicorn
import domain.graphql
from manager import FusionKitManager

project_path = os.path.realpath(os.path.join(os.path.realpath(__file__), "..", ".."))
graphql_schema_path = os.path.join(project_path, "schema.graphql")
alembic_ini_path = os.path.join(project_path, "fusion_kit_backend", "alembic.ini")
alembic_script_path = os.path.join(project_path, "fusion_kit_backend", "alembic")
data_dir = appdirs.user_data_dir("fusion-kit")
images_dir = os.path.join(data_dir, "images")
db_path = os.path.join(data_dir, "fusion-kit.db")

os.makedirs(data_dir, exist_ok=True)
os.makedirs(images_dir, exist_ok=True)

# Parse and validate GraphQL schema
with open(graphql_schema_path) as file:
    type_defs = gql(file.read())

db_config = db.DbConfig(
    alembic_ini_path=alembic_ini_path,
    alembic_script_path=alembic_script_path,
    db_path=db_path
)

async def main():
    async with FusionKitManager(db_config=db_config, images_dir=images_dir) as manager:
        # Run datababase migrations
        db.run_db_migrations(db_config=db_config, db_conn=manager.db_conn)

        context_builder = domain.graphql.context_builder(manager)

        schema = domain.graphql.make_schema(type_defs)

        # TODO: Switch to `GraphQLTransportWSHandler` after this bug is resolved:
        # https://github.com/mirumee/ariadne/issues/927
        graphql_app = GraphQL(
            schema,
            debug=True,
            websocket_handler=GraphQLWSHandler(),
            context_value=context_builder,
        )

        routes = [
            Route("/graphql", graphql_app, methods=["GET", "POST"]),
            WebSocketRoute("/graphql", endpoint=graphql_app),
        ]

        middleware = [
            Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["POST"])
        ]

        app = Starlette(debug=True, routes=routes, middleware=middleware)

        logging.getLogger("uvicorn").propagate = False

        config = uvicorn.Config(app, host='0.0.0.0', port=2425)
        server = uvicorn.Server(config)
        await server.serve()

if __name__ == "__main__":
    asyncio.run(main())
