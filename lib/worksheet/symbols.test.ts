import { describe, expect, it } from "vitest";
import type { Region, WorksheetContent } from "./content";
import { buildSymbolTable, matchSymbol } from "./symbols";

/** Wrap a flat list of regions in one single-column row (reading order = list order). */
function doc(...regions: Region[]): WorksheetContent {
  return { version: 1, rows: [{ id: "r", columns: 1, cells: [{ regions }] }] };
}

function math(id: string, source: string): Region {
  return { id, type: "math", indent: 0, source };
}

function heading(id: string, text: string): Region {
  return { id, type: "text", indent: 0, text, heading: 1 };
}

describe("buildSymbolTable", () => {
  it("lists one entry per defining region, in reading order", () => {
    const table = buildSymbolTable(
      doc(math("a", "F_t := 12 kN"), math("b", "phi := 0.75"), math("c", "F_t + 1")),
    );
    expect(table.map((e) => e.name)).toEqual(["F_t", "phi"]);
    expect(table.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("counts references from other regions (distinct, excluding self)", () => {
    const table = buildSymbolTable(
      doc(
        math("a", "F_t := 12 kN"),
        math("b", "N_Rd := 0.6 * F_t"),
        math("c", "UR := N_Rd / F_t"),
      ),
    );
    const by = Object.fromEntries(table.map((e) => [e.name, e.refCount]));
    expect(by.F_t).toBe(2); // used by N_Rd and UR
    expect(by.N_Rd).toBe(1); // used by UR
    expect(by.UR).toBe(0); // unused
  });

  it("does not let unit literals inflate reference counts", () => {
    const table = buildSymbolTable(
      doc(math("a", "x := 5 kN"), math("b", "y := x + 2 kN")),
    );
    const by = Object.fromEntries(table.map((e) => [e.name, e.refCount]));
    expect(by.x).toBe(1); // kN is a unit, not a variable; only x is referenced
    expect(by.y).toBe(0);
  });

  it("counts a user-defined name that shadows a unit", () => {
    // `b` is a valid mathjs unit, but here it's defined → it must be counted.
    const table = buildSymbolTable(
      doc(math("a", "b := 3"), math("c", "z := b + 1")),
    );
    expect(table.find((e) => e.name === "b")?.refCount).toBe(1);
  });

  it("does not count a self-reference", () => {
    const table = buildSymbolTable(doc(math("a", "n := n + 1")));
    expect(table.find((e) => e.name === "n")?.refCount).toBe(0);
  });

  it("groups definitions under the nearest preceding heading", () => {
    const table = buildSymbolTable(
      doc(
        heading("h1", "Design inputs"),
        math("a", "F_t := 12 kN"),
        heading("h2", "Utilization"),
        math("b", "UR := 0.5"),
      ),
    );
    expect(table.find((e) => e.name === "F_t")?.group).toBe("Design inputs");
    expect(table.find((e) => e.name === "UR")?.group).toBe("Utilization");
  });

  it("falls back to a default group before any heading", () => {
    const table = buildSymbolTable(doc(math("a", "F_t := 12 kN")));
    expect(table[0].group).toBe("Variables");
  });
});

describe("matchSymbol", () => {
  it("matches the raw name and the underscore-stripped form", () => {
    expect(matchSymbol("F_t", "F_t")).toBe(true);
    expect(matchSymbol("F_t", "Ft")).toBe(true);
    expect(matchSymbol("F_t", "ft")).toBe(true);
    expect(matchSymbol("F_t", "F")).toBe(true);
    expect(matchSymbol("F_t", "t")).toBe(true);
  });

  it("returns true for an empty query and false for a non-match", () => {
    expect(matchSymbol("N_Rd", "")).toBe(true);
    expect(matchSymbol("N_Rd", "  ")).toBe(true);
    expect(matchSymbol("N_Rd", "xyz")).toBe(false);
  });
});
