"""initial schema

Revision ID: d1eefba574a1
Revises:
Create Date: 2022-09-14 06:29:55.339337

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd1eefba574a1'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'dreams',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('prompt', sa.String, nullable=False),
        sa.Column('seed', sa.Integer, nullable=False),
        sa.Column('num_images', sa.Integer, nullable=False),
        sa.Column('settings_json', sa.String, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.current_timestamp()),
    )

    op.create_table(
        'dream_images',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('dream_id', sa.String, sa.ForeignKey('dreams.id'), nullable=False),
        sa.Column('seed', sa.Integer, nullable=False),
    )

    op.create_table(
        'settings',
        sa.Column('key', sa.String, primary_key=True),
        sa.Column('settings_json', sa.String, nullable=False),
    )


def downgrade() -> None:
    op.drop_table('settings')
    op.drop_table('dream_images')
    op.drop_table('dreams')
