import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import type { Snippet } from "@/types/snippet";
import { FocusInput } from "@/components/snippets/SnippetFormFields";
import { LanguageSearch } from "@/components/snippets/LanguageSearch";
import { CodeEditor } from "@/components/snippets/CodeEditor";
import { TaskEditor } from "@/components/snippets/TaskEditor";

export function CreateSnippet() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("autodetect");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post<Snippet>("/api/snippets", { title, language, content });
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create snippet");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "960px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "36px",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                margin: "0 0 6px 0",
                opacity: 0.8,
              }}
            >
              {"// new snippet"}
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 600,
                color: "var(--color-text)",
                fontFamily: "var(--font-sans)",
                letterSpacing: "-0.04em",
              }}
            >
              Create Snippet
            </h1>
          </div>

          <Link
            to="/"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--color-text-muted)",
              textDecoration: "none",
              padding: "6px 16px",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "var(--color-text)";
              el.style.borderColor = "var(--color-text-muted)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "var(--color-text-muted)";
              el.style.borderColor = "var(--color-border)";
            }}
          >
            ← cancel
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              Title
            </label>
            <FocusInput
              type="text"
              placeholder="e.g. Debounce hook"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={255}
            />
          </div>

          {/* Language */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              Language
            </label>
            <LanguageSearch value={language} onChange={setLanguage} languages={LANGUAGES} />
          </div>

          {/* Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              Content
            </label>
            {language === "markdown tasks" ? (
              <TaskEditor value={content} onChange={setContent} />
            ) : (
              <CodeEditor value={content} onChange={setContent} language={language} />
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "8px",
                color: "rgb(239,68,68)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "4px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 24px",
                background: "var(--color-accent-dim)",
                color: "var(--color-accent)",
                border: "1px solid var(--color-accent)",
                borderRadius: "8px",
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      border: "2px solid var(--color-accent-dim)",
                      borderTopColor: "var(--color-accent)",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Saving…
                </>
              ) : (
                <>
                  <span style={{ fontSize: "16px" }}>+</span>
                  Save Snippet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
