# Fix: Search propagation race condition when typing fast

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

## Problem

Typing fast in the search input (e.g., `datadog`) causes incorrect results — too many snippets shown. Backspacing and retyping the last character fixes it.

## Root cause

`Home.tsx` search has a two-phase pipeline:

```
rawQuery → debounce 250ms → navigate() → URL update → routeQuery → fetchListPage()
```

Both `routeQuery` and `rawQuery` are separate state sources. The debounce effect on `rawQuery` schedules `navigate()`. The fetch effect depends on `routeQuery`. These two effects run in different render cycles, creating a race window.

**The race condition:**

1. User types "data" → `rawQuery = "data"` → debounce fires → `navigate({ q: "data" })`
2. Route updates → `routeQuery = "data"` → fetch starts for "data"
3. User types "dog" → `rawQuery = "datadog"` → new debounce scheduled
4. Before 250ms elapses, the "data" fetch completes → **results displayed**
5. Debounce fires → `navigate({ q: "datadog" })` → fetch starts for "datadog"
6. The "datadog" fetch may abort or complete, but the "data" results already set `snippets` state

The `listRequestIdRef` guard and `AbortController` handle most cases, but when the old fetch **completes before being aborted**, its results persist until the new fetch resolves. With fast typing, multiple intermediate navigations fire, each triggering a fetch. The timing of aborts vs completions determines which results end up on screen.

Additionally, `routeQuery` is a dependency of the fetch effect, which creates a tight coupling between URL state and data fetching. The bidirectional sync between `rawQuery` (user input) and `routeQuery` (URL) introduces unnecessary complexity.

## Solution

Decouple search input from URL-driven fetching. Introduce a single `searchQuery` state as the source of truth for fetching.

### Architecture change

**Before (two pipelines):**
```
rawQuery ──debounce──→ navigate ──→ routeQuery ──→ fetch
                                                    ↑
routeQuery ──→ sync rawQuery ───────────────────────┘
```

**After (single pipeline):**
```
rawQuery ──debounce──→ searchQuery ──→ fetch + navigate (URL is cosmetic)
```

### Changes to `frontend/src/pages/Home.tsx`

1. **Add `searchQuery` state** — single source of truth for the active search query used for fetching:
   ```ts
   const [searchQuery, setSearchQuery] = useState(routeQuery);
   ```

2. **Rewrite the debounce effect** — debounce `rawQuery` into `searchQuery` instead of `navigate()`:
   ```ts
   useEffect(() => {
     const normalized = normalizeSnippetSearchInput(rawQuery);
     if (!normalized) {
       setSearchQuery("");
       return;
     }
     const timeout = window.setTimeout(() => {
       const nextQuery = getCommittedSnippetSearchQuery(normalized);
       setSearchQuery(nextQuery);
     }, SEARCH_DEBOUNCE_MS);
     return () => window.clearTimeout(timeout);
   }, [rawQuery]);
   ```

3. **Add URL sync effect** — update URL as a side effect of `searchQuery`, not as the driver:
   ```ts
   useEffect(() => {
     if (searchQuery === routeQuery) return;
     navigate({ to: "/", search: searchQuery ? { q: searchQuery } : {}, replace: true });
   }, [searchQuery, routeQuery, navigate]);
   ```

4. **Update fetch effect** — depend on `searchQuery` instead of `routeQuery`:
   ```ts
   useEffect(() => {
     setFetchError(null);
     setLoadingMore(false);
     const isSearch = Boolean(searchQuery);

     if (isSearch) {
       cancelPinnedRequest();
       setPinnedLoading(false);
       fetchListPage(0, searchQuery);
       return () => cancelListRequest();
     }

     fetchPinnedSnippets();
     fetchListPage(0, "");
     return () => {
       cancelListRequest();
       cancelPinnedRequest();
     };
   }, [searchQuery]); // simplified deps — intentionally only searchQuery
   ```

5. **Update `isSearchMode`** — derive from `searchQuery`:
   ```ts
   const isSearchMode = Boolean(searchQuery);
   ```

6. **Update `routeQuery` sync** — only for URL→input sync (external navigation, page load):
   ```ts
   useEffect(() => {
     if (normalizeSnippetSearchInput(rawQuery) === routeQuery) return;
     setRawQuery(routeQuery);
     setSearchQuery(routeQuery);
   }, [routeQuery]);
   ```
   This handles the case where the user navigates directly to `/?q=datadog` or uses browser back/forward.

7. **Update `onClear`** — clear both states:
   ```ts
   onClear={() => {
     setRawQuery("");
     setSearchQuery("");
     navigate({ to: "/", search: {}, replace: true });
   }}
   ```

8. **Update `onCommitNow`** — commit immediately without debounce:
   ```ts
   onCommitNow={() => {
     const nextQuery = getCommittedSnippetSearchQuery(rawQuery);
     setSearchQuery(nextQuery);
   }}
   ```

9. **Update `reloadCurrentList`** — use `searchQuery`:
   ```ts
   const reloadCurrentList = useCallback(async () => {
     if (isSearchMode) {
       setPinnedSnippets([]);
       setPinnedLoading(false);
       await fetchListPage(0, searchQuery);
       return;
     }
     fetchPinnedSnippets();
     await fetchListPage(0, "");
   }, [fetchListPage, fetchPinnedSnippets, isSearchMode, searchQuery]);
   ```

10. **Update `loadNextPage`** — use `searchQuery`:
    ```ts
    const loadNextPage = useCallback(() => {
      if (loadingMore || fetchError || snippetsLoading) return;
      fetchListPage(offset, searchQuery);
    }, [fetchError, fetchListPage, loadingMore, offset, searchQuery, snippetsLoading]);
    ```

### No backend changes

Backend search logic is correct. The bug is entirely in the frontend state management.

### No changes to `SnippetSearchControl`

The component is a controlled input — it doesn't need changes.

## Verification

1. **Manual test — fast typing**: Type "datadog" quickly. Should see correct single result (or no results if no match).
2. **Manual test — slow typing**: Type "data", wait 300ms, type "dog". Should see intermediate results then final results.
3. **Manual test — clear**: Click clear button. Should reset to non-search view.
4. **Manual test — Enter key**: Type query, press Enter. Should immediately commit search.
5. **Manual test — URL navigation**: Navigate to `/?q=datadog` directly. Should show correct results.
6. **Manual test — back/forward**: Search, navigate away, use browser back. Should restore search results.
7. **Backend tests**: Run `cd backend && python -m pytest tests/test_snippets.py -k search` — should still pass (no backend changes).

## Files modified

- `frontend/src/pages/Home.tsx` — restructure search state management

## Risks

- **Low**: The change is isolated to the Home component's search state logic.
- **Medium**: The URL sync effect could cause an extra render cycle. Mitigated by the `===` guard.
- **Note**: `searchQuery` is not in the effect dependency arrays for fetch/reload/loadNextPage by the full list. This is intentional — we want these callbacks to close over the latest `searchQuery` via the `useState` getter. If React lint complains, add `searchQuery` to the deps (it's stable between searches anyway).
