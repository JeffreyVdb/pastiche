import { useCallback, useEffect, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { ThemePicker } from "@/components/layout/ThemeSwitcher";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import type { ApiKey, ApiKeyCreated } from "@/types/api-key";

const CODE_PREVIEWS: { language: string; label: string; code: string }[] = [
  {
    language: "python",
    label: "python",
    code: `def fibonacci(n: int) -> list[int]:
    a, b = 0, 1
    result = []
    while len(result) < n:
        result.append(a)
        a, b = b, a + b
    return result`,
  },
  {
    language: "go",
    label: "go",
    code: `func worker(jobs <-chan int, out chan<- int) {
    for j := range jobs {
        out <- j * j
    }
}

func main() {
    jobs := make(chan int, 5)
    results := make(chan int, 5)
    go worker(jobs, results)
}`,
  },
  {
    language: "c",
    label: "c",
    code: `typedef struct Node {
    int value;
    struct Node *next;
} Node;

Node *push(Node *head, int val) {
    Node *n = malloc(sizeof(Node));
    n->value = val;
    n->next = head;
    return n;
}`,
  },
  {
    language: "elixir",
    label: "elixir",
    code: `defmodule Greeter do
  def greet(name) do
    "Hello, #{name}!"
    |> String.upcase()
    |> IO.puts()
  end
end`,
  },
];

function parseUTCDate(dateStr: string): Date {
  return /[Z+\-]\d{0,2}:?\d{0,2}$/.test(dateStr)
    ? new Date(dateStr)
    : new Date(dateStr + "Z");
}

function formatDate(dateStr: string): string {
  return parseUTCDate(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLastUsed(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = parseUTCDate(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function Settings() {
  const { theme } = useTheme();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const data = await api.get<ApiKey[]>("/api/keys");
      setKeys(data);
    } catch {
      // silent
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim() || creating) return;
    setCreating(true);
    try {
      const created = await api.post<ApiKeyCreated>("/api/keys", { name: newKeyName.trim() });
      setKeys((prev) => [created, ...prev]);
      setNewKeyName("");
      setRevealedKey(created);
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const previous = keys;
    setKeys((prev) => prev.filter((k) => k.id !== id));
    try {
      await api.delete(`/api/keys/${id}`);
    } catch {
      setKeys(previous);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hlStyle = theme.hljs;

  return (
    <>
      {/* One-time key reveal modal */}
      {revealedKey && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "560px",
              width: "100%",
              boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                margin: "0 0 4px 0",
                opacity: 0.6,
              }}
            >
              // new api key
            </p>
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--color-text)",
                fontFamily: "var(--font-sans)",
                letterSpacing: "-0.03em",
              }}
            >
              {revealedKey.name}
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 14px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: "8px",
                marginBottom: "16px",
              }}
            >
              <span style={{ fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>⚠</span>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#f59e0b",
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1.55,
                }}
              >
                Copy this key now — it won't be shown again.
              </p>
            </div>

            <div
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: "10px",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              <code
                style={{
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--color-accent)",
                  wordBreak: "break-all",
                  lineHeight: 1.6,
                }}
              >
                {revealedKey.key}
              </code>
              <button
                onClick={() => handleCopy(revealedKey.key)}
                style={{
                  flexShrink: 0,
                  background: copied ? "var(--color-accent-dim)" : "transparent",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: copied ? "var(--color-accent)" : "var(--color-text-muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  padding: "6px 10px",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <button
              onClick={() => {
                setRevealedKey(null);
                setCopied(false);
              }}
              style={{
                width: "100%",
                padding: "10px",
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                cursor: "pointer",
                color: "var(--color-text)",
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                fontWeight: 500,
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "var(--color-text-muted)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Page content */}
      <div
        style={{
          flex: 1,
          maxWidth: "880px",
          width: "100%",
          margin: "0 auto",
          padding: "40px 24px",
          boxSizing: "border-box",
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: "48px" }}>
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
            // settings
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 600,
              color: "var(--color-text)",
              fontFamily: "var(--font-sans)",
              letterSpacing: "-0.04em",
            }}
          >
            Settings
          </h1>
        </div>

        {/* ── Appearance ── */}
        <section style={{ marginBottom: "56px" }}>
          <div style={{ marginBottom: "20px" }}>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                margin: "0 0 4px 0",
                opacity: 0.6,
              }}
            >
              // preferences
            </p>
            <h2
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--color-text)",
                fontFamily: "var(--font-sans)",
                letterSpacing: "-0.03em",
              }}
            >
              Appearance
            </h2>
          </div>

          {/* Theme picker */}
          <div style={{ marginBottom: "24px" }}>
            <ThemePicker />
          </div>

          {/* Syntax preview grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "12px",
            }}
          >
            {CODE_PREVIEWS.map(({ language, label, code }) => (
              <div
                key={language}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "8px 14px",
                    borderBottom: "1px solid var(--color-border)",
                    background: "var(--color-surface-2)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--color-text-muted)",
                      opacity: 0.7,
                    }}
                  >
                    {label}
                  </span>
                </div>
                <SyntaxHighlighter
                  language={language}
                  style={hlStyle}
                  customStyle={{
                    margin: 0,
                    padding: "14px 16px",
                    background: "transparent",
                    fontSize: "11px",
                    lineHeight: 1.65,
                  }}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: "var(--color-border)",
            opacity: 0.5,
            marginBottom: "48px",
          }}
        />

        {/* ── API Keys ── */}
        <section>
          <div style={{ marginBottom: "20px" }}>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                margin: "0 0 4px 0",
                opacity: 0.6,
              }}
            >
              // programmatic access
            </p>
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--color-text)",
                fontFamily: "var(--font-sans)",
                letterSpacing: "-0.03em",
              }}
            >
              API Keys
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: "var(--color-text-muted)",
                lineHeight: 1.6,
              }}
            >
              Use API keys to authenticate requests from scripts or other tools. Keys are shown once
              on creation. See the{" "}
              <a
                href="/api/docs"
                style={{ color: "var(--color-accent)", textDecoration: "none" }}
              >
                API reference
              </a>{" "}
              for available endpoints.
            </p>
          </div>

          {/* Create form */}
          <form
            onSubmit={handleCreate}
            style={{ display: "flex", gap: "8px", marginBottom: "24px" }}
          >
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name, e.g. my-script"
              style={{
                flex: 1,
                padding: "9px 14px",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-text)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = "var(--color-accent)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = "var(--color-border)";
              }}
            />
            <button
              type="submit"
              disabled={creating || !newKeyName.trim()}
              style={{
                padding: "9px 18px",
                background: "var(--color-accent-dim)",
                color: "var(--color-accent)",
                border: "1px solid var(--color-accent)",
                borderRadius: "8px",
                cursor: creating || !newKeyName.trim() ? "not-allowed" : "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                opacity: creating || !newKeyName.trim() ? 0.5 : 1,
                transition: "opacity 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                if (!el.disabled) el.style.opacity = "0.8";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                if (!el.disabled) el.style.opacity = "1";
              }}
            >
              {creating ? "Generating..." : "Generate key"}
            </button>
          </form>

          {/* Key list */}
          {keysLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  border: "2px solid var(--color-border)",
                  borderTopColor: "var(--color-accent)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            </div>
          ) : keys.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 24px",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                opacity: 0.5,
              }}
            >
              No API keys yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {keys.map((key) => (
                <KeyRow key={key.id} apiKey={key} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function KeyRow({
  apiKey,
  onDelete,
}: {
  apiKey: ApiKey;
  onDelete: (id: string) => void;
}) {
  const [deleteHover, setDeleteHover] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 18px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "10px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--color-text)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {apiKey.name}
          </span>
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-muted)",
              background: "var(--color-surface-2)",
              padding: "2px 7px",
              borderRadius: "4px",
              border: "1px solid var(--color-border)",
            }}
          >
            {apiKey.prefix}…
          </code>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-accent)",
              opacity: 0.8,
            }}
          >
            {apiKey.request_count} {apiKey.request_count === 1 ? "request" : "requests"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-muted)",
              opacity: 0.55,
            }}
          >
            created {formatDate(apiKey.created_at)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-muted)",
              opacity: 0.55,
            }}
          >
            last used: {formatLastUsed(apiKey.last_used_at)}
          </span>
        </div>
      </div>

      <button
        onClick={() => setConfirmOpen(true)}
        onMouseEnter={() => setDeleteHover(true)}
        onMouseLeave={() => setDeleteHover(false)}
        style={{
          flexShrink: 0,
          background: deleteHover ? "rgba(239,68,68,0.08)" : "transparent",
          border: `1px solid ${deleteHover ? "rgba(239,68,68,0.4)" : "var(--color-border)"}`,
          borderRadius: "6px",
          cursor: "pointer",
          color: deleteHover ? "#ef4444" : "var(--color-text-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          padding: "5px 10px",
          transition: "all 0.15s",
        }}
      >
        rm
      </button>
    </div>
    <ConfirmDialog
      open={confirmOpen}
      title="Revoke API key"
      message={`"${apiKey.name}" (${apiKey.prefix}…) will be permanently revoked. Any integrations using this key will stop working.`}
      confirmLabel="revoke"
      onConfirm={() => {
        setConfirmOpen(false);
        onDelete(apiKey.id);
      }}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}
