import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME_ID,
  getThemeById,
  type SyntaxTheme,
} from "@/lib/syntax-themes";

interface ThemeContextValue {
  themeId: string;
  theme: SyntaxTheme;
  resolved: "light" | "dark";
  setTheme: (id: string) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME_ID,
  theme: getThemeById(DEFAULT_THEME_ID),
  resolved: "dark",
  setTheme: () => {},
});

const STORAGE_KEY = "pastiche-theme";

function migrateStoredId(stored: string | null): string {
  if (!stored) return DEFAULT_THEME_ID;
  if (stored === "dark") return "gruvbox-dark";
  if (stored === "light") return "github";
  if (stored === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "github"
      : "gruvbox-dark";
  }
  return stored;
}

function applyTheme(theme: SyntaxTheme) {
  const root = document.documentElement;
  const { appColors, category } = theme;

  root.style.setProperty("--color-bg", appColors.bg);
  root.style.setProperty("--color-surface", appColors.surface);
  root.style.setProperty("--color-surface-2", appColors.surface2);
  root.style.setProperty("--color-border", appColors.border);
  root.style.setProperty("--color-text", appColors.text);
  root.style.setProperty("--color-text-muted", appColors.textMuted);
  root.style.setProperty("--color-accent", appColors.accent);
  root.style.setProperty("--color-accent-dim", appColors.accentDim);
  root.style.setProperty("--color-accent-hover", appColors.accentHover);

  root.classList.toggle("dark", category === "dark");
  root.classList.toggle("light", category === "light");
  root.style.colorScheme = category;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return migrateStoredId(stored);
  });

  const theme = useMemo(() => getThemeById(themeId), [themeId]);
  const resolved = theme.category;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((id: string) => {
    setThemeIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const value = useMemo(
    () => ({ themeId, theme, resolved, setTheme }),
    [themeId, theme, resolved, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
