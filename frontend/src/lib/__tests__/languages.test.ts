import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../languages";

describe("LANGUAGES", () => {
  it("includes diff in the available syntax list", () => {
    expect(LANGUAGES).toContain("diff");
  });
});
