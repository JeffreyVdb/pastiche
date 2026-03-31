import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ViewSnippet } from "@/pages/ViewSnippet";
import { parseSnippetDetailView } from "@/lib/snippet-detail-view";

export const Route = createFileRoute("/s/$code")({
  validateSearch: (search: Record<string, unknown>) => {
    const view = parseSnippetDetailView(search.view);
    return view ? { view } : {};
  },
  component: ShortCodePage,
});

function ShortCodePage() {
  const { code } = Route.useParams();
  const { view } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const [snippetId, setSnippetId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<{ snippet_id: string }>(`/api/snippets/resolve/${code}`)
      .then((data) => setSnippetId(data.snippet_id))
      .catch(() => setError(true));
  }, [code]);

  if (error) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", background: "var(--color-bg)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>snippet not found</span>
        <a href="/" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-accent)", textDecoration: "none" }}>← back</a>
      </div>
    );
  }

  if (authLoading || !snippetId) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <div style={{ width: "20px", height: "20px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (user) {
    return (
      <AppLayout>
        <ViewSnippet snippetId={snippetId} requestedView={view} />
      </AppLayout>
    );
  }

  return <ViewSnippet snippetId={snippetId} requestedView={view} />;
}
