import { describe, expect, it } from "vitest";
import { validateCellSource, type TableValidationRule } from "./table-validation";

const list: TableValidationRule = { kind: "list", options: ["M16", "M20", "M24"] };
const range: TableValidationRule = { kind: "number", min: 0, max: 100 };

describe("validateCellSource — always-allowed cases", () => {
  it("allows any input when there is no rule", () => {
    expect(validateCellSource(undefined, "anything")).toEqual({ ok: true });
  });
  it("allows an empty source (clearing a cell)", () => {
    expect(validateCellSource(list, "")).toEqual({ ok: true });
    expect(validateCellSource(range, "   ")).toEqual({ ok: true });
  });
  it("allows a formula (computed value, not a typed literal)", () => {
    expect(validateCellSource(list, "=A1")).toEqual({ ok: true });
    expect(validateCellSource(range, "=sum(A1:A3)")).toEqual({ ok: true });
  });
  it("allows a list column with no options yet", () => {
    expect(validateCellSource({ kind: "list" }, "whatever")).toEqual({ ok: true });
  });
});

describe("validateCellSource — list", () => {
  it("accepts an allowed option (trim-insensitive)", () => {
    expect(validateCellSource(list, "M20")).toEqual({ ok: true });
    expect(validateCellSource(list, "  M24 ")).toEqual({ ok: true });
  });
  it("rejects a value not in the list with a helpful message", () => {
    const r = validateCellSource(list, "M30");
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ message: "Pick one of: M16, M20, M24." });
  });
});

describe("validateCellSource — number", () => {
  it("accepts an in-range number, including a unit-bearing literal", () => {
    expect(validateCellSource(range, "42")).toEqual({ ok: true });
    expect(validateCellSource({ kind: "number", min: 0 }, "12 kN")).toEqual({ ok: true });
  });
  it("rejects non-numeric input", () => {
    expect(validateCellSource(range, "abc")).toMatchObject({ ok: false, message: "Enter a number." });
  });
  it("rejects below min and above max", () => {
    expect(validateCellSource(range, "-5")).toMatchObject({ ok: false, message: "Must be at least 0." });
    expect(validateCellSource(range, "150")).toMatchObject({ ok: false, message: "Must be at most 100." });
  });
  it("treats bounds as inclusive", () => {
    expect(validateCellSource(range, "0")).toEqual({ ok: true });
    expect(validateCellSource(range, "100")).toEqual({ ok: true });
  });
});
