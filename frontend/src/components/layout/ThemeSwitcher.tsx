import { useTheme } from "@/hooks/useTheme";
import type { ThemeMode } from "@/contexts/ThemeContext";

const segments: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "system", label: "System", icon: "⬛" },
  { value: "dark", label: "Dark", icon: "☾" },
];

export function ThemeSwitcher() {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme selector"
      style={{
        display: "inline-flex",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        padding: "2px",
        gap: "2px",
      }}
    >
      {segments.map(({ value, label, icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            onClick={() => setMode(value)}
            aria-label={label}
            title={label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "28px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              lineHeight: 1,
              transition: "background 0.15s ease, color 0.15s ease",
              background: active ? "var(--color-accent-dim)" : "transparent",
              color: active ? "var(--color-accent)" : "var(--color-text-muted)",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--color-text)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--color-text-muted)";
              }
            }}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
