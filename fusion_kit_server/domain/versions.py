import aiohttp
from packaging import version

CURRENT_VERSION = version.parse('0.1.0')
LATEST_VERSION_URL = 'https://content.fusionkit.dev/latest-version.json'


async def is_update_available():
    try:
        timeout = aiohttp.ClientTimeout(total=5)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            response = await session.get(LATEST_VERSION_URL)
            response.raise_for_status()

            json = await response.json()
            if 'latestVersion' not in json:
                return False
            latest_version = version.parse(json['latestVersion'])

            return latest_version > CURRENT_VERSION

    except aiohttp.ClientError as e:
        print(f'[WARN] Update check failed: {e}')
        return False
