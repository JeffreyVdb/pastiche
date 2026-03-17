import { SYNTAX_THEMES } from "@/lib/syntax-themes";
import { useTheme } from "@/hooks/useTheme";

export function ThemePicker() {
  const { themeId, setTheme } = useTheme();

  const darkThemes = SYNTAX_THEMES.filter((t) => t.category === "dark");
  const lightThemes = SYNTAX_THEMES.filter((t) => t.category === "light");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {[
        { label: "Dark", themes: darkThemes },
        { label: "Light", themes: lightThemes },
      ].map(({ label, themes }) => (
        <div key={label}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              margin: "0 0 10px 0",
              opacity: 0.6,
            }}
          >
            {label}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "8px",
            }}
          >
            {themes.map((t) => {
              const active = themeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    background: active
                      ? "var(--color-accent-dim)"
                      : "var(--color-surface)",
                    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  {/* Color swatches */}
                  <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: t.appColors.bg,
                        border: "1px solid rgba(128,128,128,0.2)",
                      }}
                    />
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: t.appColors.accent,
                        border: "1px solid rgba(128,128,128,0.2)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: active ? 600 : 500,
                      color: active ? "var(--color-accent)" : "var(--color-text)",
                      fontFamily: "var(--font-sans)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
