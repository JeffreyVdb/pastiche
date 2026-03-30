export type SnippetDetailView = "tasks" | "preview" | "source";

const ALL_VIEWS: readonly SnippetDetailView[] = ["tasks", "preview", "source"];

export function parseSnippetDetailView(value: unknown): SnippetDetailView | undefined {
  if (typeof value !== "string") return undefined;
  return ALL_VIEWS.find((view) => view === value);
}

export function getAvailableSnippetDetailViews(language: string): SnippetDetailView[] {
  if (language === "markdown tasks") return ["tasks", "preview", "source"];
  if (language === "markdown") return ["preview", "source"];
  return ["source"];
}

export function getDefaultSnippetDetailView(language: string): SnippetDetailView {
  if (language === "markdown tasks") return "tasks";
  if (language === "markdown") return "preview";
  return "source";
}

export function normalizeSnippetDetailView(
  language: string,
  requestedView?: SnippetDetailView,
): SnippetDetailView {
  const availableViews = getAvailableSnippetDetailViews(language);
  return requestedView && availableViews.includes(requestedView)
    ? requestedView
    : getDefaultSnippetDetailView(language);
}
