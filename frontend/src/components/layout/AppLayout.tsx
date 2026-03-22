import type { ReactNode } from "react";
import { TopBar } from "./TopBar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <TopBar />
      <main
        style={{
          flex: 1,
          paddingTop: "calc(56px + env(safe-area-inset-top))",
          paddingBottom: "env(safe-area-inset-bottom)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </main>
    </div>
  );
}
