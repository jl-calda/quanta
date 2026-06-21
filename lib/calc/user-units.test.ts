import { describe, expect, it } from "vitest";
import { registerUserUnits } from "./user-units";
import { math } from "./math";

const kN = (expr: string) => math.evaluate(expr).to("kN").toNumber("kN");

describe("registerUserUnits", () => {
  it("registers a genuinely custom unit that then resolves as input and display", () => {
    const { registered, errors } = registerUserUnits([{ name: "widget", definition: "3 mm" }]);
    expect(errors).toEqual([]);
    expect(registered).toContain("widget");
    expect(math.evaluate("2 widget").to("mm").toNumber("mm")).toBeCloseTo(6, 6);
    expect(math.evaluate("12 mm").to("widget").toNumber("widget")).toBeCloseTo(4, 6);
  });

  it("uses a built-in name (e.g. kip) without clobbering it", () => {
    const { errors } = registerUserUnits([{ name: "kip", definition: "4.4482216 kN" }]);
    expect(errors).toEqual([]);
    expect(kN("10 kip")).toBeCloseTo(44.482216, 4);
    expect(math.evaluate("100 kN").to("kip").toNumber("kip")).toBeCloseTo(22.4809, 3);
  });

  it("does not clobber a built-in unit when a worksheet names it", () => {
    const { errors } = registerUserUnits([{ name: "kN", definition: "999 N" }]);
    expect(errors).toEqual([]);
    expect(math.evaluate("1 kN").to("N").toNumber("N")).toBeCloseTo(1000, 6);
  });

  it("applies a changed definition (override) and is idempotent", () => {
    registerUserUnits([{ name: "myforce", definition: "2 kN" }]);
    const again = registerUserUnits([{ name: "myforce", definition: "2 kN" }]);
    expect(again.errors).toEqual([]);
    expect(kN("1 myforce")).toBeCloseTo(2, 6);
    registerUserUnits([{ name: "myforce", definition: "3 kN" }]);
    expect(kN("1 myforce")).toBeCloseTo(3, 6);
  });

  it("resolves cross-referencing definitions in dependency order", () => {
    const { errors } = registerUserUnits([
      { name: "myksi", definition: "mykip / in^2" }, // depends on mykip, defined after
      { name: "mykip", definition: "4.4482216 kN" },
    ]);
    expect(errors).toEqual([]);
    expect(math.evaluate("1 myksi").to("psi").toNumber("psi")).toBeCloseTo(1000, 0);
  });

  it("normalizes a definition with no leading scalar", () => {
    const { errors } = registerUserUnits([{ name: "uone", definition: "kN" }]);
    expect(errors).toEqual([]);
    expect(kN("1 uone")).toBeCloseTo(1, 6);
  });

  it("rejects a cyclic definition", () => {
    const { errors } = registerUserUnits([
      { name: "cyca", definition: "1 cycb" },
      { name: "cycb", definition: "1 cyca" },
    ]);
    expect(errors.some((e) => /circular/i.test(e.message))).toBe(true);
  });

  it("rejects an unknown / dimensionally-broken definition", () => {
    const { errors } = registerUserUnits([{ name: "bogus", definition: "3 zzz" }]);
    expect(errors.some((e) => e.name === "bogus")).toBe(true);
  });

  it("rejects an invalid name and a reserved name", () => {
    const bad = registerUserUnits([{ name: "2bad", definition: "1 kN" }]);
    expect(bad.errors.some((e) => e.name === "2bad")).toBe(true);
    const reserved = registerUserUnits([{ name: "pi", definition: "1 kN" }]);
    expect(reserved.errors.some((e) => /reserved/i.test(e.message))).toBe(true);
  });

  it("flags a duplicate name", () => {
    const { errors } = registerUserUnits([
      { name: "dupe", definition: "1 kN" },
      { name: "dupe", definition: "2 kN" },
    ]);
    expect(errors.some((e) => /more than once/i.test(e.message))).toBe(true);
  });
});
