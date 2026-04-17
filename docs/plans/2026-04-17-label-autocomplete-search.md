# Plan: Label Autocomplete in Search Textfield

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

## TL;DR

Add `#`-triggered label autocomplete dropdown to the snippet search input. When user types `#`, show matching labels (max 8). Selecting a label inserts `#labelname` into the search query. Frontend-only change — no backend or API work needed.

## Context

Currently, users can filter snippets by typing `#labelname` in the search field (parsed by `LABEL_TOKEN_RE` in `snippet-search.ts`). But there's no discoverability — users must know exact label names. This plan adds an autocomplete popup that appears when `#` is typed, showing matching labels from the user's existing label list.

## Architecture

```
┌─────────────────────────────────────┐
│  Home.tsx                           │
│  ┌───────────────────────────────┐  │
│  │  SnippetSearchControl         │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │ <input>                 │  │  │
│  │  └─────────────────────────┘  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │ LabelAutocomplete       │  │  │  ← dropdown overlay
│  │  │  - feature              │  │  │
│  │  │  - frontend             │  │  │
│  │  │  - bug                  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
│  allLabels: LabelRead[] (existing)  │
└─────────────────────────────────────┘
```

## Files to modify

| File | Change |
|------|--------|
| `frontend/src/components/snippets/SnippetSearchControl.tsx` | Add `allLabels` prop, cursor-aware `#` detection, dropdown UI, keyboard nav |
| `frontend/src/pages/Home.tsx` | Pass `allLabels` to both `<SnippetSearchControl>` instances (~line 787, 817) |

## Implementation details

### Task 1: Extend SnippetSearchControl props

Add `allLabels: LabelRead[]` to `SnippetSearchControlProps` interface (line 4).

Import `LabelRead` from `@/types/snippet` and `useCallback, useMemo, useState, useEffect` as needed.

### Task 2: Detect active `#` token at cursor

Inside `SnippetSearchControl`, on each keystroke / cursor change:

```typescript
function getActiveLabelToken(value: string, cursorPos: number): { query: string; start: number; end: number } | null {
  // Walk backwards from cursor to find `#`
  // Return null if cursor is not inside a `#...` token
  // `#` must be preceded by start-of-string or whitespace
  // `end` = cursorPos, `start` = position of `#`
}
```

Trigger: use `onKeyUp` + `onClick` on the `<input>` to track `selectionStart`. Store cursor position in a ref.

### Task 3: Filter labels

```typescript
const activeToken = getActiveLabelToken(value, cursorPos);
const suggestions = useMemo(() => {
  if (!activeToken) return [];
  const q = activeToken.query.toLowerCase();
  return allLabels
    .filter(l => l.name.toLowerCase().includes(q))
    .slice(0, 8);
}, [activeToken, allLabels]);
```

### Task 4: Dropdown UI

Render below the `<input>` when `suggestions.length > 0`:

- Position: `absolute`, `top: 100% + 4px`, same width as input
- Style: match existing LanguageSearch dropdown (surface bg, border, border-radius, shadow, z-index 100)
- Each item: label name + optional color dot, monospace font, hover highlight
- Max height: ~200px with overflow scroll

### Task 5: Selection behavior

On selecting a label (click or Enter):

```typescript
function selectLabel(labelName: string) {
  if (!activeToken) return;
  const before = value.slice(0, activeToken.start);
  const after = value.slice(activeToken.end);
  const replacement = `#${labelName} `;
  onChange(before + replacement + after);
  // Restore cursor after replacement
  const newPos = before.length + replacement.length;
  requestAnimationFrame(() => {
    inputRef.current?.setSelectionRange(newPos, newPos);
  });
}
```

### Task 6: Keyboard navigation

- **ArrowDown / ArrowUp**: cycle through suggestions
- **Enter**: select highlighted suggestion (prevent `onCommitNow` when dropdown open)
- **Escape**: dismiss dropdown
- **Tab**: select first suggestion if any

Track `highlightedIndex` state. Reset to 0 when suggestions change.

### Task 7: Wire up in Home.tsx

Pass `allLabels={allLabels}` to both `<SnippetSearchControl>` render sites (~line 787 and line 817).

### Task 8: Mobile styling

- Dropdown should not overflow viewport width
- Touch-friendly row height (min 44px tap target)
- Ensure dropdown scrolls within viewport on small screens
- Consider `position: fixed` + calculated position for mobile to avoid keyboard overlap issues

## Tradeoffs

| Decision | Choice | Why |
|----------|--------|-----|
| Where to detect `#` | In SnippetSearchControl | Keeps input + dropdown tightly coupled, no need to expose cursor position to parent |
| How to track cursor | `onKeyUp` + `onClick` refs | `selectionStart` not available in `onChange` handler reliably |
| Label data source | `allLabels` prop from parent | Already fetched in Home.tsx — no new API calls |
| Max items | 8 | User spec. Enough to be useful, not overwhelming |
| Exclude already-used labels | No | User may want to search by multiple labels, or verify a label exists |

## Tests

### Unit tests (new file: `frontend/src/components/snippets/SnippetSearchControl.test.tsx`)

1. **No dropdown when no `#`** — render with `allLabels`, verify no dropdown appears
2. **Dropdown appears on `#`** — type `#` into input, verify dropdown with all labels
3. **Filters by partial** — type `#fea`, verify only matching labels shown
4. **Max 8 items** — create 20 labels, type `#`, verify only 8 shown
5. **Selection replaces token** — click "feature" label, verify input value becomes `#feature `
6. **Keyboard nav** — ArrowDown + Enter selects second item
7. **Escape dismisses** — type `#`, press Escape, verify dropdown hidden
8. **Works with prefix** — existing `some text #fea` — autocomplete should activate for `#fea`

### Existing tests to verify

- `frontend/src/lib/snippet-search.ts` tests should still pass (no changes to parsing logic)

## Verification

1. `pnpm test` — all existing + new tests pass
2. `pnpm build` — no type errors
3. Manual:
   - Open search, type `#` → dropdown shows all labels
   - Type `#fea` → filters to matching
   - Click a label → `#feature ` inserted, cursor after it
   - Press Enter with dropdown open → selects, doesn't commit search
   - Press Escape → dropdown closes
   - Mobile: dropdown renders within viewport, tap targets are comfortable

## Out of scope

- Android keyboard toolbar integration (requires Input Method API / native PWA hooks — separate investigation)
- Exclude-label prefix `!#` or `-#` autocomplete (can add later)
- Label creation from search (would need inline create flow)
