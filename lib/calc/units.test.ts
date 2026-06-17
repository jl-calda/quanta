import { describe, expect, it } from "vitest";
import { toDisplayUnit, SI_SYSTEM, isUnit } from "./units";
import { math } from "./math";

describe("toDisplayUnit", () => {
  it("converts a force to the SI default (kN)", () => {
    const force = math.evaluate("700 MPa * 16 mm^2"); // 11.2 kN
    const display = toDisplayUnit(force, undefined, SI_SYSTEM);
    expect(isUnit(display) && display.formatUnits()).toBe("kN");
  });

  it("honors an explicit target unit", () => {
    const display = toDisplayUnit(math.evaluate("1 m"), "mm", SI_SYSTEM);
    expect(isUnit(display) && display.toNumber("mm")).toBe(1000);
  });

  it("throws on a dimensional mismatch with the target unit", () => {
    expect(() => toDisplayUnit(math.evaluate("12 kN"), "mm", SI_SYSTEM)).toThrow();
  });

  it("passes plain numbers through unchanged", () => {
    expect(toDisplayUnit(0.15, undefined, SI_SYSTEM)).toBe(0.15);
  });
});
