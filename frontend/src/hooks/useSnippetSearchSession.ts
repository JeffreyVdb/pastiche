import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeSnippetSearchInput } from "@/lib/snippet-search";

export const SEARCH_DEBOUNCE_MS = 250;

type NavigateToRoot = (options: { to: "/"; search: Record<string, string>; replace: boolean }) => void;

export interface UseSnippetSearchSessionOptions {
  routeQuery: string;
  navigate: NavigateToRoot;
}

export function useSnippetSearchSession({ routeQuery, navigate }: UseSnippetSearchSessionOptions) {
  const [rawQuery, setRawQuery] = useState(routeQuery);
  const [searchQuery, setSearchQuery] = useState(routeQuery);
  const [searchOpen, setSearchOpen] = useState(Boolean(routeQuery));
  const skipNextUrlSyncRef = useRef(false);

  useEffect(() => {
    setRawQuery((prev) => {
      if (normalizeSnippetSearchInput(prev) === routeQuery) return prev;
      return routeQuery;
    });
    setSearchQuery(routeQuery);
    if (routeQuery) setSearchOpen(true);
  }, [routeQuery]);

  useEffect(() => {
    const normalized = normalizeSnippetSearchInput(rawQuery);

    if (!normalized) {
      setSearchQuery("");
      return;
    }

    const timeout = window.setTimeout(() => {
      setSearchQuery(normalized);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [rawQuery]);

  useEffect(() => {
    if (skipNextUrlSyncRef.current) {
      skipNextUrlSyncRef.current = false;
      return;
    }

    if (searchQuery === routeQuery) return;
    navigate({ to: "/", search: searchQuery ? { q: searchQuery } : {}, replace: true });
  }, [navigate, routeQuery, searchQuery]);

  const clearSearch = useCallback(() => {
    skipNextUrlSyncRef.current = true;
    setRawQuery("");
    setSearchQuery("");
    navigate({ to: "/", search: {}, replace: true });
  }, [navigate]);

  const commitSearchNow = useCallback(() => {
    setSearchQuery(normalizeSnippetSearchInput(rawQuery));
  }, [rawQuery]);

  return {
    rawQuery,
    searchQuery,
    searchOpen,
    setRawQuery,
    setSearchOpen,
    clearSearch,
    commitSearchNow,
  };
}
