import uuid
from datetime import UTC, datetime
from enum import StrEnum
from typing import Literal

import sqlalchemy as sa
from sqlmodel import Column, Field, SQLModel


class Snippet(SQLModel, table=True):
    __tablename__ = "snippets"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        sa_column_kwargs={"server_default": "gen_random_uuid()"},
    )
    user_id: uuid.UUID = Field(
        foreign_key="users.id",
        index=True,
        nullable=False,
    )
    title: str = Field(max_length=255)
    language: str = Field(default="autodetect", max_length=100)
    content: str = Field(sa_column=Column(sa.Text, nullable=False))
    short_code: str = Field(max_length=12, sa_column_kwargs={"unique": True})
    is_pinned: bool = Field(default=False)
    color: str | None = Field(default=None, max_length=20)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))


class SnippetSortField(StrEnum):
    created_at = "created_at"
    updated_at = "updated_at"


class SnippetCreate(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    language: str = Field(default="autodetect", max_length=100)
    content: str = Field(min_length=1)


class SnippetUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    language: str | None = Field(default=None, max_length=100)
    content: str | None = Field(default=None, min_length=1)
    color: Literal["red", "orange", "green", "blue", "purple", "none"] | None = Field(default=None)


class SnippetListRead(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    language: str
    content_size: int
    short_code: str
    is_pinned: bool
    color: str | None
    created_at: datetime
    updated_at: datetime


class SnippetRead(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    language: str
    content: str
    short_code: str
    is_pinned: bool
    color: str | None
    created_at: datetime
    updated_at: datetime
