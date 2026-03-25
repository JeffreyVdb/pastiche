const HIGHLIGHTER_LANGUAGE_MAP: Record<string, string> = {
  "markdown tasks": "markdown",
};

export function getHighlighterLanguage(language: string): string | undefined {
  if (language === "autodetect") return undefined;
  return HIGHLIGHTER_LANGUAGE_MAP[language] ?? language;
}

export function isMarkdownLike(language: string): boolean {
  return language === "markdown" || language === "markdown tasks";
}
