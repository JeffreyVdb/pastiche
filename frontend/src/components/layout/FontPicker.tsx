import { useEffect } from "react";
import { type AppFont, ensureFontLoaded } from "@/lib/fonts";

interface FontPickerProps {
  fonts: AppFont[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function FontPicker({ fonts, selectedId, onSelect }: FontPickerProps) {
  useEffect(() => {
    fonts.forEach(ensureFontLoaded);
  }, [fonts]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: "8px",
      }}
    >
      {fonts.map((font) => {
        const active = selectedId === font.id;
        return (
          <button
            key={font.id}
            onClick={() => onSelect(font.id)}
            style={{
              padding: "10px 14px",
              background: active ? "var(--color-accent-dim)" : "var(--color-surface)",
              border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
              borderRadius: "10px",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: active ? 600 : 500,
                color: active ? "var(--color-accent)" : "var(--color-text)",
                fontFamily: `"${font.family}", ${font.fallback}`,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {font.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
