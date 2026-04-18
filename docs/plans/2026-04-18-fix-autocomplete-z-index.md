# Plan: fix z-index issues autocomplete label

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

## Problem

The label autocomplete dropdown in `SnippetSearchControl` renders behind snippet cards. Typing `#` in the search bar triggers a dropdown with label suggestions, but it appears under the snippet grid below.

## Root Cause

Stacking context conflict in `Home.tsx`. The page layout creates two sibling stacking contexts with equal `zIndex: 1`:

```
<div>  // flex column, root stacking context
  <div style={{ position: "relative", zIndex: 1 }}>  // HEADER (lines 716-832)
    <SnippetSearchControl />                           // dropdown: absolute, z-index: 100
  </div>
  <div style={{ position: "relative", zIndex: 1 }}>  // SNIPPET LIST (lines 834+)
    <SnippetCard /> × many
  </div>
</div>
```

When siblings share the same `z-index`, DOM order decides paint order — later element wins. The snippet list section paints **on top of** the header section, trapping the dropdown behind it. The dropdown's `z-index: 100` is scoped to its parent stacking context and cannot escape.

Additionally, `animate-snippet-search-reveal` applies a CSS `transform` on the input wrapper div (line 150 in `SnippetSearchControl.tsx`), creating yet another nested stacking context that further constrains the dropdown.

## Fix

**Single change:** Increase the header section's `zIndex` from `1` to `10` in `Home.tsx` (line 723).

```tsx
// Home.tsx line 716-724 — header section
<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: isMobile && searchOpen ? "14px" : "0",
    marginBottom: "36px",
    position: "relative",
    zIndex: 10,  // was: 1
  }}
>
```

This ensures the header (and its child dropdown) always renders above the snippet list section.

## Files to Modify

1. `frontend/src/pages/Home.tsx` — change `zIndex: 1` → `zIndex: 10` on header wrapper div

## Verification

1. Open Pastiche frontend in browser
2. Type `#` in the search bar
3. Confirm autocomplete dropdown appears **above** all snippet cards
4. Test with cards at various scroll positions
5. Test mobile view (the mobile SnippetSearchControl renders inside same header div, so same fix applies)

## Why Not Portal?

ContextMenu already uses `createPortal` to render at `document.body`. Could do the same for the autocomplete dropdown, but it's overkill here — the dropdown is always within the header area and only needs to beat the sibling content section. Fixing the parent z-index is simpler and keeps the DOM hierarchy clean.
