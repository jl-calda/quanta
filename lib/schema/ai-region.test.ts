import { describe, expect, it } from "vitest";
import { validateAiRegions } from "./ai-region";

describe("validateAiRegions", () => {
  it("accepts a well-formed region proposal", () => {
    const result = validateAiRegions({
      regions: [{ id: "r1", indent: 0, type: "math", source: "F := m * a" }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.regions[0].type).toBe("math");
  });

  it("rejects an empty list, a missing field, and non-objects", () => {
    expect(validateAiRegions({ regions: [] }).ok).toBe(false);
    expect(validateAiRegions({ regions: [{ type: "math" }] }).ok).toBe(false);
    expect(validateAiRegions("nope").ok).toBe(false);
    expect(validateAiRegions(null).ok).toBe(false);
  });

  it("returns an app-voice error message on failure", () => {
    const result = validateAiRegions({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});
