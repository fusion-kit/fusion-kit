# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import copy_metadata


block_cipher = None

datas = [
    ('schema.graphql', '.'),
    ('fusion_kit_client/dist', 'fusion_kit_client/dist'),
    ('fusion_kit_server/alembic.ini', 'fusion_kit_server'),
    ('fusion_kit_server/alembic', 'fusion_kit_server/alembic'),
    ('invoke_ai/configs/stable-diffusion/v1-inference.yaml', 'invoke_ai/configs/stable-diffusion'),
    ('src/clip/clip/bpe_simple_vocab_16e6.txt.gz', 'clip')
]
datas += copy_metadata('transformers', recursive=True)

a = Analysis(
    ['fusion_kit_server/main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'ldm.models.diffusion.ddpm',
        'ldm.lr_scheduler',
        'ldm.modules.embedding_manager',
        'ldm.modules.diffusionmodules.openaimodel',
        'ldm.models.autoencoder',
        'ldm.modules.encoders.modules',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='fusion-kit-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='fusion-kit-server',
)
