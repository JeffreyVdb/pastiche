"""add snippet is_pinned

Revision ID: 0006
Revises: 0005
Create Date: 2026-03-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("snippets", sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_index("ix_snippets_user_id_is_pinned_created_at", "snippets", ["user_id", "is_pinned", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_snippets_user_id_is_pinned_created_at", table_name="snippets")
    op.drop_column("snippets", "is_pinned")
