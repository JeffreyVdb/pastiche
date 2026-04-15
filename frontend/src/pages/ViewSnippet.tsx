import { useEffect, useRef, useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { ZenOverlay } from "@/components/ui/ZenOverlay";
import { MarkdownCode } from "@/components/ui/MarkdownCode";
import { OverflowMenu, type OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { CodeEditor } from "@/components/snippets/CodeEditor";
import { TaskEditor } from "@/components/snippets/TaskEditor";
import { getHighlighterLanguage } from "@/lib/highlighter-lang";
import {
  getAvailableSnippetDetailViews,
  getDefaultSnippetDetailView,
  normalizeSnippetDetailView,
  type SnippetDetailView,
} from "@/lib/snippet-detail-view";

type SaveState = "idle" | "saving" | "saved" | "error";

const VIEW_LABELS: Record<SnippetDetailView, string> = {
  tasks: "tasks",
  preview: "preview",
  source: "source",
};

export function ViewSnippet({
  snippetId,
  requestedView,
}: {
  snippetId: string;
  requestedView?: SnippetDetailView;
}) {
  const navigate = useNavigate();
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [zenOpen, setZenOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const exitingRef = useRef(false);
  const latestDraftRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSaveRequestRef = useRef(0);
  const lastPersistedContentRef = useRef("");
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const { wordWrap, setWordWrap } = useSettings();
  const { user } = useAuth();

  useEffect(() => {
    latestDraftRef.current = draftContent;
  }, [draftContent]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.get<Snippet>(`/api/snippets/${snippetId}`, { signal: controller.signal })
      .then((data) => {
        setSnippet(data);
        setDraftContent(data.content);
        lastPersistedContentRef.current = data.content;
        latestDraftRef.current = data.content;
        latestSaveRequestRef.current = 0;
        setSaveState("idle");
        setSaveError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [snippetId]);

  useEffect(() => {
    if (!snippet?.is_public) return;
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex, nofollow";
    return () => {
      meta?.remove();
    };
  }, [snippet?.is_public]);

  const isOwner = !!(user && snippet && snippet.user_id === user.id);
  const canInlineEditTaskSnippet = !!(snippet && isOwner && snippet.language === "markdown tasks");
  const activeView: SnippetDetailView = snippet
    ? normalizeSnippetDetailView(snippet.language, requestedView)
    : "source";
  const availableViews: SnippetDetailView[] = snippet
    ? getAvailableSnippetDetailViews(snippet.language)
    : ["source"];
  const currentContent = draftContent;

  useEffect(() => {
    if (!snippet || requestedView === undefined) return;
    const normalizedView = normalizeSnippetDetailView(snippet.language, requestedView);
    if (normalizedView === requestedView) return;
    navigate({
      to: "/snippets/$snippetId",
      params: { snippetId },
      search: normalizedView === getDefaultSnippetDetailView(snippet.language) ? {} : { view: normalizedView },
      replace: true,
    });
  }, [navigate, requestedView, snippet, snippetId]);

  useEffect(() => {
    if (!snippet || !canInlineEditTaskSnippet) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current);

    if (draftContent === lastPersistedContentRef.current) {
      if (saveState !== "saved") {
        setSaveState("idle");
      }
      setSaveError(null);
      return;
    }

    setSaveState("saving");
    setSaveError(null);

    saveTimerRef.current = setTimeout(() => {
      const contentToSave = draftContent;
      const requestId = latestSaveRequestRef.current + 1;
      latestSaveRequestRef.current = requestId;

      api.patch<Snippet>(`/api/snippets/${snippetId}`, { content: contentToSave })
        .then((updated) => {
          if (requestId < latestSaveRequestRef.current) return;

          lastPersistedContentRef.current = updated.content;
          setSnippet((prev) => prev ? { ...prev, ...updated } : prev);
          setSaveError(null);

          if (latestDraftRef.current === updated.content) {
            setSaveState("saved");
            savedResetTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
          } else {
            setSaveState("saving");
          }
        })
        .catch((err) => {
          if (requestId < latestSaveRequestRef.current) return;
          setSaveState("error");
          setSaveError(err instanceof Error ? err.message : "Failed to save changes");
        });
    }, 500);
  }, [canInlineEditTaskSnippet, draftContent, saveState, snippet, snippetId]);

  const setView = (view: SnippetDetailView, replace = false) => {
    navigate({
      to: "/snippets/$snippetId",
      params: { snippetId },
      search: { view },
      replace,
    });
  };

  const handleCopy = () => {
    if (!snippet) return;
    navigator.clipboard.writeText(currentContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyLink = () => {
    if (!snippet) return;
    navigator.clipboard.writeText(window.location.href).then(() => {
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
  const showZen = activeView !== "tasks";
  const hasViewSwitcher = availableViews.length > 1;
  const saveLabel =
    saveState === "saving"
      ? "saving..."
      : saveState === "saved"
        ? "saved"
        : saveState === "error"
          ? "retry needed"
          : null;

  const overflowItems: OverflowMenuItem[] = [
    { label: linkCopied ? "copied!" : "copy link", onClick: handleCopyLink },
    ...(hasViewSwitcher
      ? availableViews.map((view) => ({
          label: VIEW_LABELS[view],
          onClick: () => setView(view),
          active: activeView === view,
        }))
      : []),
    ...(showZen ? [{ label: "zen", onClick: enterZen }] : []),
    {
      label: wordWrap ? "wrap: on" : "wrap: off",
      onClick: () => setWordWrap(!wordWrap),
      active: wordWrap,
    },
    ...(isOwner
      ? [{
          label: "edit",
          onClick: () =>
            navigate({ to: "/snippets/$snippetId/edit", params: { snippetId } }),
        }]
      : []),
  ];

  return (
    <>
      <div style={{ background: "var(--color-bg)", minHeight: "100dvh", padding: "40px 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link
              to="/"
              style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)", textDecoration: "none", letterSpacing: "0.04em" }}
            >
              ← back
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {isMobile ? (
                <>
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
                  {hasViewSwitcher && availableViews.map((view) => (
                    <button
                      key={view}
                      onClick={() => setView(view)}
                      style={{
                        padding: "6px 16px",
                        background: activeView === view ? "var(--color-accent-dim)" : "none",
                        border: `1px solid ${activeView === view ? "var(--color-accent)" : "var(--color-border)"}`,
                        borderRadius: "8px",
                        color: activeView === view ? "var(--color-accent)" : "var(--color-text-muted)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        cursor: "pointer",
                        letterSpacing: "0.04em",
                        transition: "background 0.15s, border-color 0.15s, color 0.15s",
                      }}
                    >
                      {VIEW_LABELS[view]}
                    </button>
                  ))}
                  {showZen && (
                    <button
                      onClick={enterZen}
                      style={secondaryButtonStyle}
                      onMouseEnter={handleSecondaryHover}
                      onMouseLeave={handleSecondaryLeave}
                    >
                      zen
                    </button>
                  )}
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

                  <div style={{ width: "1px", height: "20px", background: "var(--color-border)", opacity: 0.5 }} />

                  {isOwner && (
                    <button
                      onClick={() => navigate({ to: "/snippets/$snippetId/edit", params: { snippetId } })}
                      style={secondaryButtonStyle}
                      onMouseEnter={handleSecondaryHover}
                      onMouseLeave={handleSecondaryLeave}
                    >
                      edit
                    </button>
                  )}
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

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 600, color: "var(--color-text)", fontFamily: "var(--font-sans)", letterSpacing: "-0.02em", lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                {snippet.title}
              </h1>
              {snippet.is_public && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "30px",
                    height: "30px",
                    borderRadius: "8px",
                    background: "var(--color-accent-dim)",
                    color: "var(--color-accent)",
                    flexShrink: 0,
                    marginTop: "4px",
                  }}
                  title="Public snippet"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: "8px", background: "var(--color-accent-dim)", color: "var(--color-accent)", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 500, letterSpacing: "0.03em", flexShrink: 0, marginTop: "4px" }}>
                {snippet.language}
              </span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)", opacity: 0.7, letterSpacing: "0.02em" }}>
              {formatSize(currentContent)}
              <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
              {new Date(snippet.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              {canInlineEditTaskSnippet && saveLabel && (
                <>
                  <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                  <span style={{ color: saveState === "error" ? "rgb(239,68,68)" : undefined }} title={saveError ?? undefined}>
                    {saveLabel}
                  </span>
                </>
              )}
            </div>
          </div>

          {activeView === "tasks" ? (
            <div
              style={{
                borderRadius: isMobile ? 0 : "12px",
                marginLeft: isMobile ? -24 : undefined,
                marginRight: isMobile ? -24 : undefined,
              }}
            >
              <TaskEditor
                value={currentContent}
                onChange={setDraftContent}
                readOnly={!canInlineEditTaskSnippet}
                allowCodeMode={false}
              />
            </div>
          ) : activeView === "preview" ? (
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
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: MarkdownCode }}>
                {currentContent}
              </ReactMarkdown>
            </div>
          ) : canInlineEditTaskSnippet ? (
            <div
              style={{
                borderRadius: isMobile ? 0 : "12px",
                marginLeft: isMobile ? -24 : undefined,
                marginRight: isMobile ? -24 : undefined,
              }}
            >
              <CodeEditor value={currentContent} onChange={setDraftContent} language="markdown" />
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
                {currentContent}
              </SyntaxHighlighter>
            </div>
          )}

        </div>
      </div>

      <ZenOverlay
        open={zenOpen}
        snippet={snippet}
        view={activeView}
        content={currentContent}
        highlighterStyle={highlighterStyle}
        onExit={exitZen}
      />
    </>
  );
}

function handleSecondaryHover(e: React.MouseEvent<HTMLButtonElement>) {
  const el = e.currentTarget;
  el.style.background = "var(--color-accent-dim)";
  el.style.borderColor = "var(--color-accent)";
  el.style.color = "var(--color-accent)";
}

function handleSecondaryLeave(e: React.MouseEvent<HTMLButtonElement>) {
  const el = e.currentTarget;
  el.style.background = "none";
  el.style.borderColor = "var(--color-border)";
  el.style.color = "var(--color-text-muted)";
}

const secondaryButtonStyle: React.CSSProperties = {
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
};
