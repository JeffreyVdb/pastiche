const WHITESPACE_RE = /\s+/g;

export const MIN_SNIPPET_SEARCH_TOKEN_LENGTH = 2;

export function normalizeSnippetSearchInput(value: string): string {
  return value.trim().replace(WHITESPACE_RE, " ");
}

export function getSnippetSearchTokens(value: string): string[] {
  const normalized = normalizeSnippetSearchInput(value).toLowerCase();
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => token.length >= MIN_SNIPPET_SEARCH_TOKEN_LENGTH);
}

export function getCommittedSnippetSearchQuery(value: string): string {
  const normalized = normalizeSnippetSearchInput(value);
  return getSnippetSearchTokens(normalized).length > 0 ? normalized : "";
}
