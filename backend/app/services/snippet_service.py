import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.snippet import Snippet


async def create_snippet(
    session: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    language: str,
    content: str,
) -> Snippet:
    snippet = Snippet(user_id=user_id, title=title, language=language, content=content)
    session.add(snippet)
    await session.commit()
    await session.refresh(snippet)
    return snippet


async def list_snippets_by_user(session: AsyncSession, user_id: uuid.UUID) -> list[Snippet]:
    result = await session.execute(
        select(Snippet).where(Snippet.user_id == user_id).order_by(Snippet.created_at.desc())
    )
    return list(result.scalars().all())


async def get_snippet_by_id(session: AsyncSession, snippet_id: uuid.UUID) -> Snippet | None:
    result = await session.execute(select(Snippet).where(Snippet.id == snippet_id))
    return result.scalar_one_or_none()


async def delete_snippet(session: AsyncSession, snippet: Snippet) -> None:
    await session.delete(snippet)
    await session.commit()
