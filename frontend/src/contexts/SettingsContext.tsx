import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CODE_FONTS,
  DEFAULT_CODE_FONT_ID,
  DEFAULT_CODE_FONT_SIZE,
  DEFAULT_MARKDOWN_FONT_ID,
  DEFAULT_MARKDOWN_FONT_SIZE,
  MARKDOWN_FONTS,
  ensureFontLoaded,
  fontCssValue,
  getFontById,
} from "@/lib/fonts";

interface SettingsContextValue {
  codeFontId: string;
  markdownFontId: string;
  codeFontSize: number;
  markdownFontSize: number;
  wordWrap: boolean;
  setCodeFont: (id: string) => void;
  setMarkdownFont: (id: string) => void;
  setCodeFontSize: (size: number) => void;
  setMarkdownFontSize: (size: number) => void;
  setWordWrap: (wrap: boolean) => void;
}

export const SettingsContext = createContext<SettingsContextValue>({
  codeFontId: DEFAULT_CODE_FONT_ID,
  markdownFontId: DEFAULT_MARKDOWN_FONT_ID,
  codeFontSize: DEFAULT_CODE_FONT_SIZE,
  markdownFontSize: DEFAULT_MARKDOWN_FONT_SIZE,
  wordWrap: false,
  setCodeFont: () => {},
  setMarkdownFont: () => {},
  setCodeFontSize: () => {},
  setMarkdownFontSize: () => {},
  setWordWrap: () => {},
});

const STORAGE_KEY = "pastiche-settings";

interface StoredSettings {
  codeFont?: string;
  markdownFont?: string;
  codeFontSize?: number;
  markdownFontSize?: number;
  wordWrap?: boolean;
}

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredSettings;
  } catch {
    // ignore
  }
  return {};
}

function applySettings(
  codeFontId: string,
  markdownFontId: string,
  codeFontSize: number,
  markdownFontSize: number,
) {
  const codeFont = getFontById(CODE_FONTS, codeFontId);
  const markdownFont = getFontById(MARKDOWN_FONTS, markdownFontId);
  const root = document.documentElement;
  root.style.setProperty("--font-mono", fontCssValue(codeFont));
  root.style.setProperty("--font-markdown", fontCssValue(markdownFont));
  root.style.setProperty("--font-size-code", `${codeFontSize}px`);
  root.style.setProperty("--font-size-markdown", `${markdownFontSize}px`);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [codeFontId, setCodeFontId] = useState<string>(() => {
    const stored = loadSettings();
    return stored.codeFont ?? DEFAULT_CODE_FONT_ID;
  });

  const [markdownFontId, setMarkdownFontId] = useState<string>(() => {
    const stored = loadSettings();
    return stored.markdownFont ?? DEFAULT_MARKDOWN_FONT_ID;
  });

  const [codeFontSize, setCodeFontSizeState] = useState<number>(() => {
    const stored = loadSettings();
    return stored.codeFontSize ?? DEFAULT_CODE_FONT_SIZE;
  });

  const [markdownFontSize, setMarkdownFontSizeState] = useState<number>(() => {
    const stored = loadSettings();
    return stored.markdownFontSize ?? DEFAULT_MARKDOWN_FONT_SIZE;
  });

  const [wordWrap, setWordWrapState] = useState<boolean>(() => {
    const stored = loadSettings();
    return stored.wordWrap ?? window.matchMedia("(max-width: 640px)").matches;
  });

  useEffect(() => {
    const codeFont = getFontById(CODE_FONTS, codeFontId);
    const markdownFont = getFontById(MARKDOWN_FONTS, markdownFontId);
    ensureFontLoaded(codeFont);
    ensureFontLoaded(markdownFont);
    applySettings(codeFontId, markdownFontId, codeFontSize, markdownFontSize);
  }, [codeFontId, markdownFontId, codeFontSize, markdownFontSize]);

  const setCodeFont = useCallback((id: string) => {
    setCodeFontId(id);
    const stored = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, codeFont: id }));
  }, []);

  const setMarkdownFont = useCallback((id: string) => {
    setMarkdownFontId(id);
    const stored = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, markdownFont: id }));
  }, []);

  const setCodeFontSize = useCallback((size: number) => {
    setCodeFontSizeState(size);
    const stored = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, codeFontSize: size }));
  }, []);

  const setMarkdownFontSize = useCallback((size: number) => {
    setMarkdownFontSizeState(size);
    const stored = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, markdownFontSize: size }));
  }, []);

  const setWordWrap = useCallback((wrap: boolean) => {
    setWordWrapState(wrap);
    const stored = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, wordWrap: wrap }));
  }, []);

  const value = useMemo(
    () => ({
      codeFontId,
      markdownFontId,
      codeFontSize,
      markdownFontSize,
      wordWrap,
      setCodeFont,
      setMarkdownFont,
      setCodeFontSize,
      setMarkdownFontSize,
      setWordWrap,
    }),
    [codeFontId, markdownFontId, codeFontSize, markdownFontSize, wordWrap, setCodeFont, setMarkdownFont, setCodeFontSize, setMarkdownFontSize, setWordWrap],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}
