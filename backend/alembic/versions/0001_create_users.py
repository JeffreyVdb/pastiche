"""create users table

Revision ID: 0001
Revises:
Create Date: 2026-03-17 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("github_id", sa.BigInteger(), nullable=False),
        sa.Column("username", sqlmodel.AutoString(length=255), nullable=False),
        sa.Column("display_name", sqlmodel.AutoString(length=255), nullable=True),
        sa.Column("avatar_url", sqlmodel.AutoString(), nullable=True),
        sa.Column("email", sqlmodel.AutoString(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("github_id"),
    )
    op.create_index(op.f("ix_users_github_id"), "users", ["github_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_github_id"), table_name="users")
    op.drop_table("users")
