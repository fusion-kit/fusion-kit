import os
from cx_Freeze import Executable, setup

project_path = os.path.realpath(os.path.join(os.path.realpath(__file__), "..", ".."))
build_path = os.path.join(project_path, 'build')

os.makedirs(build_path, exist_ok=True)
os.chdir(build_path)

setup(
    name='fusion-kit',
    version='0.1',
    executables=[
        Executable(os.path.join(project_path, 'fusion_kit_server', 'main.py'))
    ],
    options={
        'build_exe': {
            'build_exe': build_path,
            'packages': ['sqlalchemy', 'torch', 'uvicorn']
        }
    },
)
