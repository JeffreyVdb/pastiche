# Plan: fix ability to search on a label

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

## Context

Searching for a label without text (e.g. `#feature`) returns no results or hides pinned snippets. Searching with text (e.g. `#feature text`) works correctly. Root cause: the frontend applies `pinned=false` when the text query is empty, which was intended for the default browsing view but incorrectly bleeds into label-only searches.

Additionally, `getCommittedSnippetSearchQuery` drops label-only queries to `""`, meaning label searches don't survive page refresh via the URL `q` param.

## Root Cause

Two frontend issues in the search pipeline:

1. **`Home.tsx` `fetchListPage` (line 146-150):** When `textQuery` is empty, the code unconditionally sets `pinned=false`. This is correct for default browsing (no search at all) but wrong when label filters are present. The condition should check for label presence, not just text presence.

2. **`snippet-search.ts` `getCommittedSnippetSearchQuery` (line 59-62):** Strips label-only queries to empty string because it only checks for text tokens. Should preserve the normalized query when label filters are present.

## Files to Modify

- `frontend/src/pages/Home.tsx` — `fetchListPage` function (~line 139-150)
- `frontend/src/lib/snippet-search.ts` — `getCommittedSnippetSearchQuery` function (line 59-62)
- `frontend/src/lib/__tests__/snippet-search.test.ts` — add label-persistence test

## Changes

### 1. `Home.tsx` — don't set `pinned=false` when label filters present

Current code (lines 139-150):
```ts
const { textQuery, includeLabels, excludeLabels } = getSnippetSearchFilters(query);

const params = new URLSearchParams({
  limit: String(PAGE_SIZE),
  offset: String(fetchOffset),
});

if (textQuery) {
  params.set("q", textQuery);
} else {
  params.set("pinned", "false");
}
```

Change to:
```ts
const { textQuery, includeLabels, excludeLabels } = getSnippetSearchFilters(query);

const params = new URLSearchParams({
  limit: String(PAGE_SIZE),
  offset: String(fetchOffset),
});

if (textQuery) {
  params.set("q", textQuery);
} else if (includeLabels.length === 0 && excludeLabels.length === 0) {
  params.set("pinned", "false");
}
```

Only set `pinned=false` when there are no text tokens AND no label filters. When labels are present (with or without text), include all snippets (pinned + unpinned) in results.

### 2. `snippet-search.ts` — preserve label queries in committed query

Current code (lines 59-62):
```ts
export function getCommittedSnippetSearchQuery(value: string): string {
  const normalized = getSnippetSearchFilters(value).textQuery;
  return getSnippetSearchTokens(normalized).length > 0 ? normalized : "";
}
```

Change to:
```ts
export function getCommittedSnippetSearchQuery(value: string): string {
  const filters = getSnippetSearchFilters(value);
  if (filters.includeLabels.length > 0 || filters.excludeLabels.length > 0) {
    return normalizeSnippetSearchInput(value);
  }
  return getSnippetSearchTokens(filters.textQuery).length > 0 ? filters.textQuery : "";
}
```

When label filters are present, return the full normalized input (including `#label` tokens). This ensures the URL `q` param preserves label searches across page refresh. When no labels, fall back to existing text-only behavior.

### 3. `snippet-search.test.ts` — add test

Add test case:
```ts
it("keeps label-only queries in committed query for URL persistence", () => {
  expect(getCommittedSnippetSearchQuery("#feature")).toBe("#feature");
  expect(getCommittedSnippetSearchQuery("#feature -#shopping")).toBe("#feature -#shopping");
  expect(getCommittedSnippetSearchQuery(" !#bug ")).toBe("!#bug");
});
```

## Verification

1. Run frontend tests: `cd frontend && npx vitest run`
2. Manual verification:
   - Search `#feature` → should show all snippets with that label (pinned + unpinned)
   - Search `-#shopping` → should show all snippets without that label
   - Search `#feature text` → should show snippets with label + text match (unchanged behavior)
   - Refresh page after label-only search → URL should retain `?q=%23feature`, results should persist
   - Default view (no search) → pinned section should still appear, list should exclude pinned snippets

## No Backend Changes Needed

Backend label filtering (`list_snippets_by_user` with `labels`/`exclude_labels` params) already works correctly. Verified by existing test `test_list_snippets_includes_labels_and_supports_label_filters`.
