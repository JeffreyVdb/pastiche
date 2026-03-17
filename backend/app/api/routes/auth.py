from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.security import create_access_token, oauth
from app.models.user import UserRead
from app.services.user_service import get_or_create_user

router = APIRouter(prefix="/auth")

COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = settings.jwt_access_token_expire_minutes * 60


@router.get("/github/login")
async def github_login(request: Request) -> RedirectResponse:
    redirect_uri = f"{settings.backend_url}/api/auth/github/callback"
    return await oauth.github.authorize_redirect(request, redirect_uri)


@router.get("/github/callback")
async def github_callback(request: Request, session: SessionDep) -> RedirectResponse:
    token = await oauth.github.authorize_access_token(request)
    resp = await oauth.github.get("user", token=token)
    profile = resp.json()

    # Fetch primary email if not public
    email: str | None = profile.get("email")
    if not email:
        emails_resp = await oauth.github.get("user/emails", token=token)
        emails = emails_resp.json()
        primary = next((e for e in emails if e.get("primary") and e.get("verified")), None)
        email = primary["email"] if primary else None

    user = await get_or_create_user(
        session=session,
        github_id=profile["id"],
        username=profile["login"],
        display_name=profile.get("name"),
        avatar_url=profile.get("avatar_url"),
        email=email,
    )

    access_token = create_access_token(str(user.id))
    response = RedirectResponse(url=settings.frontend_url)
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=not settings.is_development,
        max_age=COOKIE_MAX_AGE,
    )
    return response


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie(key=COOKIE_NAME)
    return {"message": "Logged out"}
