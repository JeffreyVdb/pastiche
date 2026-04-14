import type { LabelRead } from "@/types/snippet";

interface LabelPickerRowProps {
  labels: LabelRead[];
  selectedIds: Set<string>;
  onToggle: (labelId: string) => void;
}

function alphaHex(opacity: number): string {
  return Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");
}

export function LabelPickerRow({ labels, selectedIds, onToggle }: LabelPickerRowProps) {
  if (labels.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
            opacity: 0.7,
          }}
        >
          labels
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--color-text-muted)",
            opacity: 0.75,
          }}
        >
          No labels yet.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          opacity: 0.7,
        }}
      >
        labels
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {labels.map((label) => {
          const checked = selectedIds.has(label.id);
          return (
            <button
              key={label.id}
              onClick={() => onToggle(label.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                background: checked ? `${label.color}${alphaHex(0.14)}` : "transparent",
                border: `1px solid ${checked ? `${label.color}${alphaHex(0.3)}` : "transparent"}`,
                borderRadius: "7px",
                padding: "6px 8px",
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "4px",
                  border: `1px solid ${checked ? label.color : "var(--color-border)"}`,
                  background: checked ? label.color : "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "10px",
                  flexShrink: 0,
                }}
              >
                {checked ? "✓" : ""}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: checked ? label.color : "var(--color-text-muted)",
                  letterSpacing: "0.02em",
                }}
              >
                #{label.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
