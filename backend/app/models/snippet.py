import uuid
from datetime import UTC, datetime
from enum import StrEnum

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


class SnippetListRead(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    language: str
    content_size: int
    created_at: datetime
    updated_at: datetime


class SnippetRead(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    language: str
    content: str
    created_at: datetime
    updated_at: datetime
