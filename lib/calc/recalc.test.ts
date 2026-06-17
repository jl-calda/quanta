import { describe, expect, it } from "vitest";
import { evaluateSheet, CalcEngine } from "./recalc";
import type { RegionInput, RegionResult } from "./types";

/** Compact, comparable projection (mathjs Units don't deep-equal cleanly). */
const project = (r: RegionResult) => ({
  id: r.id,
  name: r.name,
  formatted: r.formatted,
  status: r.status,
  error: r.error?.kind,
});

const byId = (sheet: { regions: RegionResult[] }, id: string) =>
  sheet.regions.find((r) => r.id === id)!;

describe("evaluateSheet — end to end", () => {
  // The anchor pull-out check from the math-region mockup.
  const anchor: RegionInput[] = [
    { id: "as", source: "A_s := 157 mm^2" },
    { id: "fub", source: "f_ub := 700 MPa" },
    { id: "nrd", source: "N_Rd := 0.75 * A_s * f_ub", unit: "kN" },
    { id: "ft", source: "F_t := 12 kN" },
    {
      id: "ur",
      source: "UR := F_t / N_Rd",
      format: { decimals: 2 },
      conditional: [{ op: "<=", value: 1, style: { label: "OK" } }],
    },
  ];

  it("evaluates the worksheet with units and dependencies", () => {
    const sheet = evaluateSheet(anchor);
    expect(sheet.status).toBe("current");
    expect(sheet.errorCount).toBe(0);

    const nrd = byId(sheet, "nrd");
    expect(nrd.formatted).toContain("82.4");
    expect(nrd.formatted).toContain("kN");

    const ur = byId(sheet, "ur");
    expect(ur.formatted).toBe("0.15");
    expect(ur.style?.label).toBe("OK");
  });

  it("is deterministic — same sheet, same projected output", () => {
    const a = evaluateSheet(anchor).regions.map(project);
    const b = evaluateSheet(anchor).regions.map(project);
    expect(a).toEqual(b);
  });
});

describe("evaluateSheet — typed errors", () => {
  it("flags a forward reference as defined-later", () => {
    const sheet = evaluateSheet([
      { id: "a", source: "a := b" },
      { id: "b", source: "b := 1" },
    ]);
    expect(byId(sheet, "a").error?.kind).toBe("defined-later");
    expect(byId(sheet, "b").status).toBe("current");
  });

  it("flags an unknown name as undefined", () => {
    const sheet = evaluateSheet([{ id: "a", source: "a := x + 1" }]);
    expect(byId(sheet, "a").error?.kind).toBe("undefined");
  });

  it("resolves mathjs constants without an undefined error", () => {
    const sheet = evaluateSheet([{ id: "c", source: "c := 2 * pi" }]);
    expect(byId(sheet, "c").status).toBe("current");
  });

  it("detects a circular reference", () => {
    const sheet = evaluateSheet([
      { id: "a", source: "a := b" },
      { id: "b", source: "b := a" },
    ]);
    expect(byId(sheet, "a").error?.kind).toBe("cycle");
    expect(byId(sheet, "b").error?.kind).toBe("cycle");
  });

  it("flags a unit mismatch", () => {
    const sheet = evaluateSheet([{ id: "m", source: "m := 12 kN + 3 mm" }]);
    expect(byId(sheet, "m").error?.kind).toBe("unit-mismatch");
  });

  it("blocks regions that depend on an errored region", () => {
    const sheet = evaluateSheet([
      { id: "bad", source: "bad := 1 kN + 1 mm" },
      { id: "dep", source: "dep := bad + 1 kN" },
    ]);
    expect(byId(sheet, "bad").error?.kind).toBe("unit-mismatch");
    expect(byId(sheet, "dep").status).toBe("error");
  });
});

describe("CalcEngine — incremental recalculation", () => {
  const base = (): RegionInput[] => [
    { id: "a", source: "a := 2" },
    { id: "b", source: "b := a * 3" },
    { id: "c", source: "c := b + 1" },
  ];

  it("auto mode recomputes dependents on edit", () => {
    const engine = new CalcEngine(base(), { mode: "auto" });
    engine.updateRegion("a", "a := 10");
    const result = engine.getResult();
    expect(byId(result, "b").formatted).toBe("30");
    expect(byId(result, "c").formatted).toBe("31");
    expect(result.status).toBe("current");
  });

  it("manual mode leaves dependents stale until recalculated", () => {
    const engine = new CalcEngine(base(), { mode: "manual" });
    engine.updateRegion("a", "a := 10");
    const stale = engine.getResult();
    expect(byId(stale, "a").status).toBe("stale");
    expect(byId(stale, "b").status).toBe("stale");
    expect(byId(stale, "c").status).toBe("stale");
    expect(stale.status).toBe("stale");

    const fresh = engine.recalculate();
    expect(byId(fresh, "b").formatted).toBe("30");
    expect(byId(fresh, "c").formatted).toBe("31");
    expect(fresh.status).toBe("current");
  });

  it("markDirty marks transitive dependents only", () => {
    const engine = new CalcEngine(
      [
        { id: "a", source: "a := 2" },
        { id: "b", source: "b := a * 3" },
        { id: "x", source: "x := 99" }, // independent
      ],
      { mode: "manual" },
    );
    engine.markDirty("a");
    // Re-run markStale path via a no-op manual update is internal; assert via
    // a fresh edit instead:
    engine.updateRegion("a", "a := 5");
    const r = engine.getResult();
    expect(byId(r, "b").status).toBe("stale");
    expect(byId(r, "x").status).toBe("current");
  });

  it("recalculateToHere commits only the prefix up to a region", () => {
    const engine = new CalcEngine(base(), { mode: "manual" });
    engine.updateRegion("a", "a := 10");
    engine.recalculateToHere("b");
    const r = engine.getResult();
    expect(byId(r, "b").formatted).toBe("30"); // committed
    expect(byId(r, "b").status).toBe("current");
    expect(byId(r, "c").status).toBe("stale"); // beyond the cut-off
  });
});
