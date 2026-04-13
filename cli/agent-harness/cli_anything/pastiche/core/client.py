from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from cli_anything.pastiche.core.config import PasticheConfig


@dataclass(slots=True)
class PasticheError(RuntimeError):
    status: int
    detail: str

    def __str__(self) -> str:
        return f"Pastiche API error ({self.status}): {self.detail}"


class PasticheClient:
    def __init__(
        self,
        config: PasticheConfig,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
        timeout: float = 30.0,
    ) -> None:
        self._client = httpx.AsyncClient(
            base_url=f"{config.url}/api",
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Accept": "application/json",
            },
            timeout=timeout,
            transport=transport,
        )

    async def __aenter__(self) -> "PasticheClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        response = await self._client.request(method, path, **kwargs)
        if response.status_code >= 400:
            detail = self._extract_error_detail(response)
            raise PasticheError(status=response.status_code, detail=detail)
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    @staticmethod
    def _extract_error_detail(response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return response.text or response.reason_phrase

        if isinstance(payload, dict):
            detail = payload.get("detail")
            if isinstance(detail, str):
                return detail
            if detail is not None:
                return str(detail)
        return response.text or response.reason_phrase

    async def create_snippet(self, title: str, language: str, content: str) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/snippets",
            json={"title": title, "language": language, "content": content},
        )

    async def list_snippets(
        self,
        *,
        sort_by: str = "created_at",
        order: str = "desc",
        q: str | None = None,
        limit: int = 50,
        offset: int = 0,
        pinned: bool | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "sort_by": sort_by,
            "order": order,
            "limit": limit,
            "offset": offset,
        }
        if q:
            params["q"] = q
        if pinned is not None:
            params["pinned"] = str(pinned).lower()
        return await self._request("GET", "/snippets", params=params)

    async def get_snippet(self, snippet_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/snippets/{snippet_id}")

    async def update_snippet(
        self,
        snippet_id: str,
        *,
        title: str | None = None,
        language: str | None = None,
        content: str | None = None,
        color: str | None = None,
    ) -> dict[str, Any]:
        body = {"title": title, "language": language, "content": content, "color": color}
        return await self._request("PATCH", f"/snippets/{snippet_id}", json={k: v for k, v in body.items() if v is not None})

    async def delete_snippet(self, snippet_id: str) -> None:
        await self._request("DELETE", f"/snippets/{snippet_id}")

    async def toggle_pin(self, snippet_id: str) -> dict[str, Any]:
        return await self._request("PATCH", f"/snippets/{snippet_id}/pin")

    async def toggle_visibility(self, snippet_id: str) -> dict[str, Any]:
        return await self._request("PATCH", f"/snippets/{snippet_id}/visibility")

    async def resolve_short_code(self, code: str) -> dict[str, Any]:
        resolved = await self._request("GET", f"/snippets/resolve/{code}")
        snippet_id = resolved["snippet_id"]
        return await self.get_snippet(snippet_id)

    async def create_api_key(self, name: str) -> dict[str, Any]:
        return await self._request("POST", "/keys", json={"name": name})

    async def list_api_keys(self, *, limit: int = 50, offset: int = 0) -> dict[str, Any]:
        return await self._request("GET", "/keys", params={"limit": limit, "offset": offset})

    async def delete_api_key(self, key_id: str) -> None:
        await self._request("DELETE", f"/keys/{key_id}")

    async def get_me(self) -> dict[str, Any]:
        return await self._request("GET", "/auth/me")
