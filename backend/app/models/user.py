import uuid
from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        sa_column_kwargs={"server_default": "gen_random_uuid()"},
    )
    github_id: int = Field(unique=True, index=True, nullable=False)
    username: str = Field(max_length=255)
    display_name: str | None = Field(default=None, max_length=255)
    avatar_url: str | None = Field(default=None)
    email: str | None = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))


class UserRead(SQLModel):
    id: uuid.UUID
    github_id: int
    username: str
    display_name: str | None
    avatar_url: str | None
    email: str | None
    created_at: datetime
    updated_at: datetime
