import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { SnippetListItem } from "@/types/snippet";
import { formatSize } from "@/lib/format-size";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { ColorPickerRow } from "@/components/ui/ColorPickerRow";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTheme } from "@/hooks/useTheme";
import { getSnippetColorStyle } from "@/lib/snippet-colors";

interface SnippetCardProps {
  snippet: SnippetListItem;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  animateEntrance?: boolean;
}

function PinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
    </svg>
  );
}

export function SnippetCard({ snippet, onDelete, onTogglePin, onColorChange, animateEntrance }: SnippetCardProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { resolved } = useTheme();
  const colorStyle = getSnippetColorStyle(snippet.color, resolved);
  const [hovered, setHovered] = useState(false);
  const [kebabHovered, setKebabHovered] = useState(false);
  const [pinHovered, setPinHovered] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [pinFocused, setPinFocused] = useState(false);

  const contextMenuItems: ContextMenuItem[] = [
    {
      label: snippet.is_pinned ? "unpin" : "pin",
      onClick: () => onTogglePin(snippet.id),
    },
    {
      label: "copy link",
      onClick: () => {
        navigator.clipboard.writeText(`${window.location.origin}/s/${snippet.short_code}`);
      },
    },
    {
      label: "edit",
      onClick: () => navigate({ to: "/snippets/$snippetId/edit", params: { snippetId: snippet.id } }),
    },
    {
      label: "delete",
      onClick: () => setConfirmOpen(true),
      variant: "danger",
    },
  ];

  const showPin = snippet.is_pinned || (!isMobile && (hovered || pinHovered || pinFocused));

  return (
    <>
    <Link
      to="/snippets/$snippetId"
      params={{ snippetId: snippet.id }}
      style={{ textDecoration: "none", display: "block" }}
    >
    <div
      className={animateEntrance ? "animate-snippet-enter" : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
      }}
      style={{
        background: colorStyle.background ?? "var(--color-surface)",
        border: `1px solid ${hovered ? "var(--color-accent)" : (colorStyle.borderColor as string | undefined) ?? "var(--color-border)"}`,
        borderRadius: "12px",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "border-color 0.18s ease, box-shadow 0.18s ease",
        boxShadow: hovered
          ? "0 0 0 1px var(--color-accent-dim), 0 4px 20px rgba(0,0,0,0.15)"
          : "0 1px 4px rgba(0,0,0,0.08)",
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--color-text)",
            fontFamily: "var(--font-sans)",
            letterSpacing: "-0.02em",
            lineHeight: 1.35,
            flex: 1,
            minWidth: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {snippet.title}
        </h3>

        {/* Language badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: "5px",
            background: "var(--color-accent-dim)",
            color: "var(--color-accent)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.03em",
            flexShrink: 0,
          }}
        >
          {snippet.language}
        </span>

        {/* Kebab menu button */}
        <button
          onMouseEnter={() => setKebabHovered(true)}
          onMouseLeave={() => setKebabHovered(false)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setContextMenuPos({ x: rect.left, y: rect.bottom + 4 });
          }}
          style={{
            flexShrink: 0,
            padding: "2px 6px",
            background: kebabHovered ? "var(--color-accent-dim)" : "none",
            border: `1px solid ${kebabHovered ? "var(--color-accent)" : "transparent"}`,
            borderRadius: "5px",
            color: kebabHovered ? "var(--color-accent)" : "var(--color-text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
            lineHeight: 1,
          }}
        >
          ⋮
        </button>
      </div>

      {/* Size info */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--color-text-muted)",
          opacity: 0.7,
          letterSpacing: "0.02em",
        }}
      >
        {formatSize(snippet.content_size)}
        <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
        {new Date(snippet.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </div>

      {/* Pin button — circular corner action; always visible for pinned snippets */}
      {(!isMobile || snippet.is_pinned) && (
        <button
          onMouseEnter={() => setPinHovered(true)}
          onMouseLeave={() => setPinHovered(false)}
          onFocus={() => setPinFocused(true)}
          onBlur={() => setPinFocused(false)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin(snippet.id);
          }}
          aria-label={snippet.is_pinned ? "Unpin snippet" : "Pin snippet"}
          tabIndex={showPin ? 0 : -1}
          style={{
            position: "absolute",
            top: "-8px",
            right: "-8px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            cursor: "pointer",
            zIndex: 2,
            transition: "background 0.18s ease, color 0.18s ease, border-color 0.18s ease, opacity 0.18s ease, transform 0.18s ease",
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            opacity: showPin ? 1 : 0,
            transform: showPin ? "scale(1)" : "scale(0.8)",
            pointerEvents: showPin ? "auto" : "none",
            background: snippet.is_pinned ? "var(--color-accent)" : "var(--color-surface-2)",
            color: snippet.is_pinned
              ? "white"
              : (pinHovered ? "var(--color-accent)" : "var(--color-text-muted)"),
            border: `1.5px solid ${
              pinHovered || snippet.is_pinned ? "var(--color-accent)" : "var(--color-border)"
            }`,
          }}
        >
          <PinIcon />
        </button>
      )}
    </div>
    </Link>

    <ContextMenu
      items={contextMenuItems}
      position={contextMenuPos}
      onClose={() => setContextMenuPos(null)}
      footer={
        <ColorPickerRow
          currentColor={snippet.color}
          onSelect={(color) => {
            onColorChange(snippet.id, color);
            setContextMenuPos(null);
          }}
        />
      }
    />

    <ConfirmDialog
      open={confirmOpen}
      title="Delete snippet"
      message={`"${snippet.title}" will be permanently deleted. This cannot be undone.`}
      confirmLabel="delete"
      onConfirm={() => {
        setConfirmOpen(false);
        onDelete(snippet.id);
      }}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}
