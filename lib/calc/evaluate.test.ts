import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";

describe("evaluate", () => {
  it("adds quantities with matching units", () => {
    const result = evaluate("12 kN + 3 kN");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.formatted).toContain("15");
      expect(result.formatted).toContain("kN");
      expect(result.tex.length).toBeGreaterThan(0);
    }
  });

  it("converts and evaluates dimensional expressions", () => {
    const result = evaluate("700 MPa * 16 mm^2");
    expect(result.ok).toBe(true);
  });

  it("flags a unit mismatch as a typed error", () => {
    const result = evaluate("12 kN + 3 mm");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unit_mismatch");
    }
  });

  it("reports a parse error for malformed input", () => {
    const result = evaluate("3 * (");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("parse_error");
    }
  });

  it("is deterministic — same input, same output", () => {
    expect(evaluate("2 m + 50 cm")).toEqual(evaluate("2 m + 50 cm"));
  });
});
