import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { inputBase } from "@/components/snippets/SnippetFormFields";
import type { LabelRead } from "@/types/snippet";

interface SnippetSearchControlProps {
  allLabels: LabelRead[];
  isMobile: boolean;
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onOpen: () => void;
  onClose: () => void;
  onClear: () => void;
  onCommitNow: () => void;
  showTrigger?: boolean;
  showInput?: boolean;
}

interface ActiveLabelToken {
  query: string;
  start: number;
  end: number;
}

function SearchIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function getActiveLabelToken(value: string, cursorPos: number): ActiveLabelToken | null {
  if (cursorPos < 0 || cursorPos > value.length) return null;

  let start = cursorPos;
  while (start > 0 && !/\s/.test(value[start - 1] ?? "")) {
    start -= 1;
  }

  let end = cursorPos;
  while (end < value.length && !/\s/.test(value[end] ?? "")) {
    end += 1;
  }

  const tokenPrefix = value.slice(start, cursorPos);
  const token = value.slice(start, end);
  if (!tokenPrefix.startsWith("#")) return null;
  if (!token.startsWith("#")) return null;
  if (token.length > 1 && /\s/.test(token)) return null;
  if (start > 0 && !/\s/.test(value[start - 1] ?? "")) return null;

  return {
    query: tokenPrefix.slice(1),
    start,
    end,
  };
}

export function SnippetSearchControl({
  allLabels,
  isMobile,
  open,
  value,
  onChange,
  onOpen,
  onClose,
  onClear,
  onCommitNow,
  showTrigger = true,
  showInput = true,
}: SnippetSearchControlProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [cursorPos, setCursorPos] = useState(value.length);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dismissedTokenKey, setDismissedTokenKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !showInput) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [open, showInput]);

  useEffect(() => {
    const nextCursor = Math.min(cursorPos, value.length);
    if (nextCursor !== cursorPos) {
      setCursorPos(nextCursor);
    }
  }, [cursorPos, value.length]);

  const activeToken = useMemo(() => getActiveLabelToken(value, cursorPos), [cursorPos, value]);
  const activeTokenKey = activeToken
    ? `${activeToken.start}:${activeToken.end}:${activeToken.query.toLowerCase()}`
    : null;

  const suggestions = useMemo(() => {
    if (!activeToken) return [];
    const query = activeToken.query.toLowerCase();
    return allLabels
      .filter((label) => label.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [activeToken, allLabels]);

  const isDropdownOpen =
    open &&
    showInput &&
    Boolean(activeTokenKey) &&
    dismissedTokenKey !== activeTokenKey &&
    suggestions.length > 0;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [activeTokenKey, suggestions.length]);

  const updateCursorFromInput = useCallback(() => {
    const nextCursor = inputRef.current?.selectionStart ?? 0;
    setCursorPos(nextCursor);
    const nextTokenKey = getActiveLabelToken(inputRef.current?.value ?? value, nextCursor);
    if (!nextTokenKey) {
      setDismissedTokenKey(null);
    }
  }, [value]);

  const selectLabel = useCallback(
    (labelName: string) => {
      if (!activeToken) return;
      const before = value.slice(0, activeToken.start);
      const after = value.slice(activeToken.end);
      const needsTrailingSpace = after.length === 0 || !/^\s/.test(after);
      const replacement = `#${labelName}${needsTrailingSpace ? " " : ""}`;
      const nextValue = `${before}${replacement}${after}`;
      const nextCursorPos = before.length + replacement.length;

      onChange(nextValue);
      setCursorPos(nextCursorPos);
      setDismissedTokenKey(null);
      setHighlightedIndex(0);

      requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true });
        inputRef.current?.setSelectionRange(nextCursorPos, nextCursorPos);
      });
    },
    [activeToken, onChange, value],
  );

  const input = open && showInput ? (
    <div
      className="animate-snippet-search-reveal"
      style={{
        position: "relative",
        flex: isMobile ? "1 1 100%" : "0 1 280px",
        minWidth: isMobile ? "100%" : "220px",
        maxWidth: isMobile ? "calc(100vw - 48px)" : undefined,
        transformOrigin: isMobile ? "top center" : "top right",
      }}
    >
      <input
        ref={inputRef}
        type="search"
        value={value}
        placeholder="Search snippets"
        onChange={(e) => {
          onChange(e.target.value);
          setCursorPos(e.target.selectionStart ?? e.target.value.length);
          setDismissedTokenKey(null);
        }}
        onClick={updateCursorFromInput}
        onKeyUp={updateCursorFromInput}
        onKeyDown={(e) => {
          if (isDropdownOpen) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightedIndex((index) => (index + 1) % suggestions.length);
              return;
            }

            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightedIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
              return;
            }

            if (e.key === "Enter") {
              e.preventDefault();
              selectLabel(suggestions[highlightedIndex]?.name ?? suggestions[0].name);
              return;
            }

            if (e.key === "Tab") {
              e.preventDefault();
              selectLabel(suggestions[0].name);
              return;
            }

            if (e.key === "Escape") {
              e.preventDefault();
              setDismissedTokenKey(activeTokenKey);
              return;
            }
          }

          if (e.key === "Enter") {
            e.preventDefault();
            onCommitNow();
            return;
          }

          if (e.key === "Escape") {
            e.preventDefault();
            if (value.trim()) {
              onClear();
            } else {
              onClose();
              triggerRef.current?.focus();
            }
          }
        }}
        style={{
          ...inputBase,
          paddingLeft: "38px",
          paddingRight: value ? "38px" : "14px",
          borderColor: "var(--color-accent)",
          background: "var(--color-surface)",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: "12px",
          transform: "translateY(-50%)",
          color: "var(--color-text-muted)",
          display: "inline-flex",
          pointerEvents: "none",
        }}
      >
        <SearchIcon />
      </span>
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          style={{
            position: "absolute",
            top: "50%",
            right: "8px",
            transform: "translateY(-50%)",
            width: "24px",
            height: "24px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            borderRadius: "999px",
            background: "transparent",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "16px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
      {isDropdownOpen && (
        <div
          role="listbox"
          aria-label="Label suggestions"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxWidth: "100%",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            maxHeight: "200px",
            overflowY: "auto",
            zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          {suggestions.map((label, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <button
                key={label.id}
                type="button"
                data-testid="label-suggestion"
                role="option"
                aria-selected={isHighlighted}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectLabel(label.name);
                }}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border: "none",
                  background: isHighlighted ? "rgba(99,102,241,0.12)" : "transparent",
                  color: isHighlighted ? "var(--color-accent)" : "var(--color-text)",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  textAlign: "left",
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "999px",
                    background: label.color,
                    flexShrink: 0,
                  }}
                />
                <span>{label.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      {!isMobile && input}

      {showTrigger && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (open) {
              onClear();
              onClose();
              return;
            }
            onOpen();
          }}
          aria-label={open ? "Discard search" : "Open search"}
          title={open ? "Discard search" : "Search"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            padding: "8px",
            boxSizing: "border-box",
            borderRadius: "8px",
            border: `1px solid ${open ? "var(--color-accent)" : "var(--color-border)"}`,
            background: open ? "var(--color-accent-dim)" : "var(--color-surface)",
            color: open ? "var(--color-accent)" : "var(--color-text-muted)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "border-color 0.15s, color 0.15s, background 0.15s",
          }}
        >
          <SearchIcon />
        </button>
      )}

      {isMobile && input}
    </>
  );
}
