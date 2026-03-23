import { useRouter } from "@tanstack/react-router";

interface RouteErrorProps {
  error: Error;
}

export function RouteError({ error }: RouteErrorProps) {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        minHeight: "60dvh",
        color: "var(--color-text, #ebdbb2)",
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <span style={{ color: "var(--color-text-muted, #928374)", fontSize: "13px" }}>
        {error.message || "An unexpected error occurred."}
      </span>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => router.navigate({ to: "/" })}
          style={{
            padding: "8px 20px",
            background: "none",
            border: "1px solid var(--color-border, #504945)",
            borderRadius: "8px",
            color: "var(--color-text-muted, #928374)",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Go home
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 20px",
            background: "none",
            border: "1px solid var(--color-accent, #8ec07c)",
            borderRadius: "8px",
            color: "var(--color-accent, #8ec07c)",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}
