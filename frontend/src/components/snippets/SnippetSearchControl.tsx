import { useEffect, useRef } from "react";
import { inputBase } from "@/components/snippets/SnippetFormFields";

interface SnippetSearchControlProps {
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

function SearchIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function SnippetSearchControl({
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

  useEffect(() => {
    if (!open || !showInput) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [open, showInput]);

  const input = open && showInput ? (
    <div
      className="animate-snippet-search-reveal"
      style={{
        position: "relative",
        flex: isMobile ? "1 1 100%" : "0 1 280px",
        minWidth: isMobile ? "100%" : "220px",
        transformOrigin: isMobile ? "top center" : "top right",
      }}
    >
      <input
        ref={inputRef}
        type="search"
        value={value}
        placeholder="Search snippets"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
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
