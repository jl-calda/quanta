import { describe, expect, it } from "vitest";
import { evaluate } from "@/lib/calc";
import { MATH_PALETTE, splitResultUnit } from "./math-display";

describe("splitResultUnit", () => {
  it("splits a unit-bearing result into magnitude + unit", () => {
    const res = evaluate("82.4 kN");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const { magnitude, unit } = splitResultUnit(res.formatted, res.value);
    expect(unit).toBeTruthy();
    expect(unit).toContain("N");
    // Reconstruction is lossless — exactly one leading magnitude token.
    expect(`${magnitude} ${unit}`).toBe(res.formatted);
  });

  it("keeps a compound unit intact", () => {
    const res = evaluate("3 kN * 2 m");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const { magnitude, unit } = splitResultUnit(res.formatted, res.value);
    expect(unit).toBeTruthy();
    expect(magnitude.includes(" ")).toBe(false);
    expect(`${magnitude} ${unit}`).toBe(res.formatted);
  });

  it("returns no unit for a dimensionless result", () => {
    const res = evaluate("0.15");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(splitResultUnit(res.formatted, res.value)).toEqual({ magnitude: res.formatted, unit: null });
  });

  it("returns no unit when the value is not a mathjs unit", () => {
    expect(splitResultUnit("hello world", "hello world")).toEqual({
      magnitude: "hello world",
      unit: null,
    });
  });
});

describe("MATH_PALETTE", () => {
  it("has the ten operator keys from Mockup 6.1 Frame A", () => {
    expect(MATH_PALETTE).toHaveLength(10);
  });

  it("every key carries a glyph, hint, label, latex and text", () => {
    for (const item of MATH_PALETTE) {
      expect(item.glyph.length).toBeGreaterThan(0);
      expect(item.hint.length).toBeGreaterThan(0);
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.latex.length).toBeGreaterThan(0);
      expect(item.text.length).toBeGreaterThan(0);
    }
  });

  it("labels are unique (they are used as React keys)", () => {
    const labels = MATH_PALETTE.map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
