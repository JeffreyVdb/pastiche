import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "../../hooks/useIsMobile";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "confirm",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [cancelHovered, setCancelHovered] = useState(false);
  const [confirmHovered, setConfirmHovered] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="animate-fade-in"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        background: "rgba(13,17,23,0.75)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        className={isMobile ? "animate-slide-up-bounce" : "animate-fade-up"}
        onClick={(e) => e.stopPropagation()}
        style={
          isMobile
            ? {
                background: "var(--color-surface)",
                borderTop: "1px solid var(--color-border)",
                borderRadius: "16px 16px 0 0",
                padding: "20px 24px 32px",
                width: "100%",
                maxWidth: "100%",
                margin: 0,
                boxShadow:
                  "0 0 0 1px rgba(0,212,184,0.06), 0 -8px 40px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }
            : {
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "28px 28px 24px",
                width: "100%",
                maxWidth: "420px",
                margin: "0 16px",
                boxShadow:
                  "0 0 0 1px rgba(0,212,184,0.06), 0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }
        }
      >
        {isMobile ? (
          /* Drag handle */
          <div
            style={{
              width: "36px",
              height: "4px",
              borderRadius: "2px",
              background: "var(--color-border)",
              alignSelf: "center",
              marginBottom: "4px",
            }}
          />
        ) : (
          /* Danger accent line */
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "28px",
              right: "28px",
              height: "1px",
              background:
                "linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)",
              borderRadius: "1px",
            }}
          />
        )}

        {/* Title */}
        <h2
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            color: "var(--color-text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
          }}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-muted)",
            lineHeight: 1.6,
            letterSpacing: "0.01em",
          }}
        >
          {message}
        </p>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: "var(--color-border)",
            opacity: 0.6,
          }}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onMouseEnter={() => setCancelHovered(true)}
            onMouseLeave={() => setCancelHovered(false)}
            onClick={onCancel}
            style={{
              flex: 1,
              padding: isMobile ? "12px 14px" : "8px 14px",
              background: cancelHovered ? "var(--color-accent-dim)" : "none",
              border: `1px solid ${cancelHovered ? "var(--color-accent)" : "var(--color-border)"}`,
              borderRadius: "7px",
              color: cancelHovered
                ? "var(--color-accent)"
                : "var(--color-text-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s, color 0.15s",
            }}
          >
            cancel
          </button>

          <button
            onMouseEnter={() => setConfirmHovered(true)}
            onMouseLeave={() => setConfirmHovered(false)}
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: isMobile ? "12px 14px" : "8px 14px",
              background: confirmHovered
                ? "rgba(239,68,68,0.18)"
                : "rgba(239,68,68,0.12)",
              border: `1px solid ${confirmHovered ? "rgba(239,68,68,0.7)" : "rgba(239,68,68,0.5)"}`,
              borderRadius: "7px",
              color: confirmHovered ? "rgb(255,90,90)" : "rgb(239,68,68)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s, color 0.15s",
              boxShadow: confirmHovered
                ? "0 0 12px rgba(239,68,68,0.15)"
                : "none",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
