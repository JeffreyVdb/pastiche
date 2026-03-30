import uuid
import re
from datetime import UTC, datetime

from sqlalchemy import and_, asc, case, desc, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.short_code import int_to_base36
from app.models.snippet import Snippet, SnippetSortField

_WHITESPACE_RE = re.compile(r"\s+")


def _normalize_query(value: str) -> str:
    return _WHITESPACE_RE.sub(" ", value.strip()).lower()


def _search_tokens(value: str | None) -> tuple[str, list[str]]:
    if not value:
        return "", []

    normalized = _normalize_query(value)
    tokens = [token for token in normalized.split(" ") if len(token) >= 2]
    return normalized, tokens


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")


async def create_snippet(
    session: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    language: str,
    content: str,
) -> Snippet:
    seq_result = await session.execute(text("SELECT nextval('snippet_short_code_seq')"))
    short_code = int_to_base36(seq_result.scalar_one())
    snippet = Snippet(user_id=user_id, title=title, language=language, content=content, short_code=short_code)
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
    pinned: bool | None = None,
    q: str | None = None,
) -> tuple[list[dict], int]:
    where_clauses = [Snippet.user_id == user_id]
    if pinned is not None:
        where_clauses.append(Snippet.is_pinned == pinned)

    normalized_query, tokens = _search_tokens(q)
    title_lower = func.lower(Snippet.title)
    content_lower = func.lower(Snippet.content)

    if tokens:
        token_filters = []
        for token in tokens:
            pattern = f"%{_escape_like(token)}%"
            token_filters.append(
                or_(
                    title_lower.like(pattern, escape="\\"),
                    content_lower.like(pattern, escape="\\"),
                )
            )
        where_clauses.append(and_(*token_filters))

    total = await session.scalar(
        select(func.count()).select_from(Snippet).where(*where_clauses)
    )

    if tokens:
        escaped_query = _escape_like(normalized_query)
        query_contains_pattern = f"%{escaped_query}%"
        query_prefix_pattern = f"{escaped_query}%"

        rank_exact_title = case((title_lower == normalized_query, 1), else_=0)
        rank_title_prefix = case(
            (title_lower.like(query_prefix_pattern, escape="\\"), 1),
            else_=0,
        )
        rank_title_query = case(
            (title_lower.like(query_contains_pattern, escape="\\"), 1),
            else_=0,
        )
        rank_title_tokens = sum(
            case((title_lower.like(f"%{_escape_like(token)}%", escape="\\"), 1), else_=0)
            for token in tokens
        )
        rank_content_tokens = sum(
            case((content_lower.like(f"%{_escape_like(token)}%", escape="\\"), 1), else_=0)
            for token in tokens
        )
        order_by = [
            desc(rank_exact_title),
            desc(rank_title_prefix),
            desc(rank_title_query),
            desc(rank_title_tokens),
            desc(rank_content_tokens),
            desc(Snippet.is_pinned),
            desc(Snippet.updated_at),
        ]
    else:
        sort_column = getattr(Snippet, sort_by.value)
        order_expr = desc(sort_column) if order == "desc" else asc(sort_column)
        order_by = [order_expr]

    stmt = (
        select(  # type: ignore[call-overload]  # SQLModel multi-column select not typed
            Snippet.id,
            Snippet.user_id,
            Snippet.title,
            Snippet.language,
            func.octet_length(Snippet.content).label("content_size"),
            Snippet.created_at,
            Snippet.updated_at,
            Snippet.short_code,
            Snippet.is_pinned,
            Snippet.is_public,
            Snippet.color,
        )
        .where(*where_clauses)
        .order_by(*order_by)
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
    color: str | None = None,
) -> Snippet:
    if title is not None:
        snippet.title = title
    if language is not None:
        snippet.language = language
    if content is not None:
        snippet.content = content
    if color is not None:
        snippet.color = None if color == "none" else color
    snippet.updated_at = datetime.now(UTC).replace(tzinfo=None)
    session.add(snippet)
    await session.commit()
    await session.refresh(snippet)
    return snippet


async def get_snippet_by_short_code(session: AsyncSession, code: str) -> Snippet | None:
    result = await session.execute(select(Snippet).where(Snippet.short_code == code))
    return result.scalar_one_or_none()


async def toggle_snippet_pin(session: AsyncSession, snippet: Snippet) -> Snippet:
    snippet.is_pinned = not snippet.is_pinned
    snippet.updated_at = datetime.now(UTC).replace(tzinfo=None)
    session.add(snippet)
    await session.commit()
    await session.refresh(snippet)
    return snippet


async def toggle_snippet_visibility(session: AsyncSession, snippet: Snippet) -> Snippet:
    snippet.is_public = not snippet.is_public
    snippet.updated_at = datetime.now(UTC).replace(tzinfo=None)
    session.add(snippet)
    await session.commit()
    await session.refresh(snippet)
    return snippet
