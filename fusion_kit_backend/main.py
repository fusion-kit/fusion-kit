from io import BytesIO
import sys
sys.path.append('./stable_diffusion')

import os
import asyncio
import appdirs
from ariadne import gql
from ariadne.asgi import GraphQL
from ariadne.asgi.handlers import GraphQLTransportWSHandler
import db
import logging
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from starlette.routing import Route, WebSocketRoute
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

def get_image(request):
    manager = request.app.state.manager
    image = manager.get_image_by_path(f"/images/{request.path_params['image_path']}")

    data = BytesIO()
    image.save(data, format='png')
    data.seek(0)
    return StreamingResponse(data, media_type='image/png')

async def main():
    async with FusionKitManager(db_config=db_config, images_dir=images_dir) as manager:
        # Run datababase migrations
        db.run_db_migrations(db_config=db_config, db_conn=manager.db_conn)

        context_builder = domain.graphql.context_builder(manager)

        schema = domain.graphql.make_schema(type_defs)

        graphql_app = GraphQL(
            schema,
            debug=True,
            websocket_handler=GraphQLTransportWSHandler(),
            context_value=context_builder,
        )

        routes = [
            Route("/graphql", graphql_app, methods=["GET", "POST"]),
            WebSocketRoute("/graphql", endpoint=graphql_app),
            Route("/images/{image_path:path}", get_image, methods=["GET"]),
        ]

        middleware = [
            Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["POST"])
        ]

        app = Starlette(debug=True, routes=routes, middleware=middleware)
        app.state.manager = manager

        logging.getLogger("uvicorn").propagate = False

        config = uvicorn.Config(app, host='0.0.0.0', port=2425)
        server = uvicorn.Server(config)
        await server.serve()

if __name__ == "__main__":
    asyncio.run(main())
