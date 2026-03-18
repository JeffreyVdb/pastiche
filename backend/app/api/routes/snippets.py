import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, SessionDep
from app.models.snippet import SnippetCreate, SnippetRead, SnippetUpdate
from app.services.snippet_service import (
    create_snippet,
    delete_snippet,
    get_snippet_by_id,
    list_snippets_by_user,
    update_snippet,
)

router = APIRouter(prefix="/snippets")


@router.post("", response_model=SnippetRead, status_code=status.HTTP_201_CREATED)
async def create(body: SnippetCreate, current_user: CurrentUser, session: SessionDep) -> SnippetRead:
    snippet = await create_snippet(
        session=session,
        user_id=current_user.id,
        title=body.title,
        language=body.language,
        content=body.content,
    )
    return SnippetRead.model_validate(snippet)


@router.get("", response_model=list[SnippetRead])
async def list_mine(current_user: CurrentUser, session: SessionDep) -> list[SnippetRead]:
    snippets = await list_snippets_by_user(session=session, user_id=current_user.id)
    return [SnippetRead.model_validate(s) for s in snippets]


@router.get("/{snippet_id}", response_model=SnippetRead)
async def get_one(snippet_id: uuid.UUID, current_user: CurrentUser, session: SessionDep) -> SnippetRead:
    snippet = await get_snippet_by_id(session=session, snippet_id=snippet_id)
    if not snippet or snippet.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found")
    return SnippetRead.model_validate(snippet)


@router.delete("/{snippet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(snippet_id: uuid.UUID, current_user: CurrentUser, session: SessionDep) -> None:
    snippet = await get_snippet_by_id(session=session, snippet_id=snippet_id)
    if not snippet or snippet.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found")
    await delete_snippet(session=session, snippet=snippet)


@router.patch("/{snippet_id}", response_model=SnippetRead)
async def update(body: SnippetUpdate, snippet_id: uuid.UUID, current_user: CurrentUser, session: SessionDep) -> SnippetRead:
    snippet = await get_snippet_by_id(session=session, snippet_id=snippet_id)
    if not snippet or snippet.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found")
    snippet = await update_snippet(session=session, snippet=snippet, title=body.title, language=body.language, content=body.content)
    return SnippetRead.model_validate(snippet)
