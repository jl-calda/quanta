import { describe, expect, it } from "vitest";
import { CalcEngine, type RegionInput, type RegionResult, type SheetResult } from "@/lib/calc";
import {
  buildEngineInputs,
  settleTables,
  worksheetScopeFromResults,
  type TableEngine,
} from "./flatten";
import type { Region, WorksheetContent } from "./content";

function doc(regions: Region[]): WorksheetContent {
  return { version: 1, rows: [{ id: "r1", columns: 1, cells: [{ regions }] }] };
}

describe("buildEngineInputs", () => {
  it("emits only math regions when there are no table exports", () => {
    const content = doc([
      { id: "m1", type: "math", indent: 0, source: "a := 1" },
      { id: "t1", type: "table", indent: 0, columns: [{ key: "c", label: "C" }], rows: [["1"]] },
      { id: "m2", type: "math", indent: 0, source: "b := 2" },
    ]);
    expect(buildEngineInputs(content).map((i) => i.id)).toEqual(["m1", "m2"]);
  });

  it("splices a table's serialized exports as synthetic defs at the table's position", () => {
    const content = doc([
      { id: "m1", type: "math", indent: 0, source: "a := 1" },
      { id: "t1", type: "table", indent: 0, columns: [{ key: "c", label: "C" }], rows: [["1"]] },
      { id: "m2", type: "math", indent: 0, source: "b := 2" },
    ]);
    const inputs = buildEngineInputs(content, new Map([["t1", { anchor: "[1, 2, 3]" }]]));
    expect(inputs.map((i) => i.id)).toEqual(["m1", "tbl:t1:anchor", "m2"]);
    expect(inputs[1].source).toBe("anchor := [1, 2, 3]");
  });

  it("splices a solve block's exports as synthetic defs at its position", () => {
    const content = doc([
      { id: "m1", type: "math", indent: 0, source: "a := 1" },
      { id: "s1", type: "solve", indent: 0, algorithm: "find", guesses: [{ var: "x", value: "2" }], constraints: ["x^2 = 9"] },
      { id: "m2", type: "math", indent: 0, source: "b := 2" },
    ]);
    const inputs = buildEngineInputs(content, undefined, new Map([["s1", { x: "3" }]]));
    expect(inputs.map((i) => i.id)).toEqual(["m1", "slv:s1:x", "m2"]);
    expect(inputs[1].source).toBe("x := 3");
  });
});

describe("worksheetScopeFromResults", () => {
  it("keeps current named values and drops errors / anonymous results", () => {
    const regions: RegionResult[] = [
      { id: "m1", name: "a", value: 5, formatted: "5", tex: "", status: "current" },
      { id: "m2", name: "b", value: undefined, formatted: "", tex: "", status: "error" },
      { id: "m3", name: null, value: 9, formatted: "9", tex: "", status: "current" },
    ];
    expect(worksheetScopeFromResults(regions)).toEqual({ a: 5 });
  });
});

/** Count engine passes to prove the settle loop is bounded. */
function countingEngine(): { engine: TableEngine; passes: () => number } {
  const inner = new CalcEngine([]);
  let passes = 0;
  return {
    engine: {
      setRegions(inputs: RegionInput[]) {
        passes += 1;
        inner.setRegions(inputs);
      },
      getResult(): SheetResult {
        return inner.getResult();
      },
    },
    passes: () => passes,
  };
}

