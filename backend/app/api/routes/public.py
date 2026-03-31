from datetime import UTC, timezone

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse, RedirectResponse
from starlette import status

from app.api.deps import SessionDep
from app.core.config import settings
from app.services.snippet_service import get_snippet_by_short_code

router = APIRouter()


def render_snippet_markdown(snippet) -> str:
    created = snippet.created_at.replace(tzinfo=UTC).isoformat()
    updated = snippet.updated_at.replace(tzinfo=UTC).isoformat()
    parts = [
        "---",
        f'title: "{snippet.title}"',
        f'date: "{created}"',
        f'updated: "{updated}"',
        f'language: "{snippet.language}"',
        "---",
    ]
    if snippet.language == "markdown":
        parts.append("")
        parts.append(snippet.content)
    else:
        parts.append("")
        parts.append(f"```{snippet.language}")
        parts.append(snippet.content)
        parts.append("```")
    return "\n".join(parts)


@router.get("/{code}")
async def public_short_code(code: str, request: Request, session: SessionDep):
    accept = request.headers.get("accept", "")
    if "text/markdown" not in accept:
        return RedirectResponse(
            f"{settings.frontend_url}/s/{code}",
            status_code=status.HTTP_302_FOUND,
        )

    snippet = await get_snippet_by_short_code(session=session, code=code.lower())
    if not snippet or not snippet.is_public:
        return PlainTextResponse(
            "snippet not found",
            status_code=status.HTTP_404_NOT_FOUND,
            media_type="text/markdown",
        )

    return PlainTextResponse(
        render_snippet_markdown(snippet),
        media_type="text/markdown; charset=utf-8",
    )
