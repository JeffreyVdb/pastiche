import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/useIsMobile";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const isMobile = useIsMobile();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [position, onClose]);

  // Boundary-aware positioning for desktop floating panel
  useEffect(() => {
    if (!menuRef.current || isMobile || !position) return;
    const rect = menuRef.current.getBoundingClientRect();
    const el = menuRef.current;
    if (rect.right > window.innerWidth - 8) {
      el.style.left = `${position.x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight - 8) {
      el.style.top = `${position.y - rect.height}px`;
    }
  }, [position, isMobile]);

  if (!position) return null;

  const handleItemClick = (item: ContextMenuItem) => {
    item.onClick();
    onClose();
  };

  if (isMobile) {
    return createPortal(
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          backdropFilter: "blur(4px)",
          backgroundColor: "rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          role="menu"
          style={{
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            borderRadius: "16px 16px 0 0",
            padding: "12px 0 max(32px, env(safe-area-inset-bottom))",
            animation: "slide-up-bounce 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Drag handle */}
          <div style={{ width: "36px", height: "4px", background: "var(--color-border)", borderRadius: "2px", margin: "0 auto 16px" }} />
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={() => handleItemClick(item)}
              style={{
                display: "block",
                width: "100%",
                padding: "14px 20px",
                background: "none",
                border: "none",
                textAlign: "left",
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
                cursor: "pointer",
                color: item.variant === "danger" ? "rgb(239,68,68)" : "var(--color-text)",
                letterSpacing: "0.02em",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>,
      document.body
    );
  }

  // Desktop: floating panel at cursor position, boundary-aware
  return createPortal(
    <>
      {/* Invisible backdrop to catch click-outside */}
      <div
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
      />
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 1000,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "10px",
          padding: "4px",
          minWidth: "160px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            role="menuitem"
            onClick={() => handleItemClick(item)}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 12px",
              background: "none",
              border: "none",
              borderRadius: "7px",
              textAlign: "left",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              cursor: "pointer",
              color: item.variant === "danger" ? "rgb(239,68,68)" : "var(--color-text-muted)",
              letterSpacing: "0.04em",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = item.variant === "danger" ? "rgba(239,68,68,0.1)" : "var(--color-accent-dim)";
              el.style.color = item.variant === "danger" ? "rgb(239,68,68)" : "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = "none";
              el.style.color = item.variant === "danger" ? "rgb(239,68,68)" : "var(--color-text-muted)";
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body
  );
}
