import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { EditSnippet } from "@/pages/EditSnippet";

export const Route = createFileRoute("/snippets/$snippetId_/edit")({
  component: EditSnippetPage,
});

function EditSnippetPage() {
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

  if (!user) return <Navigate to="/sign-in" />;

  return (
    <AppLayout>
      <EditSnippet snippetId={snippetId} />
    </AppLayout>
  );
}
