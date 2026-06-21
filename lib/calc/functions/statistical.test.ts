import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";
import type { Unit } from "../math";

const val = (src: string): unknown => {
  const r = evaluate(src);
  expect(r.ok, r.ok ? "" : r.error.message).toBe(true);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("statistical family — counts & criteria", () => {
  it("COUNT counts numerics; COUNTA counts non-empty", () => {
    expect(val('COUNT([1, 2, 3, "x"])')).toBe(3);
    expect(val('COUNTA([1, "", "x", 4])')).toBe(3);
  });

  it("COUNTIF matches comparison and equality criteria", () => {
    expect(val('COUNTIF([1, 2, 3, 4], ">2")')).toBe(2);
    expect(val('COUNTIF([1, 2, 3, 4], "<>2")')).toBe(3);
    expect(val('COUNTIF(["a", "b", "a"], "a")')).toBe(2);
  });

  it("SUMIF sums matches, with an optional aligned sum range", () => {
    expect(val('SUMIF([1, 2, 3, 4], ">=3")')).toBe(7);
    expect(val('SUMIF([1, 2, 3], ">1", [10, 20, 30])')).toBe(50);
  });

  it("AVERAGEIF averages matches and errors cleanly when none match", () => {
    expect(val('AVERAGEIF([1, 2, 3, 4], ">2")')).toBe(3.5);
    const r = evaluate('AVERAGEIF([1, 2], ">5")');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("no-solution");
  });
});

describe("statistical family — unit-aware aggregates", () => {
  it("SUMIF keeps the unit of the summed values", () => {
    const r = val('SUMIF([1, 2, 3] * 1 kN, ">1")');
    expect((r as Unit).toNumber("kN")).toBeCloseTo(5, 9);
  });
});

describe("statistical family — means & order statistics", () => {
  it("GEOMEAN / HARMEAN compute the right means", () => {
    expect(val("GEOMEAN([2, 8])")).toBeCloseTo(4, 9);
    expect(val("HARMEAN([1, 2, 4])")).toBeCloseTo(12 / 7, 9);
  });

  it("LARGE / SMALL pick the k-th order statistic and keep units", () => {
    expect(val("LARGE([3, 1, 2], 1)")).toBe(3);
    expect(val("SMALL([3, 1, 2], 1)")).toBe(1);
    const r = val("LARGE([3, 1, 2] * 1 mm, 2)");
    expect((r as Unit).toNumber("mm")).toBe(2);
  });

  it("LARGE flags an out-of-range k in the app voice", () => {
    const r = evaluate("LARGE([3, 1, 2], 9)");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("domain");
  });
});
