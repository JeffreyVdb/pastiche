import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SnippetCard } from "@/components/snippets/SnippetCard";
import { SnippetSearchControl } from "@/components/snippets/SnippetSearchControl";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { useIsMobile } from "@/hooks/useIsMobile";
import { api } from "@/lib/api";
import { groupSnippetsByDate } from "@/lib/date-groups";
import {
  getCommittedSnippetSearchQuery,
  normalizeSnippetSearchInput,
} from "@/lib/snippet-search";
import type { PaginatedResponse } from "@/types/pagination";
import type { SnippetListItem } from "@/types/snippet";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 250;

interface HomeProps {
  initialQuery?: string;
}

function getNewLinkStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "8px 16px",
    height: "36px",
    boxSizing: "border-box",
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
    flexShrink: 0,
  };
}

export function Home({ initialQuery = "" }: HomeProps) {
  const { user } = useAuth();
  const { resolved } = useTheme();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const routeQuery = getCommittedSnippetSearchQuery(initialQuery);
  const isSearchMode = Boolean(routeQuery);

  const [rawQuery, setRawQuery] = useState(routeQuery);
  const [searchOpen, setSearchOpen] = useState(Boolean(routeQuery));
  const [snippets, setSnippets] = useState<SnippetListItem[]>([]);
  const [snippetsLoading, setSnippetsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pinnedSnippets, setPinnedSnippets] = useState<SnippetListItem[]>([]);
  const [pinnedLoading, setPinnedLoading] = useState(true);
  const [recentlyMoved, setRecentlyMoved] = useState<Set<string>>(new Set());

  const snippetsRef = useRef<SnippetListItem[]>([]);
  const listControllerRef = useRef<AbortController | null>(null);
  const listRequestIdRef = useRef(0);
  const pinnedControllerRef = useRef<AbortController | null>(null);
  const pinnedRequestIdRef = useRef(0);

  useEffect(() => {
    snippetsRef.current = snippets;
  }, [snippets]);

  const cancelListRequest = useCallback(() => {
    listControllerRef.current?.abort();
    listControllerRef.current = null;
  }, []);

  const cancelPinnedRequest = useCallback(() => {
    pinnedControllerRef.current?.abort();
    pinnedControllerRef.current = null;
  }, []);

  const fetchListPage = useCallback(async (fetchOffset: number, query: string) => {
    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;
    cancelListRequest();

    const controller = new AbortController();
    listControllerRef.current = controller;

    setFetchError(null);
    if (fetchOffset === 0) {
      if (snippetsRef.current.length === 0) {
        setSnippetsLoading(true);
      } else {
        setRefreshing(true);
      }
      setLoadingMore(false);
    } else {
      setLoadingMore(true);
    }

    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(fetchOffset),
    });

    if (query) {
      params.set("q", query);
    } else {
      params.set("pinned", "false");
    }

    try {
      const data = await api.get<PaginatedResponse<SnippetListItem>>(`/api/snippets?${params.toString()}`, {
        signal: controller.signal,
      });

      if (requestId !== listRequestIdRef.current) return;

      setSnippets((prev) => (fetchOffset === 0 ? data.items : [...prev, ...data.items]));
      setTotal(data.total);
      setOffset(fetchOffset + data.items.length);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (requestId !== listRequestIdRef.current) return;
      setFetchError("Failed to load snippets. Please try again.");
    } finally {
      if (requestId !== listRequestIdRef.current) return;
      setSnippetsLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [cancelListRequest]);

  const fetchPinnedSnippets = useCallback(async () => {
    const requestId = pinnedRequestIdRef.current + 1;
    pinnedRequestIdRef.current = requestId;
    cancelPinnedRequest();

    const controller = new AbortController();
    pinnedControllerRef.current = controller;
    setPinnedLoading(true);

    try {
      const data = await api.get<PaginatedResponse<SnippetListItem>>(
        "/api/snippets?pinned=true&limit=100",
        { signal: controller.signal }
      );

      if (requestId !== pinnedRequestIdRef.current) return;
      setPinnedSnippets(data.items);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (requestId !== pinnedRequestIdRef.current) return;
      setPinnedSnippets([]);
    } finally {
      if (requestId !== pinnedRequestIdRef.current) return;
      setPinnedLoading(false);
    }
  }, [cancelPinnedRequest]);

  const reloadCurrentList = useCallback(async () => {
    if (isSearchMode) {
      setPinnedSnippets([]);
      setPinnedLoading(false);
      await fetchListPage(0, routeQuery);
      return;
    }

    fetchPinnedSnippets();
    await fetchListPage(0, "");
  }, [fetchListPage, fetchPinnedSnippets, isSearchMode, routeQuery]);

  useEffect(() => {
    setRawQuery((prev) => (prev === routeQuery ? prev : routeQuery));
    if (routeQuery) setSearchOpen(true);
  }, [routeQuery]);

  useEffect(() => {
    const normalized = normalizeSnippetSearchInput(rawQuery);

    if (!normalized) {
      if (routeQuery) {
        navigate({ to: "/", search: {}, replace: true });
      }
      return;
    }

    const timeout = window.setTimeout(() => {
      const nextQuery = getCommittedSnippetSearchQuery(normalized);
      if (nextQuery === routeQuery) return;
      navigate({ to: "/", search: nextQuery ? { q: nextQuery } : {}, replace: true });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [navigate, rawQuery, routeQuery]);

  useEffect(() => {
    setFetchError(null);
    setLoadingMore(false);

    if (isSearchMode) {
      cancelPinnedRequest();
      setPinnedLoading(false);
      fetchListPage(0, routeQuery);
      return () => cancelListRequest();
    }

    fetchPinnedSnippets();
    fetchListPage(0, "");

    return () => {
      cancelListRequest();
      cancelPinnedRequest();
    };
  }, [
    cancelListRequest,
    cancelPinnedRequest,
    fetchListPage,
    fetchPinnedSnippets,
    isSearchMode,
    routeQuery,
  ]);

  useEffect(() => {
    return () => {
      cancelListRequest();
      cancelPinnedRequest();
    };
  }, [cancelListRequest, cancelPinnedRequest]);

  async function handleDelete(id: string) {
    const inPinned = pinnedSnippets.some((snippet) => snippet.id === id);
    const inList = snippets.some((snippet) => snippet.id === id);
    const prevPinned = pinnedSnippets;
    const prevSnippets = snippets;
    const prevTotal = total;
    const prevOffset = offset;

    setPinnedSnippets((prev) => prev.filter((snippet) => snippet.id !== id));
    setSnippets((prev) => prev.filter((snippet) => snippet.id !== id));

    if (inList) {
      setTotal((prev) => Math.max(0, prev - 1));
      setOffset((prev) => Math.max(0, prev - 1));
    }

    try {
      await api.delete(`/api/snippets/${id}`);
    } catch {
      setPinnedSnippets(prevPinned);
      setSnippets(prevSnippets);
      setTotal(prevTotal);
      setOffset(prevOffset);
      await reloadCurrentList();
      return;
    }

    if (!isSearchMode && inPinned) {
      return;
    }
  }

  async function handleTogglePin(id: string) {
    const inPinned = pinnedSnippets.find((snippet) => snippet.id === id);
    const inRegular = snippets.find((snippet) => snippet.id === id);
    const snippet = inPinned ?? inRegular;
    if (!snippet) return;

    const prevPinned = pinnedSnippets;
    const prevSnippets = snippets;
    const prevTotal = total;
    const prevOffset = offset;

    setRecentlyMoved((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setRecentlyMoved((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 500);

    if (isSearchMode) {
      setSnippets((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_pinned: !item.is_pinned } : item))
      );

      try {
        await api.patch(`/api/snippets/${id}/pin`);
        await reloadCurrentList();
      } catch {
        setSnippets(prevSnippets);
      }
      return;
    }

    if (inPinned) {
      const unpinned = { ...snippet, is_pinned: false };
      setPinnedSnippets((prev) => prev.filter((item) => item.id !== id));
      setSnippets((prev) =>
        [unpinned, ...prev].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setTotal((prev) => prev + 1);
      setOffset((prev) => prev + 1);
    } else {
      const pinned = { ...snippet, is_pinned: true };
      setSnippets((prev) => prev.filter((item) => item.id !== id));
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

  async function handleColorChange(id: string, color: string | null) {
    const prevPinned = pinnedSnippets;
    const prevSnippets = snippets;
    const updater = (list: SnippetListItem[]) =>
      list.map((snippet) => (snippet.id === id ? { ...snippet, color } : snippet));

    setPinnedSnippets(updater);
    setSnippets(updater);

    try {
      await api.patch(`/api/snippets/${id}`, { color: color ?? "none" });
    } catch {
      setPinnedSnippets(prevPinned);
      setSnippets(prevSnippets);
    }
  }

  async function handleToggleVisibility(id: string) {
    const prevPinned = pinnedSnippets;
    const prevSnippets = snippets;
    const updater = (list: SnippetListItem[]) =>
      list.map((snippet) =>
        snippet.id === id ? { ...snippet, is_public: !snippet.is_public } : snippet
      );

    setPinnedSnippets(updater);
    setSnippets(updater);

    try {
      await api.patch(`/api/snippets/${id}/visibility`);
    } catch {
      setPinnedSnippets(prevPinned);
      setSnippets(prevSnippets);
    }
  }

  const hasMore = offset < total;

  const loadNextPage = useCallback(() => {
    if (loadingMore || fetchError || snippetsLoading) return;
    fetchListPage(offset, routeQuery);
  }, [fetchError, fetchListPage, loadingMore, offset, routeQuery, snippetsLoading]);

  const sentinelRef = useIntersectionObserver({
    onIntersect: loadNextPage,
    enabled: hasMore && !loadingMore && !fetchError && !snippetsLoading,
    rootMargin: "200px",
  });

  const groups = useMemo(() => groupSnippetsByDate(snippets), [snippets]);
  const showInitialLoading =
    snippets.length === 0 &&
    (snippetsLoading || (!isSearchMode && pinnedLoading && pinnedSnippets.length === 0));
  const showFirstSnippetEmptyState =
    !isSearchMode &&
    !snippetsLoading &&
    !pinnedLoading &&
    snippets.length === 0 &&
    pinnedSnippets.length === 0;
  const showSearchEmptyState = isSearchMode && !snippetsLoading && snippets.length === 0;
  const newLinkStyle = getNewLinkStyle();

  if (showInitialLoading) {
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

  if (showFirstSnippetEmptyState) {
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
          {user?.display_name
            ? `hey, ${user.display_name.split(" ")[0].toLowerCase()}`
            : `@${user?.username}`}
        </p>

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

        <div className="animate-fade-up delay-300">
          <Link
            to="/snippets/new"
            style={{
              ...newLinkStyle,
              padding: "12px 24px",
              height: "auto",
              borderRadius: "10px",
              fontSize: "14px",
              gap: "8px",
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
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "var(--color-border)",
              }}
            />
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "var(--color-border)",
              }}
            />
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "var(--color-border)",
              }}
            />
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
            <span style={{ color: "var(--color-text-muted)", opacity: 0.5 }}>
              {"// waiting for you...\n"}
            </span>
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: isMobile && searchOpen ? "14px" : "0",
          marginBottom: "36px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "20px",
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
          <p
            style={{
              margin: "6px 0 0 0",
              height: "14px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.06em",
              color: "var(--color-text-muted)",
              opacity: refreshing ? 0.7 : 0,
              transition: "opacity 0.15s ease",
            }}
            aria-hidden={!refreshing}
          >
            searching...
          </p>
        </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            <SnippetSearchControl
              isMobile={isMobile}
              open={searchOpen}
              value={rawQuery}
              onChange={setRawQuery}
              onOpen={() => setSearchOpen(true)}
              onClose={() => setSearchOpen(false)}
              onClear={() => {
                setRawQuery("");
                navigate({ to: "/", search: {}, replace: true });
              }}
              onCommitNow={() => {
                const nextQuery = getCommittedSnippetSearchQuery(rawQuery);
                navigate({ to: "/", search: nextQuery ? { q: nextQuery } : {}, replace: true });
              }}
              showInput={!isMobile}
            />

            <Link
              to="/snippets/new"
              style={newLinkStyle}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
              }}
            >
              <span style={{ fontSize: "15px" }}>+</span>
              New
            </Link>
          </div>
        </div>

        {isMobile && searchOpen && (
          <div style={{ width: "100%" }}>
            <SnippetSearchControl
              isMobile
              open
              value={rawQuery}
              onChange={setRawQuery}
              onOpen={() => setSearchOpen(true)}
              onClose={() => setSearchOpen(false)}
              onClear={() => {
                setRawQuery("");
                navigate({ to: "/", search: {}, replace: true });
              }}
              onCommitNow={() => {
                const nextQuery = getCommittedSnippetSearchQuery(rawQuery);
                navigate({ to: "/", search: nextQuery ? { q: nextQuery } : {}, replace: true });
              }}
              showTrigger={false}
            />
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "36px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {showSearchEmptyState ? (
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              padding: "32px 0 12px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                color: "var(--color-text-muted)",
                textAlign: "center",
              }}
            >
              No snippets match “{routeQuery}”.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setRawQuery("");
                  navigate({ to: "/", search: {}, replace: true });
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
                }}
              >
                Clear search
              </button>
              <Link
                to="/snippets/new"
                style={newLinkStyle}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
                }}
              >
                <span style={{ fontSize: "15px" }}>+</span>
                New
              </Link>
            </div>
          </section>
        ) : (
          <>
            {!isSearchMode && pinnedSnippets.length > 0 && (
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
                      onColorChange={handleColorChange}
                      onToggleVisibility={handleToggleVisibility}
                      animateEntrance={recentlyMoved.has(snippet.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {isSearchMode ? (
              <section>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {snippets.map((snippet) => (
                    <SnippetCard
                      key={snippet.id}
                      snippet={snippet}
                      onDelete={handleDelete}
                      onTogglePin={handleTogglePin}
                      onColorChange={handleColorChange}
                      onToggleVisibility={handleToggleVisibility}
                      animateEntrance={recentlyMoved.has(snippet.id)}
                    />
                  ))}
                </div>
              </section>
            ) : (
              groups.map((group) => (
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
                      <SnippetCard
                        key={snippet.id}
                        snippet={snippet}
                        onDelete={handleDelete}
                        onTogglePin={handleTogglePin}
                        onColorChange={handleColorChange}
                        onToggleVisibility={handleToggleVisibility}
                        animateEntrance={recentlyMoved.has(snippet.id)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>

      {hasMore && !fetchError && !showSearchEmptyState && (
        <div ref={sentinelRef} style={{ height: "1px", width: "100%" }} aria-hidden="true" />
      )}

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
            type="button"
            onClick={() => {
              setFetchError(null);
              fetchListPage(offset, routeQuery);
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

      {!hasMore && snippets.length > 0 && !showSearchEmptyState && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "32px 0 16px",
          }}
        >
          <div
            style={{
              flex: 1,
              maxWidth: "80px",
              height: "1px",
              background: "var(--color-border)",
              opacity: 0.5,
            }}
          />
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
          <div
            style={{
              flex: 1,
              maxWidth: "80px",
              height: "1px",
              background: "var(--color-border)",
              opacity: 0.5,
            }}
          />
        </div>
      )}
    </div>
  );
}
