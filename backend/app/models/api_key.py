import uuid
from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class ApiKey(SQLModel, table=True):
    __tablename__ = "api_keys"

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
    name: str = Field(max_length=100)
    key_hash: str = Field(max_length=64, unique=True)
    prefix: str = Field(max_length=13)
    request_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
    last_used_at: datetime | None = Field(default=None)


class ApiKeyCreate(SQLModel):
    name: str = Field(min_length=1, max_length=100)


class ApiKeyRead(SQLModel):
    id: uuid.UUID
    name: str
    prefix: str
    request_count: int
    created_at: datetime
    last_used_at: datetime | None


class ApiKeyCreated(ApiKeyRead):
    key: str
