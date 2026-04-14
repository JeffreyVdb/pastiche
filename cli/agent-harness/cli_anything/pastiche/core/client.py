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

    async def _ensure_labels(self, names: list[str]) -> list[dict[str, Any]]:
        if not names:
            return []
        existing = await self.list_labels()
        by_name = {label["name"].lower(): label for label in existing}
        resolved: list[dict[str, Any]] = []
        for raw_name in names:
            name = raw_name.strip()
            if not name:
                continue
            label = by_name.get(name.lower())
            if label is None:
                label = await self.create_label(name)
                by_name[name.lower()] = label
            resolved.append(label)
        return resolved

    async def create_snippet(
        self,
        title: str,
        language: str,
        content: str,
        labels: list[str] | None = None,
    ) -> dict[str, Any]:
        snippet = await self._request(
            "POST",
            "/snippets",
            json={"title": title, "language": language, "content": content},
        )
        for label in await self._ensure_labels(labels or []):
            await self.attach_label(label["id"], snippet["id"])
        return await self.get_snippet(snippet["id"])

    async def list_snippets(
        self,
        *,
        sort_by: str = "created_at",
        order: str = "desc",
        q: str | None = None,
        limit: int = 50,
        offset: int = 0,
        pinned: bool | None = None,
        labels: list[str] | None = None,
        exclude_labels: list[str] | None = None,
    ) -> dict[str, Any]:
        params: list[tuple[str, str]] = [
            ("sort_by", sort_by),
            ("order", order),
            ("limit", str(limit)),
            ("offset", str(offset)),
        ]
        if q:
            params.append(("q", q))
        if pinned is not None:
            params.append(("pinned", str(pinned).lower()))
        for label in labels or []:
            params.append(("labels", label))
        for label in exclude_labels or []:
            params.append(("exclude_labels", label))
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
        labels: list[str] | None = None,
    ) -> dict[str, Any]:
        body = {"title": title, "language": language, "content": content, "color": color}
        await self._request(
            "PATCH",
            f"/snippets/{snippet_id}",
            json={k: v for k, v in body.items() if v is not None},
        )
        if labels is not None:
            snippet = await self.get_snippet(snippet_id)
            desired = {label["id"]: label for label in await self._ensure_labels(labels)}
            current = {label["id"]: label for label in snippet.get("labels", [])}
            for label_id in current:
                if label_id not in desired:
                    await self.detach_label(label_id, snippet_id)
            for label_id in desired:
                if label_id not in current:
                    await self.attach_label(label_id, snippet_id)
        return await self.get_snippet(snippet_id)

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

    async def list_labels(self) -> list[dict[str, Any]]:
        return await self._request("GET", "/labels")

    async def create_label(self, name: str) -> dict[str, Any]:
        return await self._request("POST", "/labels", json={"name": name})

    async def update_label(
        self,
        label_id: str,
        *,
        name: str | None = None,
        color: str | None = None,
    ) -> dict[str, Any]:
        body = {"name": name, "color": color}
        return await self._request(
            "PATCH",
            f"/labels/{label_id}",
            json={k: v for k, v in body.items() if v is not None},
        )

    async def delete_label(self, label_id: str) -> None:
        await self._request("DELETE", f"/labels/{label_id}")

    async def attach_label(self, label_id: str, snippet_id: str) -> None:
        await self._request("PUT", f"/labels/{label_id}/snippets/{snippet_id}")

    async def detach_label(self, label_id: str, snippet_id: str) -> None:
        await self._request("DELETE", f"/labels/{label_id}/snippets/{snippet_id}")

    async def create_api_key(self, name: str) -> dict[str, Any]:
        return await self._request("POST", "/keys", json={"name": name})

    async def list_api_keys(self, *, limit: int = 50, offset: int = 0) -> dict[str, Any]:
        return await self._request("GET", "/keys", params={"limit": limit, "offset": offset})

    async def delete_api_key(self, key_id: str) -> None:
        await self._request("DELETE", f"/keys/{key_id}")

    async def get_me(self) -> dict[str, Any]:
        return await self._request("GET", "/auth/me")
