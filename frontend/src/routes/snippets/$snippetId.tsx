import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ViewSnippet } from "@/pages/ViewSnippet";

export const Route = createFileRoute("/snippets/$snippetId")({
  component: ViewSnippetPage,
});

function ViewSnippetPage() {
  const { snippetId } = Route.useParams();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg)",
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

  if (user) {
    return (
      <AppLayout>
        <ViewSnippet snippetId={snippetId} />
      </AppLayout>
    );
  }

  // Unauthenticated: try to load without AppLayout
  // Public snippets will load; private ones will show "snippet not found"
  return <ViewSnippet snippetId={snippetId} />;
}
