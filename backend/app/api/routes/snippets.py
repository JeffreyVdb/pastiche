import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.api.deps import CurrentUser, OptionalCurrentUser, SessionDep
from app.models.pagination import PaginatedResponse, PaginationLimit, PaginationOffset
from app.models.snippet import (
    SnippetCreate,
    SnippetListRead,
    SnippetPublicRead,
    SnippetRead,
    SnippetResolve,
    SnippetSortField,
    SnippetUpdate,
)
from app.services.patch_service import PatchApplyError, apply_patch
from app.services.snippet_service import (
    create_snippet,
    delete_snippet,
    get_snippet_by_id,
    get_snippet_by_short_code,
    list_snippets_by_user,
    toggle_snippet_pin,
    toggle_snippet_visibility,
    update_snippet,
)

router = APIRouter(prefix="/snippets")


@router.post("", response_model=SnippetRead, status_code=status.HTTP_201_CREATED)
async def create(
    body: SnippetCreate, current_user: CurrentUser, session: SessionDep
) -> SnippetRead:
    snippet = await create_snippet(
        session=session,
        user_id=current_user.id,
        title=body.title,
        language=body.language,
        content=body.content,
    )
    return SnippetRead.model_validate(snippet)


@router.get("", response_model=PaginatedResponse[SnippetListRead])
async def list_mine(
    current_user: CurrentUser,
    session: SessionDep,
    sort_by: SnippetSortField = Query(default=SnippetSortField.created_at),
    order: Literal["asc", "desc"] = Query(default="desc"),
    q: str | None = Query(default=None),
    labels: list[str] = Query(default=[]),
    exclude_labels: list[str] = Query(default=[]),
    limit: PaginationLimit = 50,
    offset: PaginationOffset = 0,
    pinned: bool | None = Query(default=None),
) -> PaginatedResponse[SnippetListRead]:
    rows, total = await list_snippets_by_user(
        session=session,
        user_id=current_user.id,
        sort_by=sort_by,
        order=order,
        limit=limit,
        offset=offset,
        pinned=pinned,
        q=q,
        labels=labels,
        exclude_labels=exclude_labels,
    )
    return PaginatedResponse(
        items=[SnippetListRead.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/resolve/{code}", response_model=SnippetResolve)
async def resolve_short_code(
    code: str, current_user: OptionalCurrentUser, session: SessionDep
) -> SnippetResolve:
    snippet = await get_snippet_by_short_code(session=session, code=code.lower())
    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
        )
    if current_user and snippet.user_id == current_user.id:
        return SnippetResolve(
            snippet_id=snippet.id,
            title=snippet.title,
            short_code=snippet.short_code,
            language=snippet.language,
        )
    if snippet.is_public:
        return SnippetResolve(
            snippet_id=snippet.id,
            title=snippet.title,
            short_code=snippet.short_code,
            language=snippet.language,
        )
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
    )


@router.get("/{snippet_id}")
async def get_one(
    snippet_id: uuid.UUID, current_user: OptionalCurrentUser, session: SessionDep
) -> SnippetRead | SnippetPublicRead:
    snippet = await get_snippet_by_id(session=session, snippet_id=snippet_id)
    if not snippet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
        )
    if current_user and snippet.user_id == current_user.id:
        return SnippetRead.model_validate(snippet)
    if snippet.is_public:
        return SnippetPublicRead.model_validate(snippet)
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
    )


@router.delete("/{snippet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    snippet_id: uuid.UUID, current_user: CurrentUser, session: SessionDep
) -> None:
    snippet = await get_snippet_by_id(session=session, snippet_id=snippet_id)
    if not snippet or snippet.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
        )
    await delete_snippet(session=session, snippet=snippet)


@router.patch("/{snippet_id}/pin", response_model=SnippetRead)
async def toggle_pin(
    snippet_id: uuid.UUID, current_user: CurrentUser, session: SessionDep
) -> SnippetRead:
    snippet = await get_snippet_by_id(session=session, snippet_id=snippet_id)
    if not snippet or snippet.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
        )
    snippet = await toggle_snippet_pin(session=session, snippet=snippet)
    return SnippetRead.model_validate(snippet)


@router.patch("/{snippet_id}/visibility", response_model=SnippetRead)
async def toggle_visibility(
    snippet_id: uuid.UUID, current_user: CurrentUser, session: SessionDep
) -> SnippetRead:
    snippet = await get_snippet_by_id(session=session, snippet_id=snippet_id)
    if not snippet or snippet.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
        )
    snippet = await toggle_snippet_visibility(session=session, snippet=snippet)
    return SnippetRead.model_validate(snippet)


@router.patch("/{snippet_id}", response_model=SnippetRead)
async def update(
    body: SnippetUpdate,
    snippet_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> SnippetRead | JSONResponse:
    snippet = await get_snippet_by_id(session=session, snippet_id=snippet_id)
    if not snippet or snippet.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found"
        )

    content = body.content
    if body.patch is not None:
        try:
            content = apply_patch(snippet.content, body.patch)
        except PatchApplyError as exc:
            return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content=exc.to_response())

    snippet = await update_snippet(
        session=session,
        snippet=snippet,
        title=body.title,
        language=body.language,
        content=content,
        color=body.color,
    )
    return SnippetRead.model_validate(snippet)
