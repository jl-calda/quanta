import { describe, expect, it } from "vitest";
import {
  toDisplayUnit,
  SI_SYSTEM,
  USCS_SYSTEM,
  CGS_SYSTEM,
  unitSystemFor,
  isUnit,
} from "./units";
import { registerUserUnits } from "./user-units";
import { math } from "./math";

const label = (v: unknown) => (isUnit(v) ? v.formatUnits() : "");

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

describe("unit systems — display-only re-convert", () => {
  it("USCS shows force in kip, length in inches", () => {
    expect(label(toDisplayUnit(math.evaluate("100 kN"), undefined, USCS_SYSTEM))).toBe("kip");
    expect(label(toDisplayUnit(math.evaluate("50 mm"), undefined, USCS_SYSTEM))).toBe("in");
  });

  it("CGS shows force in dyn, length in cm", () => {
    expect(label(toDisplayUnit(math.evaluate("1 N"), undefined, CGS_SYSTEM))).toBe("dyn");
    expect(label(toDisplayUnit(math.evaluate("1 m"), undefined, CGS_SYSTEM))).toBe("cm");
  });

  it("falls back to SI for a dimension the system doesn't map", () => {
    // CGS has no stress unit here, so a stress falls back to SI's MPa.
    expect(label(toDisplayUnit(math.evaluate("200 MPa"), undefined, CGS_SYSTEM))).toBe("MPa");
  });

  it("never mutates the stored value on a display switch (no round-trip drift)", () => {
    const force = math.evaluate("100 kN");
    const inKip = toDisplayUnit(force, undefined, USCS_SYSTEM);
    const backToSi = toDisplayUnit(force, undefined, SI_SYSTEM);
    expect(isUnit(inKip) && inKip.toNumber("kN")).toBeCloseTo(100, 6);
    expect(isUnit(backToSi) && backToSi.toNumber("kN")).toBeCloseTo(100, 6);
  });

  it("unitSystemFor maps the worksheet selection, custom using its preferred list", () => {
    expect(unitSystemFor("si").id).toBe("SI");
    expect(unitSystemFor("uscs").id).toBe("USCS");
    expect(unitSystemFor("cgs").id).toBe("CGS");

    registerUserUnits([{ name: "wforce", definition: "2 kN" }]);
    const custom = unitSystemFor("custom", ["wforce"]);
    expect(custom.id).toBe("custom");
    expect(label(toDisplayUnit(math.evaluate("10 kN"), undefined, custom))).toBe("wforce");
  });
});
