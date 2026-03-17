import type { Snippet } from "@/types/snippet";

export interface SnippetGroup {
  label: string;
  snippets: Snippet[];
}

export function groupSnippetsByDate(snippets: Snippet[]): SnippetGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfLastWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfLastMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfLastYear = new Date(startOfToday.getTime() - 365 * 24 * 60 * 60 * 1000);

  const groups: SnippetGroup[] = [
    { label: "Today", snippets: [] },
    { label: "Last week", snippets: [] },
    { label: "Last month", snippets: [] },
    { label: "Last year", snippets: [] },
    { label: "A long time ago", snippets: [] },
  ];

  for (const snippet of snippets) {
    const date = new Date(snippet.created_at);
    if (date >= startOfToday) {
      groups[0].snippets.push(snippet);
    } else if (date >= startOfLastWeek) {
      groups[1].snippets.push(snippet);
    } else if (date >= startOfLastMonth) {
      groups[2].snippets.push(snippet);
    } else if (date >= startOfLastYear) {
      groups[3].snippets.push(snippet);
    } else {
      groups[4].snippets.push(snippet);
    }
  }

  return groups.filter((g) => g.snippets.length > 0);
}
