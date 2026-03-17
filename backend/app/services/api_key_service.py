import hashlib
import secrets
import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.api_key import ApiKey


def _generate_key() -> tuple[str, str, str]:
    """Returns (plaintext_key, key_hash, prefix)."""
    random_part = secrets.token_urlsafe(32)
    plaintext = f"past_{random_part}"
    key_hash = hashlib.sha256(plaintext.encode()).hexdigest()
    prefix = f"past_{random_part[:8]}"
    return plaintext, key_hash, prefix


async def create_api_key(
    session: AsyncSession,
    user_id: uuid.UUID,
    name: str,
) -> tuple[ApiKey, str]:
    plaintext, key_hash, prefix = _generate_key()
    api_key = ApiKey(user_id=user_id, name=name, key_hash=key_hash, prefix=prefix)
    session.add(api_key)
    await session.commit()
    await session.refresh(api_key)
    return api_key, plaintext


async def list_api_keys_by_user(session: AsyncSession, user_id: uuid.UUID) -> list[ApiKey]:
    result = await session.execute(
        select(ApiKey).where(ApiKey.user_id == user_id).order_by(ApiKey.created_at.desc())
    )
    return list(result.scalars().all())


async def get_api_key_by_id(session: AsyncSession, key_id: uuid.UUID) -> ApiKey | None:
    result = await session.execute(select(ApiKey).where(ApiKey.id == key_id))
    return result.scalar_one_or_none()


async def get_api_key_by_hash(session: AsyncSession, key_hash: str) -> ApiKey | None:
    result = await session.execute(select(ApiKey).where(ApiKey.key_hash == key_hash))
    return result.scalar_one_or_none()


async def delete_api_key(session: AsyncSession, api_key: ApiKey) -> None:
    await session.delete(api_key)
    await session.commit()


async def increment_request_count(session: AsyncSession, api_key: ApiKey) -> None:
    api_key.request_count += 1
    api_key.last_used_at = datetime.now(UTC).replace(tzinfo=None)
    session.add(api_key)
    await session.commit()
