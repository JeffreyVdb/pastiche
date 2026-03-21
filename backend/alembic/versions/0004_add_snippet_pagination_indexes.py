"""add snippet pagination indexes

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-21

"""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_snippets_user_id_created_at", "snippets", ["user_id", "created_at"])
    op.create_index("ix_snippets_user_id_updated_at", "snippets", ["user_id", "updated_at"])


def downgrade() -> None:
    op.drop_index("ix_snippets_user_id_updated_at", table_name="snippets")
    op.drop_index("ix_snippets_user_id_created_at", table_name="snippets")
