import { SNIPPET_COLORS, SNIPPET_COLOR_KEYS } from "@/lib/snippet-colors";

interface ColorPickerRowProps {
  currentColor: string | null;
  onSelect: (color: string | null) => void;
}

export function ColorPickerRow({ currentColor, onSelect }: ColorPickerRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {SNIPPET_COLOR_KEYS.map((key) => {
        const isActive = currentColor === key;
        return (
          <button
            key={key}
            title={SNIPPET_COLORS[key].label}
            onClick={() => onSelect(key)}
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: SNIPPET_COLORS[key].swatch,
              border: isActive ? "2px solid var(--color-text)" : "2px solid transparent",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: isActive ? "0 0 0 1px var(--color-text)" : "none",
            }}
          >
            {isActive && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        );
      })}

      {/* Reset circle */}
      <button
        title="No color"
        onClick={() => onSelect(null)}
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "none",
          border: currentColor === null ? "2px solid var(--color-text)" : "2px solid var(--color-border)",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Diagonal line through the circle */}
        <svg width="16" height="16" viewBox="0 0 16 16" style={{ position: "absolute" }}>
          <line x1="3" y1="13" x2="13" y2="3" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
