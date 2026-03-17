import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

export function Home() {
  const { user } = useAuth();
  const { resolved } = useTheme();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "500px",
          height: "300px",
          borderRadius: "50%",
          background:
            resolved === "dark"
              ? "radial-gradient(ellipse, rgba(0,212,184,0.05) 0%, transparent 70%)"
              : "radial-gradient(ellipse, rgba(0,109,94,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Greeting */}
      <p
        className="animate-fade-up"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--color-accent)",
          marginBottom: "20px",
          opacity: 0.8,
        }}
      >
        {"// "}
        {user?.display_name ? `hey, ${user.display_name.split(" ")[0].toLowerCase()}` : `@${user?.username}`}
      </p>

      {/* Main headline */}
      <h1
        className="animate-fade-up delay-100"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "clamp(28px, 5vw, 48px)",
          fontWeight: 600,
          color: "var(--color-text)",
          textAlign: "center",
          letterSpacing: "-0.04em",
          lineHeight: 1.1,
          maxWidth: "560px",
          margin: "0 0 20px 0",
        }}
      >
        Ready to create your
        <br />
        <span style={{ color: "var(--color-accent)" }}>first snippet?</span>
      </h1>

      {/* Subtext */}
      <p
        className="animate-fade-up delay-200"
        style={{
          fontSize: "16px",
          color: "var(--color-text-muted)",
          textAlign: "center",
          maxWidth: "400px",
          lineHeight: 1.65,
          margin: "0 0 48px 0",
          fontWeight: 400,
        }}
      >
        Capture the fragments you keep reaching for.
        Snippets, patterns, commands — all searchable, all yours.
      </p>

      {/* Empty state CTA */}
      <div className="animate-fade-up delay-300">
        <button
          disabled
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            background: "var(--color-accent-dim)",
            color: "var(--color-accent)",
            border: "1px solid var(--color-accent)",
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: "14px",
            letterSpacing: "-0.01em",
            cursor: "not-allowed",
            opacity: 0.7,
            fontFamily: "var(--font-sans)",
          }}
        >
          <span style={{ fontSize: "16px" }}>+</span>
          New Snippet
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              opacity: 0.6,
              marginLeft: "4px",
            }}
          >
            coming soon
          </span>
        </button>
      </div>

      {/* Decorative code snippet preview */}
      <div
        className="animate-fade-up delay-400"
        style={{
          marginTop: "64px",
          maxWidth: "480px",
          width: "100%",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          overflow: "hidden",
          opacity: 0.6,
        }}
      >
        {/* Window chrome */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 14px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface-2)",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "var(--color-border)",
            }}
          />
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "var(--color-border)",
            }}
          />
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "var(--color-border)",
            }}
          />
          <span
            style={{
              marginLeft: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-muted)",
            }}
          >
            your-first-snippet.ts
          </span>
        </div>

        {/* Code */}
        <pre
          style={{
            margin: 0,
            padding: "16px 18px",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            lineHeight: 1.7,
            color: "var(--color-text-muted)",
            overflow: "hidden",
          }}
        >
          <span style={{ color: "var(--color-text-muted)", opacity: 0.5 }}>{"// waiting for you...\n"}</span>
          <span style={{ color: "var(--color-accent)" }}>{"const "}</span>
          <span style={{ color: "var(--color-text)" }}>{"snippet"}</span>
          <span style={{ color: "var(--color-text-muted)" }}>{" = {"}</span>
          {"\n"}
          <span style={{ color: "var(--color-text-muted)" }}>{"  title: "}</span>
          <span style={{ color: "var(--color-accent)", opacity: 0.7 }}>{"'...'"}</span>
          <span style={{ color: "var(--color-text-muted)" }}>{","}</span>
          {"\n"}
          <span style={{ color: "var(--color-text-muted)" }}>{"}"}</span>
        </pre>
      </div>
    </div>
  );
}
