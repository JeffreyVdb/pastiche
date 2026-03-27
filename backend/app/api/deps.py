import hashlib
import uuid
from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import decode_access_token
from app.models.user import User
from app.services.api_key_service import get_api_key_by_hash, increment_request_count
from app.services.user_service import get_user_by_id

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def _resolve_user(
    session: AsyncSession,
    access_token: str | None,
    authorization: str | None,
) -> User | None:
    # 1. Try cookie auth first
    if access_token:
        user_id_str = decode_access_token(access_token)
        if not user_id_str:
            return None
        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            return None
        user = await get_user_by_id(session, user_id)
        if not user:
            return None
        return user

    # 2. Try Bearer API key auth
    if authorization and authorization.startswith("Bearer "):
        bearer_token = authorization[7:]
        key_hash = hashlib.sha256(bearer_token.encode()).hexdigest()
        api_key = await get_api_key_by_hash(session, key_hash)
        if api_key:
            user = await get_user_by_id(session, api_key.user_id)
            if user:
                await increment_request_count(session, api_key)
                return user

    return None


async def get_current_user(
    session: SessionDep,
    access_token: str | None = Cookie(default=None),
    authorization: str | None = Header(default=None),
) -> User:
    user = await _resolve_user(session=session, access_token=access_token, authorization=authorization)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


async def get_optional_current_user(
    session: SessionDep,
    access_token: str | None = Cookie(default=None),
    authorization: str | None = Header(default=None),
) -> User | None:
    return await _resolve_user(session=session, access_token=access_token, authorization=authorization)


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalCurrentUser = Annotated[User | None, Depends(get_optional_current_user)]
