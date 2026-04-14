import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, SessionDep
from app.models.label import LabelCreate, LabelRead, LabelUpdate
from app.services.label_service import (
    attach_label,
    create_label,
    delete_label,
    detach_label,
    get_label_by_id,
    list_labels,
    update_label,
)
from app.services.snippet_service import get_snippet_by_id

router = APIRouter(prefix="/labels", tags=["labels"])


@router.get("", response_model=list[LabelRead])
async def list_mine(current_user: CurrentUser, session: SessionDep) -> list[LabelRead]:
    return await list_labels(session=session, user_id=current_user.id)


@router.post("", response_model=LabelRead, status_code=status.HTTP_201_CREATED)
async def create(
    body: LabelCreate,
    current_user: CurrentUser,
    session: SessionDep,
) -> LabelRead:
    try:
        label = await create_label(session=session, user_id=current_user.id, name=body.name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return LabelRead.model_validate(label)


@router.patch("/{label_id}", response_model=LabelRead)
async def update(
    label_id: uuid.UUID,
    body: LabelUpdate,
    current_user: CurrentUser,
    session: SessionDep,
) -> LabelRead:
    label = await get_label_by_id(session=session, label_id=label_id)
    if not label or label.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")
    try:
        label = await update_label(session=session, label=label, name=body.name, color=body.color)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return LabelRead.model_validate(label)


@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(label_id: uuid.UUID, current_user: CurrentUser, session: SessionDep) -> None:
    label = await get_label_by_id(session=session, label_id=label_id)
    if not label or label.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")
    await delete_label(session=session, label=label)


@router.put("/{label_id}/snippets/{snippet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def attach(
    label_id: uuid.UUID,
    snippet_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> None:
    label = await get_label_by_id(session=session, label_id=label_id)
    snippet = await get_snippet_by_id(session=session, snippet_id=snippet_id)
    if not label or label.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")
    if not snippet or snippet.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found")
    await attach_label(session=session, snippet=snippet, label=label)


@router.delete("/{label_id}/snippets/{snippet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def detach(
    label_id: uuid.UUID,
    snippet_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> None:
    label = await get_label_by_id(session=session, label_id=label_id)
    snippet = await get_snippet_by_id(session=session, snippet_id=snippet_id)
    if not label or label.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")
    if not snippet or snippet.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found")
    await detach_label(session=session, snippet=snippet, label=label)
