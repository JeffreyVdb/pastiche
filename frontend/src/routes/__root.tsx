import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
