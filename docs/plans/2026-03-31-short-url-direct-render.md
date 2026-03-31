# Short URL Direct Render

**Date**: 2026-03-31
**Status**: Draft

## Goal

Make `/s/<short_code>` URLs render the snippet content directly instead of redirecting to `/snippets/<uuid>`. Short links shared with others should stay short in the browser address bar.

## Context

Currently, visiting `/s/<short_code>` triggers a two-step flow:

1. **Frontend** (`frontend/src/routes/s/$code.tsx`): calls `GET /api/snippets/resolve/{code}` which returns `{ snippet_id: "..." }`, then uses `navigate()` to `/snippets/$snippetId` with `replace: true`.
2. **Backend** (`backend/app/api/routes/snippets.py:65`): the `resolve_short_code` endpoint looks up the snippet by short_code and returns only the UUID.

This means the URL in the browser changes from `/s/abc123` to `/snippets/550e8400-e29b-41d4-a716-446655440000`, defeating the purpose of a short link.

The existing `get_one` endpoint (`backend/app/api/routes/snippets.py:73`) already supports unauthenticated access for public snippets via `OptionalCurrentUser`, returning `SnippetPublicRead`. The frontend `ViewSnippet` component already renders without `AppLayout` when unauthenticated.

## Affected Components

- [x] Backend (`backend/`)
- [x] Frontend (`frontend/`)
- [ ] Infrastructure
- [ ] Documentation

## Detailed Changes

### Backend

**Modify `resolve_short_code` endpoint** (`backend/app/api/routes/snippets.py:64-69`):

Change the endpoint to return the full snippet data instead of just the UUID. The endpoint currently uses `SessionDep` (no auth), so it should use `OptionalCurrentUser` instead to support both authenticated and anonymous access, following the same access logic as `get_one`:

- If user is authenticated and owns the snippet → return `SnippetRead`
- If snippet is public → return `SnippetPublicRead`
- Otherwise → 404

Changes:
1. Add `current_user: OptionalCurrentUser` parameter
2. Return `SnippetRead | SnippetPublicRead` instead of `dict`
3. Apply the same ownership/public visibility check used in `get_one`

The `get_snippet_by_short_code` service function (`backend/app/services/snippet_service.py:174`) already returns the full `Snippet` object, so no service-layer changes are needed.

### Frontend

**Rewrite `frontend/src/routes/s/$code.tsx`**:

Replace the current resolve-and-redirect logic with direct rendering using the existing `ViewSnippet` component:

1. Call `GET /api/snippets/resolve/{code}` — the response now contains full snippet data
2. Render the `ViewSnippet` component (or equivalent inline rendering) using the returned data, **without** calling `navigate()` to change the URL
3. The URL stays as `/s/<short_code>` in the browser

Two approaches:

**Option A (Recommended): New backend endpoint, reuse ViewSnippet component**

- Create a new backend endpoint that returns the snippet by short_code with the same shape as `get_one` (or modify `resolve_short_code` to do so)
- In `frontend/src/routes/s/$code.tsx`, fetch the snippet data and pass it directly to the existing `ViewSnippet` page. This requires either:
  - Making `ViewSnippet` accept an optional initial snippet object to skip its own fetch, or
  - Having the short code route fetch via the same `/api/snippets/{id}` endpoint after getting the ID from resolve (but this keeps the two-request flow)

**Option B: Modify resolve endpoint to return full snippet, render in-place**

- Modify `resolve_short_code` to return the full `SnippetRead | SnippetPublicRead`
- In `frontend/src/routes/s/$code.tsx`, fetch and render the snippet content directly, reusing the same JSX pattern as `ViewSnippet` but self-contained

**Recommended approach: Option A with a twist** — modify `resolve_short_code` to return full snippet data, then in the frontend route, fetch once and render the `ViewSnippet` component. To avoid duplicating ViewSnippet's fetch logic, either:
- Pass the pre-fetched snippet as a prop/state, or
- Fetch the ID only, then let ViewSnippet do its own fetch (single extra hop but URL stays short)

