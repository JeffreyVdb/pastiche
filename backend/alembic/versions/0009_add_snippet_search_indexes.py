"""add snippet search indexes

Revision ID: 0009
Revises: 0008
Create Date: 2026-03-30

"""

from typing import Sequence, Union

from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        """
        CREATE INDEX ix_snippets_title_search_trgm
        ON snippets
        USING gin (lower(title) gin_trgm_ops)
        """
    )
    op.execute(
        """
        CREATE INDEX ix_snippets_content_search_trgm
        ON snippets
        USING gin (lower(content) gin_trgm_ops)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_snippets_content_search_trgm")
    op.execute("DROP INDEX IF EXISTS ix_snippets_title_search_trgm")
