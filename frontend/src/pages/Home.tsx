import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import type { SnippetListItem } from "@/types/snippet";
import type { PaginatedResponse } from "@/types/pagination";
import { groupSnippetsByDate } from "@/lib/date-groups";
import { SnippetCard } from "@/components/snippets/SnippetCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

const PAGE_SIZE = 25;

export function Home() {
  const { user } = useAuth();
  const { resolved } = useTheme();

  // Regular (unpinned) snippets — paginated
  const [snippets, setSnippets] = useState<SnippetListItem[]>([]);
  const [snippetsLoading, setSnippetsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Pinned snippets — all loaded upfront
  const [pinnedSnippets, setPinnedSnippets] = useState<SnippetListItem[]>([]);
  const [pinnedLoading, setPinnedLoading] = useState(true);
  const [recentlyMoved, setRecentlyMoved] = useState<Set<string>>(new Set());

  const fetchPinnedSnippets = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api.get<PaginatedResponse<SnippetListItem>>(
        `/api/snippets?pinned=true&limit=100`,
        { signal }
      );
      setPinnedSnippets(data.items);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Silently fail — pinned section simply won't render
    } finally {
      setPinnedLoading(false);
    }
  }, []);

  const fetchSnippets = useCallback(async (fetchOffset: number, signal?: AbortSignal) => {
    setFetchError(null);
    if (fetchOffset > 0) setLoadingMore(true);
    try {
      const data = await api.get<PaginatedResponse<SnippetListItem>>(
        `/api/snippets?pinned=false&limit=${PAGE_SIZE}&offset=${fetchOffset}`,
        { signal }
      );
      if (fetchOffset === 0) {
        setSnippets(data.items);
      } else {
        setSnippets((prev) => [...prev, ...data.items]);
      }
      setTotal(data.total);
      setOffset(fetchOffset + data.items.length);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setFetchError("Failed to load snippets. Please try again.");
    } finally {
      setSnippetsLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchPinnedSnippets(controller.signal);
    fetchSnippets(0, controller.signal);
    return () => controller.abort();
  }, [fetchPinnedSnippets, fetchSnippets]);

  async function handleDelete(id: string) {
    const inPinned = pinnedSnippets.some((s) => s.id === id);
    const prevPinned = pinnedSnippets;
    const previous = snippets;
    const previousTotal = total;
    const previousOffset = offset;

    if (inPinned) {
      setPinnedSnippets((prev) => prev.filter((s) => s.id !== id));
    } else {
      setSnippets((prev) => prev.filter((s) => s.id !== id));
      setTotal((prev) => prev - 1);
      setOffset((prev) => prev - 1);
    }

    try {
      await api.delete(`/api/snippets/${id}`);
    } catch {
      setPinnedSnippets(prevPinned);
      setSnippets(previous);
      setTotal(previousTotal);
      setOffset(previousOffset);
      await fetchSnippets(0);
    }
  }

  async function handleTogglePin(id: string) {
    const inPinned = pinnedSnippets.find((s) => s.id === id);
    const inRegular = snippets.find((s) => s.id === id);
    const snippet = inPinned ?? inRegular;
    if (!snippet) return;

    const prevPinned = pinnedSnippets;
    const prevSnippets = snippets;
    const prevTotal = total;
    const prevOffset = offset;

    setRecentlyMoved((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setRecentlyMoved((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 500);

    if (inPinned) {
      // Unpinning: move from pinned → regular list
      const unpinned = { ...snippet, is_pinned: false };
      setPinnedSnippets((prev) => prev.filter((s) => s.id !== id));
      setSnippets((prev) =>
        [unpinned, ...prev].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setTotal((prev) => prev + 1);
      setOffset((prev) => prev + 1);
    } else {
      // Pinning: move from regular → pinned list
      const pinned = { ...snippet, is_pinned: true };
      setSnippets((prev) => prev.filter((s) => s.id !== id));
      setPinnedSnippets((prev) =>
        [pinned, ...prev].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setTotal((prev) => prev - 1);
      setOffset((prev) => prev - 1);
    }

    try {
      await api.patch(`/api/snippets/${id}/pin`);
    } catch {
      setPinnedSnippets(prevPinned);
      setSnippets(prevSnippets);
      setTotal(prevTotal);
      setOffset(prevOffset);
    }
  }

  const hasMore = offset < total;

  const loadNextPage = useCallback(() => {
    if (loadingMore || fetchError) return;
    fetchSnippets(offset);
  }, [loadingMore, fetchError, offset, fetchSnippets]);

  const sentinelRef = useIntersectionObserver({
    onIntersect: loadNextPage,
    enabled: hasMore && !loadingMore && !fetchError && !snippetsLoading,
    rootMargin: "200px",
  });

  // Must be before early returns — hooks cannot be called after conditional returns
  const groups = useMemo(() => groupSnippetsByDate(snippets), [snippets]);

  // Loading state
  if (snippetsLoading || pinnedLoading) {
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
  if (snippets.length === 0 && pinnedSnippets.length === 0) {
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

      <div style={{ display: "flex", flexDirection: "column", gap: "36px", position: "relative", zIndex: 1 }}>

        {/* Pinned section */}
        {pinnedSnippets.length > 0 && (
          <section>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "12px",
              }}
            >
              {pinnedSnippets.map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                  animateEntrance={recentlyMoved.has(snippet.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Date-grouped sections */}
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
                <SnippetCard key={snippet.id} snippet={snippet} onDelete={handleDelete} onTogglePin={handleTogglePin} animateEntrance={recentlyMoved.has(snippet.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Sentinel for infinite scroll — invisible trigger element */}
      {hasMore && !fetchError && (
        <div ref={sentinelRef} style={{ height: "1px", width: "100%" }} aria-hidden="true" />
      )}

      {/* Loading spinner for next page */}
      {loadingMore && (
        <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
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
      )}

      {/* Error with retry */}
      {fetchError && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            padding: "24px 0",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {fetchError}
          </p>
          <button
            onClick={() => {
              setFetchError(null);
              fetchSnippets(offset);
            }}
            style={{
              padding: "8px 16px",
              background: "transparent",
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent)",
              borderRadius: "8px",
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* End of list */}
      {!hasMore && snippets.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "32px 0 16px",
          }}
        >
          <div style={{ flex: 1, maxWidth: "80px", height: "1px", background: "var(--color-border)", opacity: 0.5 }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-muted)",
              opacity: 0.5,
              letterSpacing: "0.05em",
            }}
          >
            end
          </span>
          <div style={{ flex: 1, maxWidth: "80px", height: "1px", background: "var(--color-border)", opacity: 0.5 }} />
        </div>
      )}
    </div>
  );
}
