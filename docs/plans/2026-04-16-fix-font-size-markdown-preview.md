# Plan: Fix font size setting in markdown preview code blocks

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

## Context

Changing the code font size in Settings does not affect code blocks inside markdown previews. This affects both desktop and mobile.

The `SettingsContext` correctly sets `--font-size-code` and `--font-size-markdown` CSS variables. The editor view (`ZenOverlay`, `ViewSnippet` code mode) uses `var(--font-size-code)` — works fine. But the `MarkdownCode` component renders syntax-highlighted code blocks with hardcoded `fontSize: "0.85em"`, which is relative to the markdown preview's own font size, not the code font size setting.

## Files to change

1. **`frontend/src/components/ui/MarkdownCode.tsx`** (line 53)
2. **`frontend/src/index.css`** (line 286)

## Changes

### Task 1: Fix `MarkdownCode.tsx`

In `SyntaxHighlighter` `customStyle`, change:

```tsx
// before
fontSize: "0.85em",

// after
fontSize: "var(--font-size-code)",
```

This makes syntax-highlighted code blocks in markdown preview respect the code font size setting. Same pattern already used in `ViewSnippet.tsx:510` and `ZenOverlay.tsx:210`.

### Task 2: Fix CSS fallback for non-highlighted code

In `index.css`, update `.markdown-preview pre code` rule:

```css
/* before */
.markdown-preview pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.85em;
  color: var(--color-text);
  border-radius: 0;
}

/* after */
.markdown-preview pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: var(--font-size-code);
  color: var(--color-text);
  border-radius: 0;
}
```

Note: `SyntaxHighlighter` with `PreTag="div"` renders a `<div>`, not `<pre>`, so this CSS rule is a fallback for edge cases where `<pre><code>` is rendered without `SyntaxHighlighter` (e.g. unrecognised language). Still good to fix for consistency.

### Task 3: Verify

- Open Settings → adjust code font size slider
- View a snippet with markdown content containing fenced code blocks
- Confirm code block font size changes with the slider
- Test on mobile viewport (same behavior expected)
- Confirm inline code (`backtick`) still uses relative `0.875em` (unchanged, correct behavior)

## Why this works

- `--font-size-code` is set on `document.documentElement` by `applySettings()` in `SettingsContext.tsx`
- CSS variables in React inline styles resolve correctly (proven by `ViewSnippet.tsx:510`)
- No new CSS variables or context wiring needed — just reusing existing infrastructure
