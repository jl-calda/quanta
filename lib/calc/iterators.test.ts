import { describe, expect, it } from "vitest";
import type { Unit } from "mathjs";
import {
  evaluate,
  evaluateSheet,
  CalcEngine,
  parseRegion,
  normalizeRanges,
  normalizeSource,
  sourceToLatex,
  math,
} from "./index";
import type { RegionInput, RegionResult, SheetResult } from "./types";

const byId = (sheet: SheetResult, id: string): RegionResult =>
  sheet.regions.find((r) => r.id === id)!;

const num = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (math.isUnit(value)) return (value as Unit).toNumber((value as Unit).formatUnits());
  throw new Error(`not numeric: ${String(value)}`);
};

const arr = (value: unknown): unknown[] =>
  math.isMatrix(value) ? (value as { toArray(): unknown[] }).toArray() : (value as unknown[]);

/** Evaluate, assert success, and return the raw value. */
const okValue = (src: string): unknown => {
  const r = evaluate(src);
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

/* ------------------------------------------------------------------ *
 * normalizeRanges — the `..` → __quantaRange rewrite (pure string)
 * ------------------------------------------------------------------ */

describe("normalizeRanges", () => {
  it("is a no-op when there is no range operator", () => {
    expect(normalizeRanges("2 + 2")).toBe("2 + 2");
    expect(normalizeRanges("max(a, b)")).toBe("max(a, b)");
  });

  it("rewrites a simple range", () => {
    expect(normalizeRanges("1..n")).toBe("__quantaRange(1, n)");
    expect(normalizeRanges("1.5..2.5")).toBe("__quantaRange(1.5, 2.5)");
  });

  it("rewrites a stepped range from two anchors", () => {
    expect(normalizeRanges("1, 3 .. 11")).toBe("__quantaRange(1, 11, (3)-(1))");
  });

  it("ignores a comma that belongs to a function call, not a step", () => {
    expect(normalizeRanges("max(a, b)..n")).toBe("__quantaRange(max(a, b), n)");
  });

  it("leaves a half-typed range for the parser to flag", () => {
    expect(normalizeRanges("..5")).toBe("..5");
    expect(normalizeRanges("5..")).toBe("5..");
  });

  it("does not disturb normalizeSource on plain input", () => {
    expect(normalizeSource("  2 + 2  ")).toBe("2 + 2");
  });
});

/* ------------------------------------------------------------------ *
 * Range variables
 * ------------------------------------------------------------------ */

describe("range variables", () => {
  it("builds an inclusive integer vector", () => {
    const r = evaluate("1..5");
    expect(r.ok).toBe(true);
    if (r.ok) expect(arr(r.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it("supports a stepped range", () => {
    const r = evaluate("1, 3 .. 11");
    expect(r.ok).toBe(true);
    if (r.ok) expect(arr(r.value)).toEqual([1, 3, 5, 7, 9, 11]);
  });

  it("carries units through unit-bearing bounds", () => {
    const r = evaluate("0 m, 1 m .. 3 m");
    expect(r.ok).toBe(true);
    if (r.ok) expect(arr(r.value).map(num)).toEqual([0, 1, 2, 3]);
  });

  it("depends only on names in its bounds", () => {
    expect(parseRegion("i := 1..n").deps).toEqual(["n"]);
  });

  it("rejects a range that would be impossibly large", () => {
    const r = evaluate("1..1e9");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("domain");
  });
});

/* ------------------------------------------------------------------ *
 * Summation
 * ------------------------------------------------------------------ */

describe("summation", () => {
  it("evaluates the 4-arg bounded form", () => {
    const r = evaluate("summation(i, 1, 5, i^2)");
    expect(r.ok).toBe(true);
    if (r.ok) expect(num(r.value)).toBe(55);
  });

  it("binds the index locally — it is not a dependency", () => {
    expect(parseRegion("S := summation(i, 1, n, i^2)").deps).toEqual(["n"]);
  });

  it("keeps the range variable as a dependency in the 2-arg form", () => {
    expect(parseRegion("S := summation(i, i^2)").deps).toEqual(["i"]);
  });

  it("DONE WHEN: a range variable drives a summation across regions", () => {
    const regions: RegionInput[] = [
      { id: "n", source: "n := 5" },
      { id: "i", source: "i := 1..n" },
      { id: "S", source: "S := summation(i, i^2)" },
    ];
    const sheet = evaluateSheet(regions);
    expect(sheet.status).toBe("current");
    expect(num(byId(sheet, "S").value)).toBe(55); // 1+4+9+16+25
  });

  it("recalculates when the driving range variable changes", () => {
    const engine = new CalcEngine([
      { id: "n", source: "n := 5" },
      { id: "i", source: "i := 1..n" },
      { id: "S", source: "S := summation(i, i^2)" },
    ]);
    expect(num(byId(engine.getResult(), "S").value)).toBe(55);
    engine.updateRegion("n", "n := 6");
    expect(num(byId(engine.getResult(), "S").value)).toBe(91); // +36
  });

  it("carries units through a summation of quantities", () => {
    const r = evaluate("summation(i, 1, 3, i * 2 kN)");
    expect(r.ok).toBe(true);
    if (r.ok) expect(num(r.value)).toBe(12); // (1+2+3)*2 kN
  });

  it("reports a typed error for a malformed call", () => {
    const r = evaluate("summation(3)");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("domain");
  });
});

/* ------------------------------------------------------------------ *
 * Product
 * ------------------------------------------------------------------ */

describe("product", () => {
  it("evaluates the 4-arg bounded form (factorial)", () => {
    const r = evaluate("product(i, 1, 5, i)");
    expect(r.ok).toBe(true);
    if (r.ok) expect(num(r.value)).toBe(120);
  });

  it("evaluates the range-driven 2-arg form", () => {
    const sheet = evaluateSheet([
      { id: "k", source: "k := 1..4" },
      { id: "P", source: "P := product(k, k)" },
    ]);
    expect(num(byId(sheet, "P").value)).toBe(24);
  });
});

/* ------------------------------------------------------------------ *
 * Definite integral (numeric, unit-aware)
 * ------------------------------------------------------------------ */

describe("integral", () => {
  const close = (v: unknown, target: number) => expect(num(v)).toBeCloseTo(target, 6);

  it("integrates a polynomial", () => {
    const r = evaluate("integral(x, 0, 1, x^2)");
    expect(r.ok).toBe(true);
    if (r.ok) close(r.value, 1 / 3);
  });

  it("integrates a transcendental function", () => {
    const r = evaluate("integral(x, 0, pi, sin(x))");
    expect(r.ok).toBe(true);
    if (r.ok) close(r.value, 2);
  });

  it("is unit-aware: result carries unit(f)·unit(x)", () => {
    const r = evaluate("integral(x, 0 m, 2 m, x)");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(math.isUnit(r.value)).toBe(true);
      expect((r.value as Unit).toNumber("m^2")).toBeCloseTo(2, 6);
    }
  });

  it("binds the variable of integration locally", () => {
    expect(parseRegion("A := integral(x, 0, L, x^2)").deps).toEqual(["L"]);
  });

  it("rejects mismatched limit units", () => {
    const r = evaluate("integral(x, 0 m, 2 s, x)");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("unit-mismatch");
  });
});

/* ------------------------------------------------------------------ *
 * The mathjs builtins must stay intact (no override)
 * ------------------------------------------------------------------ */

describe("builtins untouched", () => {
  it("native sum / prod over an array still work", () => {
    expect(num(okValue("sum([1, 2, 3])"))).toBe(6);
    expect(num(okValue("prod([1, 2, 3])"))).toBe(6);
  });

  it("statistics that may route through the builtins still work", () => {
    expect(num(okValue("mean([1, 2, 3])"))).toBe(2);
    expect(num(okValue("variance([2, 4, 6])"))).toBe(4);
    expect(num(okValue("std([2, 4, 6])"))).toBe(2);
  });
});

/* ------------------------------------------------------------------ *
 * Rendering — textbook ∑ / ∏ / ∫ notation via the function-level toTex
 * ------------------------------------------------------------------ */

describe("notation rendering", () => {
  it("renders a summation as ∑ with bounds", () => {
    expect(sourceToLatex("S := summation(i, 1, n, i^2)")).toContain("\\sum");
  });

  it("renders a product as ∏", () => {
    expect(sourceToLatex("P := product(i, 1, 5, i)")).toContain("\\prod");
  });

  it("renders a definite integral as ∫", () => {
    expect(sourceToLatex("A := integral(x, 0, 1, x^2)")).toContain("\\int");
  });

  it("renders a range with the .. operator", () => {
    expect(sourceToLatex("i := 1..n")).toContain("..");
  });

  it("flows ∑ notation through the engine result tex (recalc path)", () => {
    const sheet = evaluateSheet([{ id: "S", source: "S := summation(i, 1, 5, i^2)" }]);
    expect(byId(sheet, "S").tex).toContain("\\sum");
  });
});
