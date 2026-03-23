import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          minHeight: "100dvh",
          background: "#282828",
          color: "#ebdbb2",
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <span>Something went wrong.</span>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 20px",
              background: "none",
              border: "1px solid #8ec07c",
              borderRadius: "8px",
              color: "#8ec07c",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Reload app
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: "8px 20px",
              background: "none",
              border: "1px solid #504945",
              borderRadius: "8px",
              color: "#928374",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Clear data & reload
          </button>
        </div>
      </div>
    );
  }
}
