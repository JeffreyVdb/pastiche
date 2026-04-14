import uuid
from datetime import UTC, datetime

import sqlalchemy as sa
from pydantic import field_validator
from sqlmodel import Column, Field, SQLModel


HEX_COLOR_RE = r"^#[0-9a-fA-F]{6}$"


class Label(SQLModel, table=True):
    __tablename__ = "labels"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        sa_column_kwargs={"server_default": "gen_random_uuid()"},
    )
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(max_length=50)
    color: str = Field(max_length=7)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        sa_column=Column(sa.TIMESTAMP(timezone=True), nullable=False),
    )


class LabelCreate(SQLModel):
    name: str = Field(min_length=1, max_length=50)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Label name cannot be empty")
        return trimmed


class LabelUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    color: str | None = Field(default=None)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Label name cannot be empty")
        return trimmed

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if len(value) != 7 or not value.startswith("#"):
            raise ValueError("Color must be a hex code")
        int(value[1:], 16)
        return value.lower()


class LabelRead(SQLModel):
    id: uuid.UUID
    name: str
    color: str