describe("settleTables (scope-bridge)", () => {
  it("folds a named table output back so a downstream region resolves it", () => {
    // Table exports the range `forces`; the math region below averages it.
    const content = doc([
      {
        id: "t1",
        type: "table",
        indent: 0,
        ranges: { forces: "A2:A4" },
        columns: [{ key: "a", label: "Force", unit: "kN" }],
        rows: [["10"], ["20"], ["30"]],
      },
      { id: "avg", type: "math", indent: 0, source: "avg := mean(forces)" },
    ]);
    const { engine, passes } = countingEngine();
    const { sheet, tables } = settleTables(content, engine);

    const avg = sheet.regions.find((r) => r.name === "avg");
    expect(avg?.error).toBeUndefined();
    expect(avg?.formatted).toMatch(/^20\b/); // 20 kN
    expect(tables.get("t1")).toBeDefined();
    expect(sheet.regions.some((r) => r.id.startsWith("tbl:"))).toBe(false); // synthetic stripped
    expect(passes()).toBeLessThanOrEqual(9); // settles well under the cap
  });

  it("reads a worksheet name defined by another region inside a cell", () => {
    const content = doc([
      { id: "f", type: "math", indent: 0, source: "f_ub := 800 MPa" },
      {
        id: "t1",
        type: "table",
        indent: 0,
        columns: [
          { key: "a", label: "Area", unit: "mm^2" },
          { key: "b", label: "Force", unit: "kN" },
        ],
        rows: [["157", "=A2 * f_ub"]],
      },
    ]);
    const { engine } = countingEngine();
    const { tables } = settleTables(content, engine);
    const cell = tables.get("t1")!.cells[0][1];
    expect(cell.error).toBeUndefined();
    // 157 mm² × 800 MPa = 125.6 kN
    expect(cell.formatted).toMatch(/^125\.6\b/);
  });

  it("always terminates (cap + oscillation guard) for a cross-boundary loop", () => {
    // The table cell reads `k`, and `k` is defined from the table's own export —
    // a cross-boundary cycle. It must not spin: bounded passes, returns cleanly.
    const content = doc([
      {
        id: "t1",
        type: "table",
        indent: 0,
        ranges: { out: "A2:A2" },
        columns: [{ key: "a", label: "A", unit: "kN" }],
        rows: [["=k + 1 kN"]],
      },
      { id: "k", type: "math", indent: 0, source: "k := mean(out)" },
    ]);
    const { engine, passes } = countingEngine();
    expect(() => settleTables(content, engine)).not.toThrow();
    expect(passes()).toBeLessThanOrEqual(9);
  });

  it("folds a SPILLED named range back so a downstream region reads it", () => {
    // The cell `=[10,20,30]` spills down into A2:A4; the named range `vec` exports the
    // spilled column, which the math region below sums — proving spill → rangeValue →
    // exports → synthetic `vec := [10, 20, 30]` → the unmodified engine resolves it.
    const content = doc([
      {
        id: "t1",
        type: "table",
        indent: 0,
        ranges: { vec: "A2:A4" },
        columns: [{ key: "a", label: "V" }],
        rows: [["=[10, 20, 30]"], [""], [""]],
      },
      { id: "total", type: "math", indent: 0, source: "total := sum(vec)" },
    ]);
    const { engine, passes } = countingEngine();
    const { sheet, tables } = settleTables(content, engine);

    expect(tables.get("t1")!.cells[1][0].kind).toBe("spill"); // A3 was spilled into
    const total = sheet.regions.find((r) => r.name === "total");
    expect(total?.error).toBeUndefined();
    expect(total?.formatted).toMatch(/^60\b/);
    expect(passes()).toBeLessThanOrEqual(9);
  });

  it("samples a plot against table-exported ranges + a math definition", () => {
    // A table exports `ids` and `forces`; a plot binds x→ids, y→forces·gamma — so
    // the plot reads both a table export and a worksheet name from the settled scope.
    const content = doc([
      { id: "g", type: "math", indent: 0, source: "gamma := 2" },
      {
        id: "t1",
        type: "table",
        indent: 0,
        ranges: { ids: "A2:A4", forces: "B2:B4" },
        columns: [
          { key: "a", label: "Id" },
          { key: "b", label: "Force", unit: "kN" },
        ],
        rows: [["1", "10"], ["2", "20"], ["3", "30"]],
      },
      {
        id: "p1",
        type: "plot",
        indent: 0,
        kind: "xy",
        xVar: "x",
        yVar: "y",
        x: {},
        y: { unit: "kN" },
        xData: "ids",
        traces: [{ id: "tr", expr: "forces * gamma", style: "line" }],
        legend: true,
      },
    ]);
    const { engine } = countingEngine();
    const { plots } = settleTables(content, engine);
    const plot = plots.get("p1")!;
    expect(plot.empty).toBe(false);
    expect(plot.traces[0].error).toBeUndefined();
    expect(plot.traces[0].points.map((p) => p.x)).toEqual([1, 2, 3]);
    expect(plot.traces[0].points.map((p) => p.y)).toEqual([20, 40, 60]); // forces · gamma
  });
});

describe("settleTables — solve blocks (scope-bridge)", () => {
  it("folds a solved unknown back so a downstream region resolves it", () => {
    const content = doc([
      { id: "s1", type: "solve", indent: 0, algorithm: "find", guesses: [{ var: "x", value: "2" }], constraints: ["x^2 = 9"] },
      { id: "y", type: "math", indent: 0, source: "y := x + 1" },
    ]);
    const { engine, passes } = countingEngine();
    const { sheet, solves } = settleTables(content, engine);

    expect(solves.get("s1")?.status).toBe("solved");
    const y = sheet.regions.find((r) => r.name === "y");
    expect(y?.error).toBeUndefined();
    expect(y?.formatted).toMatch(/^4\b/); // x = 3 ⇒ y = 4
    expect(sheet.regions.some((r) => r.id.startsWith("slv:"))).toBe(false); // synthetic stripped
    expect(passes()).toBeLessThanOrEqual(9);
  });

  it("reads a worksheet name defined above the block", () => {
    const content = doc([
      { id: "a", type: "math", indent: 0, source: "a := 9" },
      { id: "s1", type: "solve", indent: 0, algorithm: "find", guesses: [{ var: "x", value: "2" }], constraints: ["x^2 = a"] },
      { id: "y", type: "math", indent: 0, source: "y := x" },
    ]);
    const { engine } = countingEngine();
    const { sheet, solves } = settleTables(content, engine);
    expect(solves.get("s1")?.status).toBe("solved");
    expect(sheet.regions.find((r) => r.name === "y")?.formatted).toMatch(/^3\b/);
  });

  it("exports nothing (and never throws) when the solve has no solution", () => {
    const content = doc([
      { id: "s1", type: "solve", indent: 0, algorithm: "find", guesses: [{ var: "x", value: "0" }], constraints: ["x = 1", "x = 2"] },
    ]);
    const { engine, passes } = countingEngine();
    let result!: ReturnType<typeof settleTables>;
    expect(() => {
      result = settleTables(content, engine);
    }).not.toThrow();
    expect(result.solves.get("s1")?.status).toBe("no-solution");
    expect(passes()).toBeLessThanOrEqual(9);
  });

  it("is unit-aware end-to-end (guess in mm², downstream reads the result)", () => {
    const content = doc([
      { id: "s1", type: "solve", indent: 0, algorithm: "find", guesses: [{ var: "A", value: "100", unit: "mm^2" }], constraints: ["100 kN / A = 200 MPa"] },
      { id: "d", type: "math", indent: 0, source: "d := A", unit: "mm^2" },
    ]);
    const { engine } = countingEngine();
    const { sheet, solves } = settleTables(content, engine);
    expect(solves.get("s1")?.status).toBe("solved");
    expect(sheet.regions.find((r) => r.name === "d")?.formatted).toMatch(/^500\b/); // 500 mm²
  });
});
