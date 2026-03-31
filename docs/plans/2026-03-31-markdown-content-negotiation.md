# Markdown Content Negotiation for LLM Agents

**Date**: 2026-03-31
**Status**: Draft

## Goal

Support `Accept: text/markdown` on the `/s/<short_code>` endpoint so that LLM agents can fetch public pastiche links and receive clean, parseable markdown instead of HTML/JSON. This enables feeding public snippet URLs directly to LLMs.

## Context

Currently `/s/<short_code>` is a purely client-side route. Nginx serves `index.html` for all paths, and the React app resolves the short code via `/api/snippets/resolve/<code>` to get a snippet ID, then fetches and renders the snippet.

The backend has no route at `/s/{code}` — only `/api/snippets/resolve/{code}` which returns `{"snippet_id": "..."}`.

For agents, JSON is fine for API endpoints, but `/s/<short_code>` URLs are the shareable links. Agents need a way to GET those URLs and get meaningful content back.

## Affected Components

- [x] Backend (`backend/`)
- [ ] Frontend (`frontend/`) — no code changes, only nginx config
- [x] Infrastructure (`frontend/nginx/default.conf.template`)
- [ ] Documentation

## Detailed Changes

### 1. Backend: New `/s/{code}` route with content negotiation

Create a new route file `backend/app/api/routes/public.py` (or add to `snippets.py`) that handles `GET /s/{code}`:

**Route behavior:**
- Read the `Accept` header from the request
- If `Accept: text/markdown` (or `Accept` includes `text/markdown`):
  - Look up the snippet by short code
  - If not found or not public → return 404 as plain text
  - Return the snippet rendered as markdown with `Content-Type: text/markdown; charset=utf-8`
- Otherwise:
  - Return a redirect (302) to the frontend's `/s/{code}` page (or return 404 if we want to keep the route agent-only)

**Markdown rendering logic:**

```python
def render_snippet_markdown(snippet: Snippet) -> str:
    from datetime import timezone

    parts = []

    # YAML frontmatter
    created = snippet.created_at.replace(tzinfo=timezone.utc).isoformat()
    updated = snippet.updated_at.replace(tzinfo=timezone.utc).isoformat()
    frontmatter = f"""---
title: "{snippet.title}"
date: "{created}"
updated: "{updated}"
language: "{snippet.language}"
---"""
    parts.append(frontmatter)

    # Body
    if snippet.language == "markdown":
        # Markdown snippets: render as-is, no fencing
        parts.append("")
        parts.append(snippet.content)
    else:
        # Other snippets: wrap in fenced code block
        parts.append("")
        parts.append(f"```{snippet.language}")
        parts.append(snippet.content)
        parts.append("```")

    return "\n".join(parts)
```

**Example output for a Python snippet:**

```
---
title: "My Helper Function"
date: "2026-03-31T12:00:00+00:00"
updated: "2026-03-31T12:00:00+00:00"
language: "python"
---

```python
def hello():
    print("world")
```
```

**Example output for a markdown snippet:**

```
---
title: "Meeting Notes"
date: "2026-03-31T12:00:00+00:00"
updated: "2026-03-31T12:00:00+00:00"
language: "markdown"
---

# Meeting Notes

- Item 1
- Item 2
```

### 2. Register the route in the app

The route should be registered directly on the FastAPI app (not under `/api` prefix) since `/s/<code>` is the public URL:

- In `backend/app/main.py`, add a new router at `/s` prefix
- Or register the route directly without the `/api` prefix

### 3. Nginx: Proxy `Accept: text/markdown` requests to backend

Update `frontend/nginx/default.conf.template` to detect the `Accept: text/markdown` header and proxy those requests to the backend instead of serving the SPA.

```nginx
# Agent markdown requests — proxy to backend
location /s/ {
    # If the client accepts markdown, proxy to backend
    if ($http_accept ~* "text/markdown") {
        proxy_pass http://backend:8000;
    }
    # Otherwise fall through to SPA
    try_files $uri $uri/ /index.html;
}
```

**Note:** The `if` directive in nginx location blocks has known gotchas. An alternative approach is to use a `map` directive:

```nginx
map $http_accept $markdown_agent {
    default 0;
    ~text/markdown 1;
}
```

Then in the location block, use this variable to decide proxy vs. SPA. This is the preferred approach as it avoids `if` in location context.

### 4. No frontend code changes

The React route at `/s/$code` continues to work as before for browser requests. Only requests with `Accept: text/markdown` are intercepted by nginx and proxied to the backend.

## Detailed File Changes

### `backend/app/api/routes/public.py` (new file)

- `GET /{code}` — content-negotiated snippet endpoint
- Reads `Accept` header, returns markdown or 406 (Not Acceptable) if neither `text/markdown` nor `text/html` is accepted
- For `text/html` acceptance, redirects to the frontend URL

### `backend/app/main.py`

- Import and include the new public router at `/s` prefix (no `/api` prefix)

### `frontend/nginx/default.conf.template`

- Add `map` block for `Accept` header detection
- Add special handling for `/s/` location to proxy markdown requests to backend

### `backend/tests/test_public.py` (new file)

- Test markdown response for public snippet
- Test 404 for non-existent short code
- Test 404 for private snippet (unauthenticated)
- Test that non-markdown Accept headers get appropriate response (redirect or 406)
- Test markdown snippet renders as-is (no fencing)
- Test code snippet renders with fenced code block

## Testing Strategy

### Backend Tests

- Run `pytest` in `backend/`
- New test file: `backend/tests/test_public.py`
- Scenarios:
  - Public snippet + `Accept: text/markdown` → 200 with `text/markdown` content type
  - Private snippet + `Accept: text/markdown` → 404
  - Non-existent short code → 404
  - Markdown-language snippet → content rendered as-is
  - Non-markdown snippet → content in fenced code block with language tag
  - Frontmatter includes title, date, updated, language

### Manual Testing

```bash
# Should return markdown
curl -H "Accept: text/markdown" http://localhost:8000/s/abc123

# Should return HTML (via browser or redirect)
curl http://localhost:8000/s/abc123
```

## Risks / Open Questions

- **Nginx `if` behavior**: The `if` directive in nginx location blocks can be unpredictable. The `map`-based approach is safer and recommended.
- **CORS**: The markdown endpoint is a simple GET returning text — CORS shouldn't be an issue since agents will make direct requests, not browser XHR.
- **Rate limiting**: Public markdown endpoints could be abused. Consider whether existing rate limiting (if any) covers this, or if we need to add it.
- **Caching**: Markdown responses are immutable for a given snippet version. Could add `Cache-Control` headers for efficiency, but may not be needed initially.
- **Accept header matching**: Some agents may send `Accept: text/markdown; charset=utf-8` or `Accept: text/markdown, text/plain`. We should match on substring presence of `text/markdown` in the Accept header.
