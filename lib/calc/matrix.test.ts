import { describe, expect, it } from "vitest";
import type { Unit } from "mathjs";
import { evaluate } from "./evaluate";
import { evaluateSheet } from "./recalc";
import { math } from "./math";

/** Evaluate `expr` and return the raw value, failing loudly on a calc error. */
function value(expr: string): unknown {
  const r = evaluate(expr);
  if (!r.ok) throw new Error(`${expr} → ${r.error.message}`);
  return r.value;
}

/** Flatten a matrix/array value to a plain JS array. */
function arr(v: unknown): unknown[] {
  return math.isMatrix(v) ? (math.flatten(v).toArray() as unknown[]) : (v as unknown[]);
}

describe("matrix & vector literals", () => {
  it("evaluates a vector literal", () => {
    expect(arr(value("[1, 2, 3]"))).toEqual([1, 2, 3]);
  });

  it("evaluates a matrix literal and renders a bmatrix in TeX", () => {
    const r = evaluate("[[1, 2], [3, 4]]");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(arr(r.value)).toEqual([1, 2, 3, 4]);
      expect(r.tex).toContain("\\begin{bmatrix}");
    }
  });

  it("carries units on a unit-bearing vector literal", () => {
    const v = arr(value("[1 m, 2 m, 3 m]"));
    expect(v.map((u) => (u as Unit).toString())).toEqual(["1 m", "2 m", "3 m"]);
  });
});

describe("1-based indexing", () => {
  it("indexes a matrix element (row, col)", () => {
    const sheet = evaluateSheet([
      { id: "a", source: "A := [[1, 2], [3, 4]]" },
      { id: "b", source: "A[2, 1]" },
    ]);
    expect(sheet.regions[1].value).toBe(3);
  });

  it("indexes a vector element, preserving its unit", () => {
    const sheet = evaluateSheet([
      { id: "a", source: "v := [10 mm, 20 mm, 30 mm]" },
      { id: "b", source: "v[2]" },
    ]);
    expect((sheet.regions[1].value as Unit).toString()).toBe("20 mm");
  });
});

describe("transpose / det / inv (unit-aware, native mathjs)", () => {
  it("transposes and preserves element units", () => {
    expect(arr(value("transpose([[1 m, 2 m], [3 m, 4 m]])")).map(String)).toEqual([
      "1 m",
      "3 m",
      "2 m",
      "4 m",
    ]);
  });

  it("determinant carries unit^n", () => {
    expect((value("det([[1 m, 2 m], [3 m, 4 m]])") as Unit).toString()).toBe("-2 m^2");
  });

  it("inverse inverts the element unit", () => {
    const inv = arr(value("inv([[1 m, 2 m], [3 m, 4 m]])"));
    expect((inv[0] as Unit).toString()).toBe("-2 m^-1");
  });

  it("reports a non-square determinant in the app's voice", () => {
    const r = evaluate("det([[1, 2, 3], [4, 5, 6]])");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("domain");
      expect(r.error.message).toMatch(/square matrix/);
    }
  });

  it("reports a singular inverse", () => {
    const r = evaluate("inv([[1, 2], [2, 4]])");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("singular");
  });
});

describe("eigenvalues", () => {
  it("returns the eigenvalues of a diagonal matrix", () => {
    const vals = (arr(value("eigenvalues([[2, 0], [0, 3]])")) as number[]).sort((a, b) => a - b);
    expect(vals).toEqual([2, 3]);
  });

  it("carries the matrix unit onto each eigenvalue", () => {
    const vals = arr(value("eigenvalues([[2 m, 0 m], [0 m, 3 m]])"));
    const strs = vals.map((u) => (u as Unit).toString()).sort();
    expect(strs).toEqual(["2 m", "3 m"]);
  });

  it("rejects a non-square matrix", () => {
    const r = evaluate("eigenvalues([[1, 2, 3], [4, 5, 6]])");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("domain");
  });

  it("rejects inconsistent element units", () => {
    const r = evaluate("eigenvalues([[2 m, 0 s], [0 m, 3 m]])");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("unit-mismatch");
  });
});

describe("lsolve (general linear system M·x = b)", () => {
  it("solves a 2×2 system", () => {
    const x = arr(value("lsolve([[2, 1], [1, 3]], [3, 5])")) as number[];
    expect(x[0]).toBeCloseTo(0.8, 9);
    expect(x[1]).toBeCloseTo(1.4, 9);
  });

  it("round-trips: M · lsolve(M, b) = b", () => {
    const sheet = evaluateSheet([
      { id: "m", source: "M := [[4, 3], [6, 3]]" },
      { id: "b", source: "rhs := [10, 12]" },
      { id: "x", source: "x := lsolve(M, rhs)" },
      { id: "c", source: "M * x" },
    ]);
    const check = arr(sheet.regions[3].value) as number[];
    expect(check[0]).toBeCloseTo(10, 9);
    expect(check[1]).toBeCloseTo(12, 9);
  });

  it("propagates units: a unitless M with a unit vector b keeps b's unit", () => {
    const x = arr(value("lsolve([[2, 1], [1, 3]], [3 mm, 5 mm])"));
    const x0 = x[0] as Unit;
    expect(x0.formatUnits()).toBe("mm");
    expect(x0.toNumber("mm")).toBeCloseTo(0.8, 9);
  });

  it("reports a singular matrix rather than guessing a particular solution", () => {
    const r = evaluate("lsolve([[1, 2], [2, 4]], [3, 6])");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("singular");
  });

  it("reports a size mismatch between matrix and vector", () => {
    const r = evaluate("lsolve([[1, 2], [3, 4]], [1, 2, 3])");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("domain");
  });
});
