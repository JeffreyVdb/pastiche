import { useState, useRef } from "react";
import { inputBase } from "@/components/snippets/SnippetFormFields";

interface LanguageSearchProps {
  value: string;
  onChange: (lang: string) => void;
  languages: readonly string[];
}

export function LanguageSearch({ value, onChange, languages }: LanguageSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = query
    ? languages.filter((l) => l.toLowerCase().includes(query.toLowerCase()))
    : languages;

  function handleFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFocused(true);
    setOpen(true);
    setQuery("");
  }

  function handleBlur() {
    blurTimer.current = setTimeout(() => {
      setFocused(false);
      setOpen(false);
      setQuery("");
    }, 150);
  }

  function select(lang: string) {
    onChange(lang);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length === 1) {
        select(filtered[0]);
      } else if (filtered.find((l) => l === query)) {
        select(query);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={open ? query : value}
        placeholder={value || "Search language…"}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          ...inputBase,
          borderColor: focused ? "var(--color-accent)" : "var(--color-border)",
          cursor: "text",
        }}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            maxHeight: "220px",
            overflowY: "auto",
            zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "10px 14px",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
              }}
            >
              No matches
            </div>
          ) : (
            filtered.map((lang) => (
              <div
                key={lang}
                onMouseDown={() => select(lang)}
                style={{
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  color: lang === value ? "var(--color-accent)" : "var(--color-text)",
                  background: lang === value ? "rgba(99,102,241,0.08)" : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    lang === value ? "rgba(99,102,241,0.08)" : "transparent";
                }}
              >
                {lang}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
