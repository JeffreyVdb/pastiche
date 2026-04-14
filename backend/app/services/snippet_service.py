import re
import uuid
from datetime import UTC, datetime

from sqlalchemy import and_, asc, case, desc, exists, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.short_code import int_to_base36
from app.models.label import Label
from app.models.snippet import Snippet, SnippetRead, SnippetSortField
from app.models.snippet_label import SnippetLabel
from app.services.label_service import get_snippet_labels

_WHITESPACE_RE = re.compile(r"\s+")
_LABEL_TOKEN_RE = re.compile(r"^(?P<prefix>!?-|!|-)#(?P<name>.+)$")


def _normalize_query(value: str) -> str:
    return _WHITESPACE_RE.sub(" ", value.strip()).lower()


def _search_tokens(value: str | None) -> tuple[str, list[str]]:
    if not value:
        return "", []

    normalized = _normalize_query(value)
    tokens: list[str] = []
    for token in normalized.split(" "):
        if not token:
            continue
        if _LABEL_TOKEN_RE.match(token):
            continue
        if len(token) >= 2:
            tokens.append(token)
    return normalized, tokens


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")


async def _serialize_snippet_row(session: AsyncSession, row: dict) -> dict:
    payload = dict(row)
    payload["labels"] = [label.model_dump(mode="json") for label in await get_snippet_labels(session, payload["id"])]
    return payload


async def _serialize_snippet(session: AsyncSession, snippet: Snippet) -> SnippetRead:
    return SnippetRead(
        id=snippet.id,
        user_id=snippet.user_id,
        title=snippet.title,
        language=snippet.language,
        content=snippet.content,
        short_code=snippet.short_code,
        is_pinned=snippet.is_pinned,
        is_public=snippet.is_public,
        color=snippet.color,
        labels=await get_snippet_labels(session, snippet.id),
        created_at=snippet.created_at,
        updated_at=snippet.updated_at,
    )


async def create_snippet(
    session: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    language: str,
    content: str,
) -> SnippetRead:
    seq_result = await session.execute(text("SELECT nextval('snippet_short_code_seq')"))
    short_code = int_to_base36(seq_result.scalar_one())
    snippet = Snippet(user_id=user_id, title=title, language=language, content=content, short_code=short_code)
    session.add(snippet)
    await session.commit()
    await session.refresh(snippet)
    return await _serialize_snippet(session, snippet)


async def list_snippets_by_user(
    session: AsyncSession,
    user_id: uuid.UUID,
    sort_by: SnippetSortField = SnippetSortField.created_at,
    order: str = "desc",
    limit: int = 50,
    offset: int = 0,
    pinned: bool | None = None,
    q: str | None = None,
    labels: list[str] | None = None,
    exclude_labels: list[str] | None = None,
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

    for label_name in labels or []:
        normalized_label = label_name.strip().lower()
        if not normalized_label:
            continue
        where_clauses.append(
            exists(
                select(SnippetLabel.snippet_id)
                .join(Label, Label.id == SnippetLabel.label_id)
                .where(
                    SnippetLabel.snippet_id == Snippet.id,
                    Label.user_id == user_id,
                    func.lower(Label.name) == normalized_label,
                )
            )
        )

    for label_name in exclude_labels or []:
        normalized_label = label_name.strip().lower()
        if not normalized_label:
            continue
        where_clauses.append(
            ~exists(
                select(SnippetLabel.snippet_id)
                .join(Label, Label.id == SnippetLabel.label_id)
                .where(
                    SnippetLabel.snippet_id == Snippet.id,
                    Label.user_id == user_id,
                    func.lower(Label.name) == normalized_label,
                )
            )
        )

    total = await session.scalar(select(func.count()).select_from(Snippet).where(*where_clauses))

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
        select(  # type: ignore[call-overload]
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
    rows = [row._asdict() for row in result.all()]
    return [await _serialize_snippet_row(session, row) for row in rows], total or 0


async def get_snippet_by_id(session: AsyncSession, snippet_id: uuid.UUID) -> SnippetRead | None:
    result = await session.execute(select(Snippet).where(Snippet.id == snippet_id))
    snippet = result.scalar_one_or_none()
    if snippet is None:
        return None
    return await _serialize_snippet(session, snippet)


async def delete_snippet(session: AsyncSession, snippet: SnippetRead | Snippet) -> None:
    model = snippet
    if not isinstance(snippet, Snippet):
        result = await session.execute(select(Snippet).where(Snippet.id == snippet.id))
        model = result.scalar_one()
    await session.delete(model)
    await session.commit()


async def update_snippet(
    session: AsyncSession,
    snippet: SnippetRead | Snippet,
    title: str | None = None,
    language: str | None = None,
    content: str | None = None,
    color: str | None = None,
) -> SnippetRead:
    model = snippet
    if not isinstance(snippet, Snippet):
        result = await session.execute(select(Snippet).where(Snippet.id == snippet.id))
        model = result.scalar_one()
    if title is not None:
        model.title = title
    if language is not None:
        model.language = language
    if content is not None:
        model.content = content
    if color is not None:
        model.color = None if color == "none" else color
    model.updated_at = datetime.now(UTC).replace(tzinfo=None)
    session.add(model)
    await session.commit()
    await session.refresh(model)
    return await _serialize_snippet(session, model)


async def get_snippet_by_short_code(session: AsyncSession, code: str) -> Snippet | None:
    result = await session.execute(select(Snippet).where(Snippet.short_code == code))
    return result.scalar_one_or_none()


async def toggle_snippet_pin(session: AsyncSession, snippet: SnippetRead | Snippet) -> SnippetRead:
    model = snippet
    if not isinstance(snippet, Snippet):
        result = await session.execute(select(Snippet).where(Snippet.id == snippet.id))
        model = result.scalar_one()
    model.is_pinned = not model.is_pinned
    model.updated_at = datetime.now(UTC).replace(tzinfo=None)
    session.add(model)
    await session.commit()
    await session.refresh(model)
    return await _serialize_snippet(session, model)


async def toggle_snippet_visibility(session: AsyncSession, snippet: SnippetRead | Snippet) -> SnippetRead:
    model = snippet
    if not isinstance(snippet, Snippet):
        result = await session.execute(select(Snippet).where(Snippet.id == snippet.id))
        model = result.scalar_one()
    model.is_public = not model.is_public
    model.updated_at = datetime.now(UTC).replace(tzinfo=None)
    session.add(model)
    await session.commit()
    await session.refresh(model)
    return await _serialize_snippet(session, model)
