import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { Link } from "@tanstack/react-router";
import { useTheme } from "@/hooks/useTheme";

export function Docs() {
  const { resolved, theme } = useTheme();
  const c = theme.appColors;

  const customCss = `
    :root {
      --scalar-background-1: ${c.bg};
      --scalar-background-2: ${c.surface};
      --scalar-background-3: ${c.surface2};
      --scalar-border-color: ${c.border};
      --scalar-color-1: ${c.text};
      --scalar-color-2: ${c.textMuted};
      --scalar-color-3: ${c.textMuted};
      --scalar-color-accent: ${c.accent};
      --scalar-font: var(--font-sans);
      --scalar-font-code: var(--font-mono);
    }
  `;

  return (
    <div style={{ position: "relative" }}>
      <Link
        to="/"
        style={{
          position: "fixed",
          top: "16px",
          left: "16px",
          zIndex: 100,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: "6px",
          color: c.textMuted,
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          textDecoration: "none",
          transition: "color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.color = c.text;
          el.style.borderColor = c.textMuted;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.color = c.textMuted;
          el.style.borderColor = c.border;
        }}
      >
        ← back
      </Link>

      <ApiReferenceReact
        configuration={{
          url: "/openapi.json",
          darkMode: resolved === "dark",
          theme: "none",
          hideDarkModeToggle: true,
          withDefaultFonts: false,
          layout: "modern",
          customCss,
        }}
      />
    </div>
  );
}
