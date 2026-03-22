import uuid
from datetime import UTC, datetime

from sqlalchemy import asc, desc, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.short_code import int_to_base36
from app.models.snippet import Snippet, SnippetSortField


async def create_snippet(
    session: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    language: str,
    content: str,
) -> Snippet:
    snippet = Snippet(user_id=user_id, title=title, language=language, content=content)
    seq_result = await session.execute(text("SELECT nextval('snippet_short_code_seq')"))
    snippet.short_code = int_to_base36(seq_result.scalar_one())
    session.add(snippet)
    await session.commit()
    await session.refresh(snippet)
    return snippet


async def list_snippets_by_user(
    session: AsyncSession,
    user_id: uuid.UUID,
    sort_by: SnippetSortField = SnippetSortField.created_at,
    order: str = "desc",
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    total = await session.scalar(
        select(func.count()).select_from(Snippet).where(Snippet.user_id == user_id)
    )
    sort_column = getattr(Snippet, sort_by.value)
    order_expr = desc(sort_column) if order == "desc" else asc(sort_column)
    stmt = (
        select(
            Snippet.id,
            Snippet.user_id,
            Snippet.title,
            Snippet.language,
            func.octet_length(Snippet.content).label("content_size"),
            Snippet.created_at,
            Snippet.updated_at,
            Snippet.short_code,
        )
        .where(Snippet.user_id == user_id)
        .order_by(order_expr)
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    return [row._asdict() for row in result.all()], total or 0


async def get_snippet_by_id(session: AsyncSession, snippet_id: uuid.UUID) -> Snippet | None:
    result = await session.execute(select(Snippet).where(Snippet.id == snippet_id))
    return result.scalar_one_or_none()


async def delete_snippet(session: AsyncSession, snippet: Snippet) -> None:
    await session.delete(snippet)
    await session.commit()


async def update_snippet(
    session: AsyncSession,
    snippet: Snippet,
    title: str | None = None,
    language: str | None = None,
    content: str | None = None,
) -> Snippet:
    if title is not None:
        snippet.title = title
    if language is not None:
        snippet.language = language
    if content is not None:
        snippet.content = content
    snippet.updated_at = datetime.now(UTC).replace(tzinfo=None)
    session.add(snippet)
    await session.commit()
    await session.refresh(snippet)
    return snippet


async def get_snippet_by_short_code(session: AsyncSession, code: str) -> Snippet | None:
    result = await session.execute(select(Snippet).where(Snippet.short_code == code))
    return result.scalar_one_or_none()
