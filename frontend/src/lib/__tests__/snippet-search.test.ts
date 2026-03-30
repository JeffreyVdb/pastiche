import { describe, expect, it } from "vitest";
import {
  getCommittedSnippetSearchQuery,
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
});
