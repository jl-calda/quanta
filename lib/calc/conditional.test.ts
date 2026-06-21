import { describe, expect, it } from "vitest";
import { applyConditional } from "./conditional";
import { math } from "./math";
import type { CondRule } from "./types";

const pass: CondRule = { op: "<=", value: 1, style: { label: "OK", color: "pass" } };
const fail: CondRule = { op: ">", value: 1, style: { label: "FAIL", color: "error" } };

describe("applyConditional", () => {
  it("applies a matching rule", () => {
    expect(applyConditional(0.85, [pass])).toEqual({ label: "OK", color: "pass" });
  });

  it("returns the first matching rule", () => {
    expect(applyConditional(0.85, [fail, pass])?.label).toBe("OK");
    expect(applyConditional(1.2, [fail, pass])?.label).toBe("FAIL");
  });

  it("returns undefined when nothing matches", () => {
    expect(applyConditional(2, [pass])).toBeUndefined();
  });

  it("compares a unit result by its display magnitude", () => {
    const ratio = math.evaluate("12 kN / 80 kN"); // 0.15 (dimensionless)
    expect(applyConditional(ratio, [pass])?.label).toBe("OK");
  });

  it("returns undefined with no rules", () => {
    expect(applyConditional(0.85, undefined)).toBeUndefined();
    expect(applyConditional(0.85, [])).toBeUndefined();
  });
});
