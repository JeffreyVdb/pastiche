"""add snippet short codes

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-22 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def int_to_base36(n: int) -> str:
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        return "0"
    result = []
    while n > 0:
        result.append(chars[n % 36])
        n //= 36
    return "".join(reversed(result))


def upgrade() -> None:
    # Create the sequence for generating short code values
    op.execute("CREATE SEQUENCE snippet_short_code_seq START WITH 1 INCREMENT BY 1")

    # Add short_code column (nullable initially to allow backfill)
    op.add_column("snippets", sa.Column("short_code", sa.String(length=12), nullable=True))

    # Backfill existing snippets ordered by created_at ASC (older = shorter code)
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id FROM snippets ORDER BY created_at ASC")
    ).fetchall()

    if rows:
        # Assign base36 short codes in order of creation
        for i, (snippet_id,) in enumerate(rows, start=1):
            code = int_to_base36(i)
            conn.execute(
                sa.text("UPDATE snippets SET short_code = :code WHERE id = :id"),
                {"code": code, "id": str(snippet_id)},
            )
        # Advance the sequence past the highest value used in backfill
        conn.execute(sa.text(f"SELECT setval('snippet_short_code_seq', {len(rows)}, true)"))

    # Make column NOT NULL now that all rows have a value
    op.alter_column("snippets", "short_code", nullable=False)

    # Create unique index
    op.create_index("ix_snippets_short_code", "snippets", ["short_code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_snippets_short_code", table_name="snippets")
    op.drop_column("snippets", "short_code")
    op.execute("DROP SEQUENCE IF EXISTS snippet_short_code_seq")
