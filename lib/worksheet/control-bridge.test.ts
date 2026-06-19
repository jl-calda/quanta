import { describe, expect, it } from "vitest";
import { CalcEngine } from "@/lib/calc";
import { settleTables } from "./flatten";
import type { ControlRegion, Region, WorksheetContent } from "./content";

/**
 * End-to-end: an input control writes its bound variable into engine scope, and
 * a downstream math region recomputes from it (Mockup §6.7). Driven through the
 * same `settleTables` + `CalcEngine` path the live provider uses.
 */
function doc(regions: Region[]): WorksheetContent {
  return { version: 1, rows: [{ id: "r1", columns: 1, cells: [{ regions }] }] };
}

function slider(value: number): ControlRegion {
  return { id: "S", type: "control", indent: 0, kind: "slider", bind: "L", valueType: "number", value, unit: "m" };
}

// Display in metres so the assertion reads the value, not SI base units (mm).
const math: Region = { id: "M", type: "math", indent: 0, source: "M := L * 2", unit: "m" };

describe("control → engine scope bridge", () => {
  it("defines the bound variable so a downstream region computes from it", () => {
    const { sheet } = settleTables(doc([slider(6), math]), new CalcEngine([]));

    const ctrl = sheet.regions.find((r) => r.id === "S");
    expect(ctrl?.name).toBe("L"); // the control's own definition is in scope
    expect(ctrl?.status).toBe("current");

    const m = sheet.regions.find((r) => r.id === "M");
    expect(m?.status).toBe("current");
    expect(m?.formatted).toMatch(/\b12\b/);
    expect(m?.formatted).toContain("m");
  });

  it("recomputes the dependent when the control value changes", () => {
    const engine = new CalcEngine([]);
    const first = settleTables(doc([slider(6), math]), engine);
    expect(first.sheet.regions.find((r) => r.id === "M")?.formatted).toMatch(/\b12\b/);

    const second = settleTables(doc([slider(10), math]), engine);
    expect(second.sheet.regions.find((r) => r.id === "M")?.formatted).toMatch(/\b20\b/);
  });

  it("a control placed below its consumer errors (defined-later, reading order)", () => {
    const { sheet } = settleTables(doc([math, slider(6)]), new CalcEngine([]));
    expect(sheet.regions.find((r) => r.id === "M")?.status).toBe("error");
  });

  it("binds through the with-table settle path too", () => {
    const table: Region = {
      id: "T",
      type: "table",
      indent: 0,
      name: "tbl",
      columns: [{ key: "c", label: "C" }],
      rows: [["1"]],
    };
    const { sheet } = settleTables(doc([slider(6), math, table]), new CalcEngine([]));
    expect(sheet.regions.find((r) => r.id === "M")?.formatted).toMatch(/\b12\b/);
  });
});
