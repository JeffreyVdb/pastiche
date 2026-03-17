import { Link } from "@tanstack/react-router";

export function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "var(--color-bg)",
      }}
    >
      <div
        className="animate-fade-up"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "80px",
          fontWeight: 700,
          color: "var(--color-border)",
          lineHeight: 1,
          marginBottom: "16px",
        }}
      >
        404
      </div>
      <p
        className="animate-fade-up delay-100"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          color: "var(--color-text-muted)",
          marginBottom: "32px",
        }}
      >
        {"// this snippet doesn't exist"}
      </p>
      <Link
        to="/"
        className="animate-fade-up delay-200"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          color: "var(--color-accent)",
          textDecoration: "none",
          borderBottom: "1px solid var(--color-accent-dim)",
          paddingBottom: "2px",
        }}
      >
        ← Back home
      </Link>
    </div>
  );
}
