import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/ui/Logo";
import { HamburgerMenu } from "./HamburgerMenu";

export function TopBar() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          height: "56px",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          background: "color-mix(in srgb, var(--color-bg) 80%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none" }}>
          <Logo size="sm" />
        </Link>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Desktop: settings link + avatar */}
        <div
          className="desktop-controls"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Link
            to="/settings"
            aria-label="Settings"
            title="Settings"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              color: "var(--color-text-muted)",
              textDecoration: "none",
              fontFamily: "var(--font-mono)",
              fontSize: "18px",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text-muted)";
            }}
          >
            ⚙
          </Link>

          {user && (
            <img
              src={user.avatar_url ?? `https://github.com/${user.username}.png`}
              alt={user.username}
              title={`@${user.username}`}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                border: "1.5px solid var(--color-border)",
                cursor: "pointer",
              }}
            />
          )}
        </div>

        {/* Mobile: hamburger */}
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="hamburger-btn"
          style={{
            display: "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text)",
            padding: "6px",
            flexDirection: "column",
            gap: "4px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              display: "block",
              width: "18px",
              height: "1.5px",
              background: "currentColor",
            }}
          />
          <span
            style={{
              display: "block",
              width: "18px",
              height: "1.5px",
              background: "currentColor",
            }}
          />
          <span
            style={{
              display: "block",
              width: "12px",
              height: "1.5px",
              background: "currentColor",
              alignSelf: "flex-start",
            }}
          />
        </button>
      </header>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .desktop-controls { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
