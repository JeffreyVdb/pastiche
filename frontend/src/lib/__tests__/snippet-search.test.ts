import { describe, expect, it } from "vitest";
import {
  getCommittedSnippetSearchQuery,
  getSnippetSearchFilters,
  getSnippetSearchTokens,
  normalizeSnippetSearchInput,
} from "../snippet-search";

describe("snippet-search", () => {
  it("normalizes surrounding and repeated whitespace", () => {
    expect(normalizeSnippetSearchInput("  debounce   hook  ")).toBe("debounce hook");
  });

  it("extracts lowercased searchable tokens", () => {
    expect(getSnippetSearchTokens("  JWT   Token  ")).toEqual(["jwt", "token"]);
  });

  it("ignores queries that do not contain a searchable token", () => {
    expect(getCommittedSnippetSearchQuery(" a ")).toBe("");
  });

  it("keeps a normalized committed query when it is searchable", () => {
    expect(getCommittedSnippetSearchQuery("  Debounce   Hook ")).toBe("Debounce Hook");
  });

  it("extracts include and exclude label tokens from a mixed query", () => {
    expect(getSnippetSearchFilters("  debounce   #Frontend !#Bug -#wip ")).toEqual({
      textQuery: "debounce",
      includeLabels: ["frontend"],
      excludeLabels: ["bug", "wip"],
    });
  });

  it("drops label-only queries without searchable text", () => {
    expect(getCommittedSnippetSearchQuery(" #frontend !#bug ")).toBe("");
    expect(getSnippetSearchFilters(" #frontend !#bug ")).toEqual({
      textQuery: "",
      includeLabels: ["frontend"],
      excludeLabels: ["bug"],
    });
  });
});
