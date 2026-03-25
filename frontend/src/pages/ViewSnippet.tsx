import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import remarkGfm from "remark-gfm";
import type { Snippet } from "@/types/snippet";
import { api } from "@/lib/api";
import { formatSize } from "@/lib/format-size";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSettings } from "@/hooks/useSettings";
import { ZenOverlay } from "@/components/ui/ZenOverlay";
import { OverflowMenu, type OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { getHighlighterLanguage, isMarkdownLike } from "@/lib/highlighter-lang";

export function ViewSnippet({ snippetId }: { snippetId: string }) {
  const navigate = useNavigate();
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [zenOpen, setZenOpen] = useState(false);
  const exitingRef = useRef(false);
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const { wordWrap, setWordWrap } = useSettings();

  useEffect(() => {
    const controller = new AbortController();
    api.get<Snippet>(`/api/snippets/${snippetId}`, { signal: controller.signal })
      .then(setSnippet)
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [snippetId]);

  const handleCopy = () => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyLink = () => {
    if (!snippet) return;
    navigator.clipboard.writeText(`${window.location.origin}/s/${snippet.short_code}`).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const enterZen = () => {
    exitingRef.current = false;
    history.pushState({ zen: true }, "");
    setZenOpen(true);
  };

  const exitZen = () => {
    setZenOpen(false);
    if (!exitingRef.current) {
      exitingRef.current = true;
      history.back();
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <div style={{ width: "20px", height: "20px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (error || !snippet) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", background: "var(--color-bg)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>snippet not found</span>
        <Link to="/" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-accent)", textDecoration: "none" }}>← back</Link>
      </div>
    );
  }

  const highlighterStyle = theme.hljs;

  const markdownLike = isMarkdownLike(snippet.language);

  const overflowItems: OverflowMenuItem[] = [
    { label: linkCopied ? "copied!" : "copy link", onClick: handleCopyLink },
    ...(markdownLike
      ? [
          {
            label: showPreview ? "source" : "preview",
            onClick: () => setShowPreview((v) => !v),
            active: showPreview,
          },
        ]
      : []),
    { label: "zen", onClick: enterZen },
    {
      label: wordWrap ? "wrap: on" : "wrap: off",
      onClick: () => setWordWrap(!wordWrap),
      active: wordWrap,
    },
    {
      label: "edit",
      onClick: () =>
        navigate({ to: "/snippets/$snippetId/edit", params: { snippetId } }),
    },
  ];

  return (
    <>
    <div style={{ background: "var(--color-bg)", minHeight: "100dvh", padding: "40px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>

        {/* Header bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link
            to="/"
            style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)", textDecoration: "none", letterSpacing: "0.04em" }}
          >
            ← back
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {isMobile ? (
              <>
                {/* Mobile: copy visible, everything else in overflow */}
                <button
                  onClick={handleCopy}
                  style={{
                    padding: "8px 18px",
                    background: "none",
                    border: "1px solid var(--color-accent)",
                    borderRadius: "8px",
                    color: "var(--color-accent)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    transition: "background 0.15s, opacity 0.15s",
                    opacity: copied ? 0.7 : 1,
                  }}
                >
                  {copied ? "copied!" : "copy"}
                </button>
                <OverflowMenu items={overflowItems} />
              </>
            ) : (
              <>
                {/* Desktop: existing flat layout */}
                {/* Left group: view-mode + zen */}
                {markdownLike && (
                  <button
                    onClick={() => setShowPreview((v) => !v)}
                    style={{
                      padding: "6px 16px",
                      background: showPreview ? "var(--color-accent-dim)" : "none",
                      border: `1px solid ${showPreview ? "var(--color-accent)" : "var(--color-border)"}`,
                      borderRadius: "8px",
                      color: showPreview ? "var(--color-accent)" : "var(--color-text-muted)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "13px",
                      cursor: "pointer",
                      letterSpacing: "0.04em",
                      transition: "background 0.15s, border-color 0.15s, color 0.15s",
                    }}
                  >
                    {showPreview ? "source" : "preview"}
                  </button>
                )}
                <button
                  onClick={enterZen}
                  style={{
                    padding: "6px 16px",
                    background: "none",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "var(--color-text-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    transition: "background 0.15s, border-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = "var(--color-accent-dim)";
                    el.style.borderColor = "var(--color-accent)";
                    el.style.color = "var(--color-accent)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = "none";
                    el.style.borderColor = "var(--color-border)";
                    el.style.color = "var(--color-text-muted)";
                  }}
                >
                  zen
                </button>
                <button
                  onClick={() => setWordWrap(!wordWrap)}
                  style={{
                    padding: "6px 16px",
                    background: wordWrap ? "var(--color-accent-dim)" : "none",
                    border: `1px solid ${wordWrap ? "var(--color-accent)" : "var(--color-border)"}`,
                    borderRadius: "8px",
                    color: wordWrap ? "var(--color-accent)" : "var(--color-text-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    transition: "background 0.15s, border-color 0.15s, color 0.15s",
                  }}
                >
                  wrap
                </button>

                {/* Divider */}
                <div style={{ width: "1px", height: "20px", background: "var(--color-border)", opacity: 0.5 }} />

                {/* Right group: edit + copy */}
                <button
                  onClick={() => navigate({ to: "/snippets/$snippetId/edit", params: { snippetId } })}
                  style={{
                    padding: "6px 16px",
                    background: "none",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    color: "var(--color-text-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    transition: "background 0.15s, border-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = "var(--color-accent-dim)";
                    el.style.borderColor = "var(--color-accent)";
                    el.style.color = "var(--color-accent)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = "none";
                    el.style.borderColor = "var(--color-border)";
                    el.style.color = "var(--color-text-muted)";
                  }}
                >
                  edit
                </button>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: "6px 16px",
                    background: "none",
                    border: "1px solid var(--color-accent)",
                    borderRadius: "8px",
                    color: "var(--color-accent)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    transition: "background 0.15s, opacity 0.15s",
                    opacity: copied ? 0.7 : 1,
                  }}
                >
                  {copied ? "copied!" : "copy"}
                </button>
                <button
                  onClick={handleCopyLink}
                  style={{
                    padding: "6px 16px",
                    background: "none",
                    border: "1px solid var(--color-accent)",
                    borderRadius: "8px",
                    color: "var(--color-accent)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    transition: "background 0.15s, opacity 0.15s",
                    opacity: linkCopied ? 0.7 : 1,
                  }}
                >
                  {linkCopied ? "copied!" : "link"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Title + metadata */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-sans)", letterSpacing: "-0.02em", lineHeight: 1.3, flex: 1, minWidth: 0 }}>
              {snippet.title}
            </h1>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: "8px", background: "var(--color-accent-dim)", color: "var(--color-accent)", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 500, letterSpacing: "0.03em", flexShrink: 0, marginTop: "4px" }}>
              {snippet.language}
            </span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)", opacity: 0.7, letterSpacing: "0.02em" }}>
            {formatSize(snippet.content)}
            <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
            {new Date(snippet.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </div>
        </div>

        {/* Code block / Markdown preview */}
        {showPreview && markdownLike ? (
          <div
            className="markdown-preview"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: isMobile ? 0 : "12px",
              borderLeft: isMobile ? "none" : "1px solid var(--color-border)",
              borderRight: isMobile ? "none" : "1px solid var(--color-border)",
              marginLeft: isMobile ? -24 : undefined,
              marginRight: isMobile ? -24 : undefined,
              padding: isMobile ? "24px 24px" : "24px 28px",
              fontFamily: "var(--font-markdown)",
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {snippet.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div style={{
            borderRadius: isMobile ? 0 : "12px",
            overflow: "hidden",
            overflowX: wordWrap ? "hidden" : undefined,
            border: "1px solid var(--color-border)",
            borderLeft: isMobile ? "none" : "1px solid var(--color-border)",
            borderRight: isMobile ? "none" : "1px solid var(--color-border)",
            marginLeft: isMobile ? -24 : undefined,
            marginRight: isMobile ? -24 : undefined,
          }}>
            <SyntaxHighlighter
              language={getHighlighterLanguage(snippet.language)}
              style={highlighterStyle}
              wrapLongLines={wordWrap}
              customStyle={{ background: "var(--color-surface)", fontFamily: "var(--font-mono)", fontSize: "var(--font-size-code)", lineHeight: "1.6", padding: "20px 24px", margin: 0, borderRadius: isMobile ? 0 : "12px" }}
            >
              {snippet.content}
            </SyntaxHighlighter>
          </div>
        )}

      </div>
    </div>

    <ZenOverlay
      open={zenOpen}
      snippet={snippet}
      showPreview={showPreview}
      highlighterStyle={highlighterStyle}
      onExit={exitZen}
    />
    </>
  );
}
