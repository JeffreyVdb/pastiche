# Plan: Include snippet ID in short code response

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

## Goal

When retrieving a snippet via short code, include the snippet's UUID in both the API response and CLI output. Currently `GET /snippets/resolve/{code}` only returns `{"snippet_id": "..."}` and the CLI's `short` command discards this value, showing no snippet ID in the metadata header.

## Current State

- **API:** `GET /snippets/resolve/{code}` → `{"snippet_id": "<uuid>"}` (bare dict, no response model)
- **CLI `short` command:** Calls resolve → fetches full snippet via `get_snippet()` → calls `print_snippet()`. The snippet_id from resolve is thrown away.
- **`print_snippet()`:** Renders metadata header (title, language, created, etc.) but has no `Snippet ID` line. The full snippet dict from `get_snippet()` has `id` field but `print_snippet` doesn't render it.

## Changes

### 1. Enrich `/resolve/{code}` API response

**File:** `backend/app/api/routes/snippets.py` (lines 78-92)

Currently returns `dict`. Create a proper response model and include metadata.

**File:** `backend/app/models/snippet.py`

Add new model:

```python
class SnippetResolve(SQLModel):
    snippet_id: uuid.UUID
    title: str
    short_code: str
    language: str
```

**Update** `resolve_short_code` route to return `SnippetResolve` instead of `dict`:

```python
async def resolve_short_code(
    code: str, current_user: OptionalCurrentUser, session: SessionDep
) -> SnippetResolve:
    snippet = await get_snippet_by_short_code(session=session, code=code.lower())
    if not snippet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found")
    if current_user and snippet.user_id == current_user.id:
        return SnippetResolve(snippet_id=snippet.id, title=snippet.title, short_code=snippet.short_code, language=snippet.language)
    if snippet.is_public:
        return SnippetResolve(snippet_id=snippet.id, title=snippet.title, short_code=snippet.short_code, language=snippet.language)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snippet not found")
```

Note: `snippet.short_code` is always set (NOT NULL in DB after migration 0005), no need for null handling.

### 2. Add snippet_id to `print_snippet()` output

**File:** `cli/agent-harness/cli_anything/pastiche/core/output.py` (line 28-43)

Add a `Snippet ID` line to the metadata header, after `Short code`:

```python
def print_snippet(snippet: dict[str, Any]) -> None:
    labels_str = ", ".join(f"#{label['name']}" for label in snippet.get("labels", [])) or "none"
    lines = [
        f"Snippet ID: {snippet.get('id', '-')}",
        f"Title: {snippet['title']}",
        # ... rest unchanged
    ]
    click.echo("\n".join(lines))
```

### 3. Update existing tests

**File:** `backend/tests/test_snippets.py`

- `test_resolve_short_code_authenticated` (line 461): Assert `title`, `short_code`, `language` in response alongside existing `snippet_id` check.
- `test_resolve_short_code_unauthenticated` (line 476): Same assertions.
- `test_resolve_short_code_private_as_owner` (line 507): Same assertions.

**File:** `cli/agent-harness/cli_anything/pastiche/tests/test_core.py`

- `test_print_helpers_render_human_and_json` (line 122): Add `"Snippet ID: 123"` assertion to the existing output check.

## Verification

1. Run backend tests: `cd backend && python -m pytest tests/test_snippets.py -k resolve -v`
2. Run CLI tests: `cd cli/agent-harness && python -m pytest cli_anything/pastiche/tests/test_core.py -k print -v`
3. Manual test: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/snippets/resolve/7l` — should return `{"snippet_id": "...", "title": "...", "short_code": "7l", "language": "..."}`

## Files Modified

| File | Change |
|------|--------|
| `backend/app/models/snippet.py` | Add `SnippetResolve` model |
| `backend/app/api/routes/snippets.py` | Return `SnippetResolve` from resolve route |
| `backend/tests/test_snippets.py` | Expand resolve tests with new field assertions |
| `cli/agent-harness/cli_anything/pastiche/core/output.py` | Add `Snippet ID` line to `print_snippet` |
| `cli/agent-harness/cli_anything/pastiche/tests/test_core.py` | Assert `Snippet ID` in print output |