The simplest implementation: modify `resolve_short_code` to return the full snippet data, then create a self-contained page component in `$code.tsx` that mirrors `ViewSnippet`'s rendering but fetches from the resolve endpoint. However, this duplicates a lot of code.

**Best implementation**: Modify `resolve_short_code` to return `SnippetRead | SnippetPublicRead` (full data). In `$code.tsx`, fetch the data, then render using the existing `ViewSnippet` component by refactoring it to optionally accept pre-fetched data instead of always fetching by ID. Alternatively, keep `resolve_short_code` returning just the ID but change the frontend to **not navigate** — instead, render `<ViewSnippet snippetId={id} />` inline while keeping the URL as `/s/<short_code>`.

**Simplest path (recommended):**

1. Keep `resolve_short_code` returning `{ snippet_id }` but add `OptionalCurrentUser` for proper access control
2. In `frontend/src/routes/s/$code.tsx`, fetch the snippet_id, then render `<ViewSnippet snippetId={snippet_id} />` directly (no `navigate()`, no `replace`). The `ViewSnippet` component will make its own fetch to `/api/snippets/{id}`, but the URL bar stays as `/s/<short_code>`.

This is minimal changes (no backend model changes, no component refactoring) and achieves the goal.

### Step-by-step implementation

#### 1. Backend: Update `resolve_short_code` access control

File: `backend/app/api/routes/snippets.py`

- Change `resolve_short_code` to accept `OptionalCurrentUser` instead of just `SessionDep`
- Add the same visibility check as `get_one`: if user is owner → ok, if public → ok, else → 404
- Response shape stays `{ snippet_id: str }` — no breaking change for the API contract

#### 2. Frontend: Rewrite `/s/$code` route to render in-place

File: `frontend/src/routes/s/$code.tsx`

- Remove the `navigate()` call
- After fetching the snippet_id from the resolve endpoint, render `<ViewSnippet snippetId={snippet_id} />` directly
- Wrap in `AppLayout` for authenticated users, bare for unauthenticated (same pattern as `snippets/$snippetId.tsx`)
- The URL bar will remain `/s/<short_code>`

#### 3. Frontend: Fix "copy link" in ViewSnippet

File: `frontend/src/pages/ViewSnippet.tsx`

- The `handleCopyLink` function currently copies `window.location.href`, which will now correctly be `/s/<short_code>` when accessed via short URL. No change needed.

#### 4. Frontend: Fix "← back" link in ViewSnippet

File: `frontend/src/pages/ViewSnippet.tsx`

- The back link currently goes to `/`. This is fine for both routes. No change needed.

#### 5. Frontend: Update SnippetCard copy-link to use short URL

File: `frontend/src/components/snippets/SnippetCard.tsx`

- Already uses `${window.location.origin}/s/${snippet.short_code}`. No change needed.

## Testing Strategy

### Backend Tests

- Run `pytest` in `backend/`
- Update `test_resolve_short_code_authenticated` and `test_resolve_short_code_unauthenticated` in `backend/tests/test_snippets.py` to verify the access control logic
- Add test: resolving a private snippet as anonymous → 404
- Add test: resolving a private snippet as the owner → 200 with snippet_id
- Add test: resolving a public snippet as anonymous → 200 with snippet_id

### Frontend Tests

- Run `pnpm build` in `frontend/` to verify no TypeScript errors
- Run `pnpm lint` in `frontend/`
- Manual test: visit `/s/<short_code>` for a public snippet → content renders, URL stays short
- Manual test: visit `/s/<short_code>` for a private snippet as owner → content renders
- Manual test: visit `/s/<short_code>` for a private snippet as anonymous → "snippet not found"
- Manual test: copy link from snippet detail view → clipboard contains short URL

## Documentation Updates

- [ ] `docs/ARCHITECTURE.md` — update the short URL flow description if it documents routing

## Risks / Open Questions

- **Two requests**: The short code route makes one request to resolve, then ViewSnippet makes another to fetch the full snippet. This is a minor inefficiency but avoids refactoring ViewSnippet to accept pre-fetched data. Could be optimized later.
- **SEO/crawlers**: Public snippets on `/s/<short_code>` already have `noindex, nofollow` meta tags (set in ViewSnippet). No change needed.
