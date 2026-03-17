import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.user import User


async def get_user_by_id(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_or_create_user(
    session: AsyncSession,
    github_id: int,
    username: str,
    display_name: str | None = None,
    avatar_url: str | None = None,
    email: str | None = None,
) -> User:
    result = await session.execute(select(User).where(User.github_id == github_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            github_id=github_id,
            username=username,
            display_name=display_name,
            avatar_url=avatar_url,
            email=email,
        )
        session.add(user)
    else:
        user.username = username
        user.display_name = display_name
        user.avatar_url = avatar_url
        user.email = email
        user.updated_at = datetime.now(UTC).replace(tzinfo=None)
        session.add(user)

    await session.commit()
    await session.refresh(user)
    return user
