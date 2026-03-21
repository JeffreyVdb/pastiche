import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface OverflowMenuItem {
  label: string;
  onClick: () => void;
  active?: boolean;
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
}

export function OverflowMenu({ items }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Body scroll lock when open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Focus first item when menu opens
  useEffect(() => {
    if (open) {
      // Use rAF to ensure the portal has rendered before focusing
      const id = requestAnimationFrame(() => {
        firstItemRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="More actions"
        onMouseEnter={() => setTriggerHovered(true)}
        onMouseLeave={() => setTriggerHovered(false)}
        style={{
          padding: "6px 16px",
          background: triggerHovered ? "var(--color-accent-dim)" : "none",
          border: `1px solid ${triggerHovered ? "var(--color-accent)" : "var(--color-border)"}`,
          borderRadius: "8px",
          color: triggerHovered ? "var(--color-accent)" : "var(--color-text-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          cursor: "pointer",
          letterSpacing: "0.04em",
          transition: "background 0.15s, border-color 0.15s, color 0.15s",
        }}
      >
        ···
      </button>

      {open &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                zIndex: 999,
              }}
            />

            {/* Bottom sheet panel */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label="More actions"
              className="animate-slide-up-bounce"
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                background: "var(--color-surface)",
                borderTop: "1px solid var(--color-border)",
                borderRadius: "16px 16px 0 0",
                zIndex: 1000,
                paddingBottom: "max(20px, env(safe-area-inset-bottom))",
              }}
            >
              {/* Drag handle */}
              <div
                style={{
                  width: "36px",
                  height: "4px",
                  background: "var(--color-border)",
                  borderRadius: "2px",
                  margin: "12px auto 4px",
                }}
              />

              {/* Menu items */}
              <div role="menu">
                {items.map((item, index) => (
                  <MenuItem
                    key={item.label}
                    item={item}
                    ref={index === 0 ? firstItemRef : undefined}
                    onSelect={() => {
                      item.onClick();
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

interface MenuItemProps {
  item: OverflowMenuItem;
  onSelect: () => void;
  ref?: React.Ref<HTMLButtonElement>;
}

function MenuItem({ item, onSelect, ref }: MenuItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      ref={ref}
      role="menuitem"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "15px 20px",
        width: "100%",
        background: hovered ? "var(--color-surface-2)" : "none",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--font-mono)",
        fontSize: "14px",
        letterSpacing: "0.04em",
        color: item.active ? "var(--color-accent)" : "var(--color-text-muted)",
        transition: "background 0.15s",
      }}
    >
      {item.label}
    </button>
  );
}
