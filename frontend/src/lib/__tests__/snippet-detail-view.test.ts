import { describe, expect, it } from "vitest";
import {
  getAvailableSnippetDetailViews,
  getDefaultSnippetDetailView,
  normalizeSnippetDetailView,
  parseSnippetDetailView,
} from "../snippet-detail-view";

describe("snippet detail view helpers", () => {
  it("parses known views", () => {
    expect(parseSnippetDetailView("tasks")).toBe("tasks");
    expect(parseSnippetDetailView("preview")).toBe("preview");
    expect(parseSnippetDetailView("source")).toBe("source");
  });

  it("ignores unknown views", () => {
    expect(parseSnippetDetailView("editor")).toBeUndefined();
    expect(parseSnippetDetailView(null)).toBeUndefined();
  });

  it("returns the correct defaults by language", () => {
    expect(getDefaultSnippetDetailView("markdown tasks")).toBe("tasks");
    expect(getDefaultSnippetDetailView("markdown")).toBe("preview");
    expect(getDefaultSnippetDetailView("typescript")).toBe("source");
  });

  it("returns only supported views for each language", () => {
    expect(getAvailableSnippetDetailViews("markdown tasks")).toEqual(["tasks", "preview", "source"]);
    expect(getAvailableSnippetDetailViews("markdown")).toEqual(["preview", "source"]);
    expect(getAvailableSnippetDetailViews("python")).toEqual(["source"]);
  });

  it("normalizes unsupported views to the language default", () => {
    expect(normalizeSnippetDetailView("markdown tasks", "source")).toBe("source");
    expect(normalizeSnippetDetailView("markdown", "tasks")).toBe("preview");
    expect(normalizeSnippetDetailView("python", "preview")).toBe("source");
    expect(normalizeSnippetDetailView("markdown tasks")).toBe("tasks");
  });
});
