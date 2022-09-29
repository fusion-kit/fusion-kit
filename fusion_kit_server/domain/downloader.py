import hashlib
import os
import aiofiles
import aiohttp
from ariadne import UnionType

gql_model_download = UnionType("ModelDownload")

@gql_model_download.type_resolver
def resolve_model_download_type(obj, *_):
    return obj['status']

MODELS = {
    '01GE3DCJF6388V175BF3A08R3W': {
        # Licensed under the CreativeML Open RAIL-M license. See the file
        # `licenses/stable-diffusion-license.txt` for details.
        'name': 'Stable Diffusion v1.4',
        'weights_url': 'https://content.fusionkit.dev/models/sd-v1-4.ckpt',
        'weights_sha256': 'fe4efff1e174c627256e44ec2991ba279b3816e364b49f9be2abc0b3ff3f8556',
        'weights_filename': 'sd-v1-4.ckpt',
        'config_filename': 'v1-inference.yaml', # TODO: Don't hardcode
        'width': 512,
        'height': 512,
    },
}

async def download_model(id, data_dir):
    model = MODELS[id]

    weights_filename = os.path.join(data_dir, 'models', model['weights_filename'])
    weights_dl_filename = weights_filename + '.download'

    if os.path.exists(weights_filename):
        actual_weights_hash = hashlib.sha256()
        async with aiofiles.open(weights_filename, 'rb') as weights_file:
            while True:
                data = await weights_file.read(1024 * 1024)
                if not data:
                    break
                actual_weights_hash.update(data)

        print(f"got hash: {actual_weights_hash.hexdigest()}")
        if actual_weights_hash.hexdigest().lower() == model['weights_sha256'].lower():
            yield {
                'status': 'complete',
                'model': model,
            }
            return
        else:
            raise Exception(f'Could not download model: file {weights_filename} already exists but the hash does not match')

    async with aiohttp.ClientSession() as session:
        dl_timeout = aiohttp.ClientTimeout(total=None, connect=60, sock_connect=60, sock_read=60)
        response = await session.get(model['weights_url'], timeout=dl_timeout)
        async with response:
            if not response.ok:
                raise Exception(f'Model download responded with a status of {response.status} and is not currently available. Try updating FusionKit or try again later.')

            total_bytes = response.headers.get('content-length', None)
            downloaded_bytes = 0

            yield {
                'status': 'downloading',
                'total_bytes': total_bytes,
                'downloaded_bytes': downloaded_bytes
            }

            content = response.content

            async with aiofiles.open(weights_dl_filename, 'wb') as dl_file:
                while True:
                    data = await content.read(1024 * 1024)
                    if not data:
                        break
                    await dl_file.write(data)

                    downloaded_bytes += len(data)
                    yield {
                        'status': 'downloading',
                        'total_bytes': total_bytes,
                        'downloaded_bytes': downloaded_bytes
                    }

    os.rename(weights_dl_filename, weights_filename)
    yield {
        'status': 'complete',
        'model': model,
    }
    return

