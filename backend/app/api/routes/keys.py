import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, SessionDep
from app.models.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyRead
from app.services.api_key_service import (
    create_api_key,
    delete_api_key,
    get_api_key_by_id,
    list_api_keys_by_user,
)

router = APIRouter(prefix="/keys")


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create(body: ApiKeyCreate, current_user: CurrentUser, session: SessionDep) -> ApiKeyCreated:
    api_key, plaintext = await create_api_key(
        session=session,
        user_id=current_user.id,
        name=body.name,
    )
    return ApiKeyCreated(**ApiKeyRead.model_validate(api_key).model_dump(), key=plaintext)


@router.get("", response_model=list[ApiKeyRead])
async def list_keys(current_user: CurrentUser, session: SessionDep) -> list[ApiKeyRead]:
    keys = await list_api_keys_by_user(session=session, user_id=current_user.id)
    return [ApiKeyRead.model_validate(k) for k in keys]


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(key_id: uuid.UUID, current_user: CurrentUser, session: SessionDep) -> None:
    api_key = await get_api_key_by_id(session=session, key_id=key_id)
    if not api_key or api_key.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    await delete_api_key(session=session, api_key=api_key)
