import { describe, expect, it } from "vitest";
import { math } from "@/lib/calc";
import { splitValueUnit } from "./value-unit";

/** A real mathjs unit so `isUnit` returns true, paired with the engine's string. */
function unitResult(value: number, unit: string, formatted: string) {
  return { value: math.unit(value, unit), formatted };
}

describe("splitValueUnit", () => {
  it("splits a simple value and unit", () => {
    expect(splitValueUnit(unitResult(12, "kN", "12 kN"))).toEqual({
      value: "12",
      unit: "kN",
    });
  });

  it("keeps a compound unit whole in the unit column", () => {
    expect(splitValueUnit(unitResult(3, "kN*m", "3 kN·m"))).toEqual({
      value: "3",
      unit: "kN·m",
    });
  });

  it("handles thousands separators (number has no internal space)", () => {
    expect(splitValueUnit(unitResult(1234.5, "MPa", "1,234.5 MPa"))).toEqual({
      value: "1,234.5",
      unit: "MPa",
    });
  });

  it("handles scientific notation", () => {
    expect(splitValueUnit(unitResult(1200, "N", "1.2e3 N"))).toEqual({
      value: "1.2e3",
      unit: "N",
    });
  });

  it("leaves a plain number's unit empty", () => {
    expect(splitValueUnit({ value: 0.75, formatted: "0.75" })).toEqual({
      value: "0.75",
      unit: "",
    });
  });

  it("does not split a boolean", () => {
    expect(splitValueUnit({ value: true, formatted: "true" })).toEqual({
      value: "true",
      unit: "",
    });
  });

  it("does not split a matrix even though it contains spaces", () => {
    expect(
      splitValueUnit({ value: [[1, 2], [3, 4]], formatted: "[1, 2; 3, 4]" }),
    ).toEqual({ value: "[1, 2; 3, 4]", unit: "" });
  });
});
