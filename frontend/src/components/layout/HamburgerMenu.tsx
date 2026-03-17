import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
}

export function HamburgerMenu({ open, onClose }: HamburgerMenuProps) {
  const { user, logout } = useAuth();

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
          animation: "fade-in 0.2s ease both",
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(320px, 85vw)",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          padding: "0",
          animation: "slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--color-text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Menu
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              fontSize: "20px",
              lineHeight: 1,
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* User info */}
        {user && (
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.username}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "2px solid var(--color-border)",
                }}
              />
            )}
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "var(--color-text)",
                }}
              >
                {user.display_name ?? user.username}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                }}
              >
                @{user.username}
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ padding: "16px 8px", flex: 1 }}>
          <Link
            to="/"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "8px",
              color: "var(--color-text)",
              textDecoration: "none",
              fontSize: "15px",
              fontWeight: 500,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent)" }}>~/</span>
            Home
          </Link>
          <Link
            to="/snippets/new"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "8px",
              color: "var(--color-text)",
              textDecoration: "none",
              fontSize: "15px",
              fontWeight: 500,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent)" }}>+</span>
            New Snippet
          </Link>
          <Link
            to="/settings"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "8px",
              color: "var(--color-text)",
              textDecoration: "none",
              fontSize: "15px",
              fontWeight: 500,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent)" }}>*</span>
            Settings
          </Link>
          <Link
            to="/docs"
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "8px",
              color: "var(--color-text)",
              textDecoration: "none",
              fontSize: "15px",
              fontWeight: 500,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent)" }}>?</span>
            API Docs
          </Link>
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {user && (
            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              style={{
                background: "none",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                fontSize: "13px",
                fontFamily: "var(--font-mono)",
                padding: "6px 12px",
                transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.color = "var(--color-text)";
                el.style.borderColor = "var(--color-text-muted)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.color = "var(--color-text-muted)";
                el.style.borderColor = "var(--color-border)";
              }}
            >
              sign out
            </button>
          )}
        </div>
      </div>
    </>
  );
}
