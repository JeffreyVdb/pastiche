import { useTheme } from "@/hooks/useTheme";
import { Logo } from "@/components/ui/Logo";

export function SignIn() {
  const { resolved } = useTheme();

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background accent glow */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            resolved === "dark"
              ? "radial-gradient(circle, rgba(0,212,184,0.06) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(0,109,94,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-30%",
          left: "-15%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            resolved === "dark"
              ? "radial-gradient(circle, rgba(0,212,184,0.04) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(0,109,94,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "20px 24px",
        }}
        className="animate-fade-in"
      >
        <Logo size="sm" />
      </header>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        {/* Eyebrow tag */}
        <div
          className="animate-fade-up"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: "24px",
            opacity: 0.85,
          }}
        >
          {"// your code, curated"}
        </div>

        {/* Wordmark */}
        <div
          className="animate-fade-up delay-100"
          style={{ marginBottom: "16px" }}
        >
          <Logo size="lg" />
        </div>

        {/* Tagline */}
        <p
          className="animate-fade-up delay-200"
          style={{
            fontSize: "16px",
            color: "var(--color-text-muted)",
            textAlign: "center",
            maxWidth: "380px",
            lineHeight: 1.6,
            margin: "0 0 48px 0",
            fontWeight: 400,
          }}
        >
          A place for the fragments that matter.
          <br />
          Snippets, patterns, notes — assembled.
        </p>

        {/* CTA */}
        <div className="animate-fade-up delay-300">
          <a
            href="/api/auth/github/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "13px 28px",
              background: "var(--color-accent)",
              color: resolved === "dark" ? "#0d1117" : "#ffffff",
              textDecoration: "none",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "15px",
              letterSpacing: "-0.01em",
              transition: "transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease",
              boxShadow:
                resolved === "dark"
                  ? "0 0 0 0 rgba(0,212,184,0)"
                  : "0 0 0 0 rgba(0,109,94,0)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.transform = "translateY(-2px)";
              el.style.opacity = "0.92";
              el.style.boxShadow =
                resolved === "dark"
                  ? "0 8px 30px rgba(0,212,184,0.25)"
                  : "0 8px 30px rgba(0,109,94,0.2)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.transform = "translateY(0)";
              el.style.opacity = "1";
              el.style.boxShadow =
                resolved === "dark"
                  ? "0 0 0 0 rgba(0,212,184,0)"
                  : "0 0 0 0 rgba(0,109,94,0)";
            }}
          >
            <GitHubIcon size={18} />
            Continue with GitHub
          </a>
        </div>

        {/* Fine print */}
        <p
          className="animate-fade-up delay-400"
          style={{
            marginTop: "32px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--color-text-muted)",
            opacity: 0.6,
            textAlign: "center",
          }}
        >
          Only your GitHub username and avatar are stored.
        </p>
      </div>

      {/* Bottom watermark */}
      <div
        className="animate-fade-in delay-500"
        style={{
          padding: "20px 24px",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--color-text-muted)",
          opacity: 0.4,
        }}
      >
        pastiche — v0.1
      </div>
    </div>
  );
}

function GitHubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
