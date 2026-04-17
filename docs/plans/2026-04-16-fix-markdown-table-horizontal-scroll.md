# Plan: Fix horizontal scrolling for markdown tables on mobile

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Prevent wide markdown tables from causing horizontal scrolling on the entire page. Tables should scroll independently within their container.

**Architecture:** CSS-only fix — add `overflow-x: auto` wrapper around tables in `.markdown-preview`. Remove `width: 100%` from tables so they can be naturally wider than viewport without pushing page layout.

**Tech Stack:** CSS (single file: `frontend/src/index.css`)

---

## Root Cause

`src/index.css:311-316` — `.markdown-preview table` has `width: 100%`. Wide tables with many columns expand past viewport. No `overflow-x: auto` on parent, so `<body>` scrolls horizontally.

Contrast with `pre` blocks (line 286) which already have `overflow-x: auto` — tables need same treatment.

Affected components:
- `ViewSnippet.tsx` — preview mode uses `<div className="markdown-preview">`
- `ZenOverlay.tsx` — zen mode uses `<div className="markdown-preview">`

---

### Task 1: Fix table overflow in CSS

**Objective:** Make tables scroll horizontally within their container, not the page.

**Files:**
- Modify: `frontend/src/index.css:311-316`

**Step 1: Edit `.markdown-preview table` rule**

Replace:

```css
.markdown-preview table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.25em 0;
  font-size: 0.9em;
}
```

With:

```css
.markdown-preview table {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 1.25em 0;
  font-size: 0.9em;
}
```

Changes:
- `display: block` — makes table a block container that can scroll
- `width: max-content` — table takes its natural width (not forced to 100%)
- `max-width: 100%` — prevents table from exceeding parent on initial render
- `overflow-x: auto` — horizontal scroll appears only when table exceeds container

**Step 2: Verify in browser**

Open a snippet with a wide table in preview mode (mobile viewport). Table should scroll horizontally. Page should NOT scroll horizontally.

**Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "fix: prevent horizontal scroll on wide markdown tables"
```

---

### Task 2: Verify no regression in zen mode

**Objective:** Confirm zen mode table rendering still works.

**Files:**
- Modify: `frontend/src/components/ui/ZenOverlay.tsx` (read-only, no changes expected)

**Step 1: Open zen mode with table content**

ZenOverlay already has `overflowX: "hidden"` on the outer container (line 108). The `display: block` + `overflow-x: auto` on `.markdown-preview table` should work within this context — the table scrolls internally.

**Step 2: Test visually**

Open a wide-table snippet → enter zen → confirm table scrolls within container, page doesn't scroll.

**Step 3: Commit (no changes expected)**

If no changes needed, skip commit. If ZenOverlay needs `overflow-x: hidden` added to the content div to prevent edge cases:

```css
/* In ZenOverlay's content style, add: */
overflowX: "hidden"
```

---

### Task 3: Verify no regression with normal-width tables

**Objective:** Tables that fit within viewport should still render full-width and look normal.

**Step 1:** Open a snippet with a narrow table (2-3 columns).

**Step 2:** Confirm table fills available width and looks unchanged.

**Step 3:** No commit needed if no issues.

---

## Verification Checklist

- [ ] Wide tables scroll horizontally within container
- [ ] Page never scrolls horizontally (mobile viewport)
- [ ] Narrow tables still fill available width
- [ ] Zen mode works correctly
- [ ] No visual change to code blocks (they already have `overflow-x: auto`)
- [ ] Desktop layout unchanged
