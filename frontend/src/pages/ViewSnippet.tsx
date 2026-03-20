import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import remarkGfm from "remark-gfm";
import type { Snippet } from "@/types/snippet";
import { api } from "@/lib/api";
import { formatSize } from "@/lib/format-size";
import { useTheme } from "@/hooks/useTheme";
import { ZenOverlay } from "@/components/ui/ZenOverlay";

export function ViewSnippet({ snippetId }: { snippetId: string }) {
  const navigate = useNavigate();
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [zenOpen, setZenOpen] = useState(false);
  const exitingRef = useRef(false);
  const { theme } = useTheme();

  useEffect(() => {
    api.get<Snippet>(`/api/snippets/${snippetId}`)
      .then(setSnippet)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [snippetId]);

  const handleCopy = () => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  return (
    <>
    <div style={{ background: "var(--color-bg)", minHeight: "100dvh", padding: "40px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>

        {/* Header bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link
            to="/"
            style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)", textDecoration: "none", letterSpacing: "0.04em" }}
          >
            ← back
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Left group: view-mode + zen */}
            {snippet.language === "markdown" && (
              <button
                onClick={() => setShowPreview((v) => !v)}
                style={{
                  padding: "5px 12px",
                  background: showPreview ? "var(--color-accent-dim)" : "none",
                  border: `1px solid ${showPreview ? "var(--color-accent)" : "var(--color-border)"}`,
                  borderRadius: "6px",
                  color: showPreview ? "var(--color-accent)" : "var(--color-text-muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
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
                padding: "5px 12px",
                background: "none",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
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

            {/* Divider — only when markdown toggle is present */}
            {snippet.language === "markdown" && (
              <div style={{ width: "1px", height: "18px", background: "var(--color-border)", opacity: 0.5 }} />
            )}

            {/* Right group: edit + copy */}
            <button
              onClick={() => navigate({ to: "/snippets/$snippetId/edit", params: { snippetId } })}
              style={{
                padding: "5px 12px",
                background: "none",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
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
                padding: "5px 12px",
                background: "none",
                border: "1px solid var(--color-accent)",
                borderRadius: "6px",
                color: "var(--color-accent)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                cursor: "pointer",
                letterSpacing: "0.04em",
                transition: "background 0.15s, opacity 0.15s",
                opacity: copied ? 0.7 : 1,
              }}
            >
              {copied ? "copied!" : "copy"}
            </button>
          </div>
        </div>

        {/* Title + metadata */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-sans)", letterSpacing: "-0.02em", lineHeight: 1.3, flex: 1, minWidth: 0 }}>
              {snippet.title}
            </h1>
            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: "5px", background: "var(--color-accent-dim)", color: "var(--color-accent)", fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.03em", flexShrink: 0, marginTop: "4px" }}>
              {snippet.language}
            </span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-muted)", opacity: 0.7, letterSpacing: "0.02em" }}>
            {formatSize(snippet.content)}
            <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
            {new Date(snippet.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </div>
        </div>

        {/* Code block / Markdown preview */}
        {showPreview && snippet.language === "markdown" ? (
          <div
            className="markdown-preview"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
              padding: "24px 28px",
              fontFamily: "var(--font-markdown)",
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {snippet.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid var(--color-border)" }}>
            <SyntaxHighlighter
              language={snippet.language === "autodetect" ? undefined : snippet.language}
              style={highlighterStyle}
              customStyle={{ background: "var(--color-surface)", fontFamily: "var(--font-mono)", fontSize: "var(--font-size-code)", lineHeight: "1.6", padding: "20px 24px", margin: 0, borderRadius: "12px" }}
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
