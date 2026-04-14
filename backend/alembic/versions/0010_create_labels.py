"""create labels tables

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-14 21:55:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "labels",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("name", sqlmodel.AutoString(length=50), nullable=False),
        sa.Column("color", sqlmodel.AutoString(length=7), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_labels_user_id"), "labels", ["user_id"], unique=False)
    op.execute(
        "CREATE UNIQUE INDEX uq_labels_user_id_lower_name ON labels (user_id, lower(name))"
    )

    op.create_table(
        "snippet_labels",
        sa.Column("snippet_id", sa.UUID(), nullable=False),
        sa.Column("label_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["snippet_id"], ["snippets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["label_id"], ["labels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("snippet_id", "label_id"),
    )


def downgrade() -> None:
    op.drop_table("snippet_labels")
    op.execute("DROP INDEX IF EXISTS uq_labels_user_id_lower_name")
    op.drop_index(op.f("ix_labels_user_id"), table_name="labels")
    op.drop_table("labels")
