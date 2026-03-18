import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import type { Snippet } from "@/types/snippet";
import { groupSnippetsByDate } from "@/lib/date-groups";
import { SnippetCard } from "@/components/snippets/SnippetCard";

export function Home() {
  const { user } = useAuth();
  const { resolved } = useTheme();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [snippetsLoading, setSnippetsLoading] = useState(true);

  const fetchSnippets = useCallback(async () => {
    try {
      const data = await api.get<Snippet[]>("/api/snippets");
      setSnippets(data);
    } catch {
      // silent — keep existing state
    } finally {
      setSnippetsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  async function handleDelete(id: string) {
    const previous = snippets;
    setSnippets((prev) => prev.filter((s) => s.id !== id));
    try {
      await api.delete(`/api/snippets/${id}`);
    } catch {
      setSnippets(previous);
      await fetchSnippets();
    }
  }

  // Loading state
  if (snippetsLoading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            border: "2px solid var(--color-border)",
            borderTopColor: "var(--color-accent)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  // Empty state
  if (snippets.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "500px",
            height: "300px",
            borderRadius: "50%",
            background:
              resolved === "dark"
                ? "radial-gradient(ellipse, rgba(0,212,184,0.05) 0%, transparent 70%)"
                : "radial-gradient(ellipse, rgba(0,109,94,0.05) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Greeting */}
        <p
          className="animate-fade-up"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: "20px",
            opacity: 0.8,
          }}
        >
          {"// "}
          {user?.display_name ? `hey, ${user.display_name.split(" ")[0].toLowerCase()}` : `@${user?.username}`}
        </p>

        {/* Main headline */}
        <h1
          className="animate-fade-up delay-100"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 600,
            color: "var(--color-text)",
            textAlign: "center",
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            maxWidth: "560px",
            margin: "0 0 20px 0",
          }}
        >
          Ready to create your
          <br />
          <span style={{ color: "var(--color-accent)" }}>first snippet?</span>
        </h1>

        {/* Subtext */}
        <p
          className="animate-fade-up delay-200"
          style={{
            fontSize: "16px",
            color: "var(--color-text-muted)",
            textAlign: "center",
            maxWidth: "400px",
            lineHeight: 1.65,
            margin: "0 0 48px 0",
            fontWeight: 400,
          }}
        >
          Capture the fragments you keep reaching for.
          Snippets, patterns, commands — all searchable, all yours.
        </p>

        {/* CTA */}
        <div className="animate-fade-up delay-300">
          <Link
            to="/snippets/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              background: "var(--color-accent-dim)",
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent)",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "14px",
              letterSpacing: "-0.01em",
              textDecoration: "none",
              fontFamily: "var(--font-sans)",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
            }}
          >
            <span style={{ fontSize: "16px" }}>+</span>
            New Snippet
          </Link>
        </div>

        {/* Decorative code snippet preview */}
        <div
          className="animate-fade-up delay-400"
          style={{
            marginTop: "64px",
            maxWidth: "480px",
            width: "100%",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            overflow: "hidden",
            opacity: 0.6,
          }}
        >
          {/* Window chrome */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 14px",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
            }}
          >
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--color-border)" }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--color-border)" }} />
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--color-border)" }} />
            <span
              style={{
                marginLeft: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--color-text-muted)",
              }}
            >
              your-first-snippet.ts
            </span>
          </div>

          {/* Code */}
          <pre
            style={{
              margin: 0,
              padding: "16px 18px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              lineHeight: 1.7,
              color: "var(--color-text-muted)",
              overflow: "hidden",
            }}
          >
            <span style={{ color: "var(--color-text-muted)", opacity: 0.5 }}>{"// waiting for you...\n"}</span>
            <span style={{ color: "var(--color-accent)" }}>{"const "}</span>
            <span style={{ color: "var(--color-text)" }}>{"snippet"}</span>
            <span style={{ color: "var(--color-text-muted)" }}>{" = {"}</span>
            {"\n"}
            <span style={{ color: "var(--color-text-muted)" }}>{"  title: "}</span>
            <span style={{ color: "var(--color-accent)", opacity: 0.7 }}>{"'...'"}</span>
            <span style={{ color: "var(--color-text-muted)" }}>{","}</span>
            {"\n"}
            <span style={{ color: "var(--color-text-muted)" }}>{"}"}</span>
          </pre>
        </div>
      </div>
    );
  }

  // Populated state
  const groups = groupSnippetsByDate(snippets);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "40px 24px",
        maxWidth: "1200px",
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "fixed",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "300px",
          borderRadius: "50%",
          background:
            resolved === "dark"
              ? "radial-gradient(ellipse, rgba(0,212,184,0.03) 0%, transparent 70%)"
              : "radial-gradient(ellipse, rgba(0,109,94,0.03) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "36px",
          position: "relative",
          zIndex: 1,
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
              margin: "0 0 4px 0",
              opacity: 0.8,
            }}
          >
            {"// "}
            {user?.display_name ? user.display_name.split(" ")[0].toLowerCase() : user?.username}
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
            Your Snippets
          </h1>
        </div>

        <Link
          to="/snippets/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            background: "var(--color-accent-dim)",
            color: "var(--color-accent)",
            border: "1px solid var(--color-accent)",
            borderRadius: "8px",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            textDecoration: "none",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
          }}
        >
          <span style={{ fontSize: "15px" }}>+</span>
          New Snippet
        </Link>
      </div>

      {/* Date-grouped sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: "36px", position: "relative", zIndex: 1 }}>
        {groups.map((group) => (
          <section key={group.label}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  opacity: 0.6,
                  flexShrink: 0,
                }}
              >
                {group.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: "var(--color-border)",
                  opacity: 0.5,
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "12px",
              }}
            >
              {group.snippets.map((snippet) => (
                <SnippetCard key={snippet.id} snippet={snippet} onDelete={handleDelete} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
