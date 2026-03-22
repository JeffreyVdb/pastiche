import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { SnippetListItem } from "@/types/snippet";
import { formatSize } from "@/lib/format-size";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";

interface SnippetCardProps {
  snippet: SnippetListItem;
  onDelete: (id: string) => void;
}

export function SnippetCard({ snippet, onDelete }: SnippetCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [kebabHovered, setKebabHovered] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const contextMenuItems: ContextMenuItem[] = [
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

  return (
    <>
    <Link
      to="/snippets/$snippetId"
      params={{ snippetId: snippet.id }}
      style={{ textDecoration: "none", display: "block" }}
    >
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
      }}
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${hovered ? "var(--color-accent)" : "var(--color-border)"}`,
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
        overflow: "hidden",
      }}
    >
      {/* Top accent line on hover */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: "var(--color-accent)",
          borderRadius: "12px 12px 0 0",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.18s ease",
        }}
      />

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
    </div>
    </Link>

    <ContextMenu
      items={contextMenuItems}
      position={contextMenuPos}
      onClose={() => setContextMenuPos(null)}
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
