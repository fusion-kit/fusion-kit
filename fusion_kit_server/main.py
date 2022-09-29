import argparse
from io import BytesIO
import os
import sys
import multiprocessing
import shutil
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
from starlette.routing import Route, WebSocketRoute, Mount
from starlette.staticfiles import StaticFiles
import uvicorn
import domain.graphql
from manager import FusionKitManager

if getattr(sys, 'frozen', False):
    # Fix multiprocessing infinite loop
    multiprocessing.freeze_support()

    project_path = os.path.realpath(os.path.join(os.path.realpath(__file__), '..'))
else:
    project_path = os.path.realpath(os.path.join(os.path.realpath(__file__), '..', '..'))

graphql_schema_path = os.path.join(project_path, "schema.graphql")
alembic_ini_path = os.path.join(project_path, "fusion_kit_server", "alembic.ini")
alembic_script_path = os.path.join(project_path, "fusion_kit_server", "alembic")
default_model_config = os.path.join(project_path, "invoke_ai", "configs", "stable-diffusion", "v1-inference.yaml")
frontend_dir = os.path.join(project_path, "fusion_kit_client", "dist")

data_dir = appdirs.user_data_dir("fusion-kit")
images_dir = os.path.join(data_dir, "images")
models_dir = os.path.join(data_dir, "models")
configs_dir = os.path.join(data_dir, "configs")
db_path = os.path.join(data_dir, "fusion-kit.db")

os.makedirs(data_dir, exist_ok=True)
os.makedirs(images_dir, exist_ok=True)
os.makedirs(models_dir, exist_ok=True)
os.makedirs(configs_dir, exist_ok=True)

default_config_path = os.path.join(configs_dir, 'v1-inference.yaml')
if not os.path.isfile(default_config_path):
    print(f'Copying default config to {default_config_path}')
    shutil.copyfile(default_model_config, default_config_path)

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

parser = argparse.ArgumentParser(description='FusionKit server')
parser.add_argument('-p', '--port', default=2424, help='server port')
parser.add_argument('-a', '--address', default='127.0.0.1', help='server address')
parser.add_argument('--cors', default='*', help='comma-separated list of origins to allow for API access')

async def main():
    args = parser.parse_args()

    # Spawn is required when CUDA is initialized in the parent process
    multiprocessing.set_start_method('spawn')

    async with FusionKitManager(db_config=db_config, data_dir=data_dir) as manager:
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

        if os.path.isfile(os.path.join(frontend_dir, 'index.html')):
            routes.append(Mount("/", app=StaticFiles(directory=frontend_dir, html=True), name='static'))
        else:
            print('Not serving static files (static files not found)')

        middleware = [
            Middleware(CORSMiddleware, allow_origins=args.cors.split(','), allow_methods=["POST"])
        ]

        app = Starlette(debug=True, routes=routes, middleware=middleware)
        app.state.manager = manager

        logging.getLogger("uvicorn").propagate = False

        config = uvicorn.Config(app, host=args.address, port=args.port)
        server = uvicorn.Server(config)
        await server.serve()

if __name__ == "__main__":
    asyncio.run(main())
