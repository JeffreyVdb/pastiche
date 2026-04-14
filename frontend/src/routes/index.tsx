import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { normalizeSnippetSearchInput } from "@/lib/snippet-search";
import { Home } from "@/pages/Home";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    const q = typeof search.q === "string" ? normalizeSnippetSearchInput(search.q) : "";
    return q ? { q } : {};
  },
  component: IndexPage,
});

function IndexPage() {
  const { user, loading } = useAuth();
  const { q } = Route.useSearch();

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

  if (!user) {
    return <Navigate to="/sign-in" />;
  }

  return (
    <AppLayout>
      <Home initialQuery={q} />
    </AppLayout>
  );
}
