const WHITESPACE_RE = /\s+/g;
const LABEL_TOKEN_RE = /^(?<prefix>!|-)?#(?<name>.+)$/;

export const MIN_SNIPPET_SEARCH_TOKEN_LENGTH = 2;

export interface SnippetSearchFilters {
  textQuery: string;
  includeLabels: string[];
  excludeLabels: string[];
}

export function normalizeSnippetSearchInput(value: string): string {
  return value.trim().replace(WHITESPACE_RE, " ");
}

export function getSnippetSearchFilters(value: string): SnippetSearchFilters {
  const normalized = normalizeSnippetSearchInput(value);
  if (!normalized) {
    return { textQuery: "", includeLabels: [], excludeLabels: [] };
  }

  const textTokens: string[] = [];
  const includeLabels: string[] = [];
  const excludeLabels: string[] = [];

  for (const rawToken of normalized.split(" ")) {
    const token = rawToken.trim();
    if (!token) continue;

    const labelMatch = token.match(LABEL_TOKEN_RE);
    if (!labelMatch?.groups?.name) {
      textTokens.push(token);
      continue;
    }

    const labelName = labelMatch.groups.name.trim().toLowerCase();
    if (!labelName) continue;

    if (labelMatch.groups.prefix) {
      excludeLabels.push(labelName);
    } else {
      includeLabels.push(labelName);
    }
  }

  return {
    textQuery: textTokens.join(" "),
    includeLabels,
    excludeLabels,
  };
}

export function getSnippetSearchTokens(value: string): string[] {
  const normalized = getSnippetSearchFilters(value).textQuery.toLowerCase();
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => token.length >= MIN_SNIPPET_SEARCH_TOKEN_LENGTH);
}

export function getCommittedSnippetSearchQuery(value: string): string {
  const normalized = getSnippetSearchFilters(value).textQuery;
  return getSnippetSearchTokens(normalized).length > 0 ? normalized : "";
}
