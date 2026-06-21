import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";
import { evaluateTable } from "../table";
import { math } from "../math";
import type { Unit } from "../math";

/** Evaluate, assert success, return the raw value. */
const val = (src: string): unknown => {
  const r = evaluate(src);
  expect(r.ok, r.ok ? "" : r.error.message).toBe(true);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("math family — rounding", () => {
  it("ROUNDUP / ROUNDDOWN round away from / toward zero at N decimals", () => {
    expect(val("ROUNDUP(2.345, 2)")).toBe(2.35);
    expect(val("ROUNDDOWN(2.345, 2)")).toBe(2.34);
    expect(val("ROUNDUP(-2.341, 2)")).toBe(-2.35);
    expect(val("ROUNDUP(2.3, 0)")).toBe(3);
  });

  it("MROUND / CEILING / FLOOR snap to a multiple", () => {
    expect(val("MROUND(7, 5)")).toBe(5);
    expect(val("CEILING(2.3, 0.5)")).toBe(2.5);
    expect(val("FLOOR(2.7, 0.5)")).toBe(2.5);
    expect(val("MROUND(7, 0)")).toBe(0);
  });

  it("INT floors toward negative infinity", () => {
    expect(val("INT(-2.5)")).toBe(-3);
    expect(val("INT(2.9)")).toBe(2);
  });

  it("QUOTIENT truncates the division toward zero", () => {
    expect(val("QUOTIENT(7, 2)")).toBe(3);
    expect(val("QUOTIENT(-7, 2)")).toBe(-3);
  });
});

describe("math family — unit-aware rounding", () => {
  it("rounds the magnitude and reattaches the unit", () => {
    const r = val("ROUNDUP(2.3 mm, 0)");
    expect(math.isUnit(r)).toBe(true);
    expect((r as Unit).toNumber("mm")).toBe(3);
  });

  it("INT keeps the unit", () => {
    const r = val("INT(2.9 kN)");
    expect((r as Unit).toNumber("kN")).toBe(2);
  });
});

describe("math family — aggregation", () => {
  it("SUMSQ sums squares (unit² when inputs carry a unit)", () => {
    expect(val("SUMSQ(3, 4)")).toBe(25);
    const r = val("SUMSQ(3 m, 4 m)");
    expect((r as Unit).toNumber("m^2")).toBeCloseTo(25, 9);
  });

  it("SUMPRODUCT sums the element-wise products of equal-length ranges", () => {
    expect(val("SUMPRODUCT([1, 2, 3], [4, 5, 6])")).toBe(32);
  });

  it("SUMPRODUCT rejects mismatched lengths in the app voice", () => {
    const r = evaluate("SUMPRODUCT([1, 2], [4, 5, 6])");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("domain");
  });
});

describe("engine-wide reach", () => {
  it("the library is available inside table cells too (no table-scope wiring)", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }, { key: "r", label: "R" }],
      rows: [["2.34", "=ROUNDUP(A2, 1)"]],
    });
    expect(res.cells[0][1].value).toBe(2.4);
  });
});
