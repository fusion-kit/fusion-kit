import sys
sys.path.append('./stable_diffusion')

import os
import asyncio
import alembic.config
import alembic.command
from alembic.migration import MigrationContext
from ariadne import gql
from ariadne.asgi import GraphQL
from ariadne.asgi.handlers import GraphQLWSHandler
from starlette.applications import Starlette
from starlette.routing import Route, WebSocketRoute
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import sqlalchemy
import uvicorn
import domain.graphql
from manager import FusionKitManager

project_path = os.path.realpath(os.path.join(os.path.realpath(__file__), "..", ".."))
graphql_schema_path = os.path.join(project_path, "schema.graphql")
alembic_ini_path = os.path.join(project_path, "fusion_kit_backend", "alembic.ini")
alembic_script_path = os.path.join(project_path, "fusion_kit_backend", "alembic")
db_url = "sqlite://"

# Parse and validate GraphQL schema
with open(graphql_schema_path) as file:
    type_defs = gql(file.read())

db_engine = sqlalchemy.create_engine(db_url)

def run_db_migrations(db_conn):
    alembic_cfg = alembic.config.Config(alembic_ini_path)
    alembic_cfg.attributes['connection'] = db_conn
    alembic_cfg.set_main_option("script_location", alembic_script_path)
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    alembic.command.upgrade(alembic_cfg, "head")

async def main():
    async with FusionKitManager(db_engine=db_engine) as manager:
        # Run datababase migrations
        run_db_migrations(manager.db_conn)

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

        config = uvicorn.Config(app, host='0.0.0.0', port=2425)
        server = uvicorn.Server(config)
        await server.serve()

if __name__ == "__main__":
    asyncio.run(main())
