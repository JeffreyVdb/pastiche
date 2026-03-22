import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/s/$code")({
  component: ShortCodeRedirect,
});

function ShortCodeRedirect() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<{ snippet_id: string }>(`/api/snippets/resolve/${code}`)
      .then((data) => {
        navigate({
          to: "/snippets/$snippetId",
          params: { snippetId: data.snippet_id },
          replace: true,
        });
      })
      .catch(() => setError(true));
  }, [code, navigate]);

  if (error) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", background: "var(--color-bg)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>snippet not found</span>
        <a href="/" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-accent)", textDecoration: "none" }}>← back</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
      <div style={{ width: "20px", height: "20px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}
