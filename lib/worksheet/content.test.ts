import { describe, expect, it } from "vitest";
import {
  EMPTY_CONTENT,
  newRegion,
  parseContent,
  validateContent,
  type WorksheetContent,
} from "./content";

describe("parseContent", () => {
  it("accepts a valid tree", () => {
    const input = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [{ regions: [{ id: "m1", type: "math", indent: 0, source: "x := 1" }] }],
        },
      ],
    };
    const out = parseContent(input);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].cells[0].regions[0]).toMatchObject({ id: "m1", type: "math" });
  });

  it("round-trips worksheet-level custom units and the complex format", () => {
    const input = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            {
              regions: [
                { id: "m1", type: "math", indent: 0, source: "z := 3 + 4i", format: { complex: "polar" } },
              ],
            },
          ],
        },
      ],
      units: { defs: [{ name: "kip", definition: "4.4482216 kN" }], preferred: ["kip"] },
    };
    const out = parseContent(input);
    expect(out.units).toEqual({
      defs: [{ name: "kip", definition: "4.4482216 kN" }],
      preferred: ["kip"],
    });
    const region = out.rows[0].cells[0].regions[0];
    expect(region.type === "math" && region.format?.complex).toBe("polar");
    // validateContent (the save path) preserves them too.
    expect(validateContent(input)?.units?.preferred).toEqual(["kip"]);
  });

  it("falls back to an empty document on garbage", () => {
    expect(parseContent(null)).toEqual(EMPTY_CONTENT);
    expect(parseContent("nope")).toEqual(EMPTY_CONTENT);
    expect(parseContent({ rows: "bad" })).toEqual(EMPTY_CONTENT);
  });

  it("round-trips template versioning metadata through parse and validate", () => {
    const template = {
      revision: 2,
      params: [
        { key: "span", label: "Span", type: "number", unit: "mm", default: "3000" },
        { key: "grade", label: "Steel grade", type: "text" },
      ],
      changelog: [
        { revision: 1, label: "Initial version", at: "2026-01-01T00:00:00.000Z", by: "u1" },
        { revision: 2, label: "Tighter deflection limit", at: "2026-02-01T00:00:00.000Z", by: "u1" },
      ],
    };
    const input = { version: 1, rows: [], template };
    expect(parseContent(input).template).toEqual(template);
    // The save path (validateContent) preserves it too — the autosave guard.
    expect(validateContent(input)?.template).toEqual(template);
  });

  it("round-trips a worksheet's source-template origin (survives the autosave path)", () => {
    const origin = {
      templateId: "00000000-0000-0000-0000-000000000001",
      revision: 1,
      appliedAt: "2026-03-01T00:00:00.000Z",
    };
    const input = {
      version: 1,
      rows: [
        { id: "r1", columns: 1, cells: [{ regions: [{ id: "m1", type: "math", indent: 0, source: "x := 1" }] }] },
      ],
      origin,
    };
    expect(parseContent(input).origin).toEqual(origin);
    expect(validateContent(input)?.origin).toEqual(origin);
  });

  it("round-trips a solve block's ODE config and cached solution", () => {
    const solution = {
      v: 1,
      hash: "deadbeef",
      indepVar: "t",
      indep: [0, 0.5, 1],
      vars: { y: [1, 0.61, 0.37] },
      inputs: { k: "2" },
      computedAt: "2026-01-01T00:00:00.000Z",
    };
    const input = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            {
              regions: [
                {
                  id: "s1",
                  type: "solve",
                  indent: 0,
                  algorithm: "odesolve",
                  guesses: [{ var: "y", value: "1" }],
                  constraints: [],
                  ode: { system: ["y' = -k*y"], indepVar: "t", range: { min: 0, max: 1 }, conditions: ["y(0) = 1"] },
                  solution,
                },
              ],
            },
          ],
        },
      ],
    };
    const region = parseContent(input).rows[0].cells[0].regions[0];
    expect(region.type).toBe("solve");
    expect(region.type === "solve" && region.ode).toEqual({
      system: ["y' = -k*y"],
      indepVar: "t",
      range: { min: 0, max: 1 },
      conditions: ["y(0) = 1"],
    });
    expect(region.type === "solve" && region.solution).toEqual(solution);
  });

  it("repairs the cells.length === columns invariant without dropping regions", () => {
    // A 2-column row that only ships one cell → padded to two, content kept.
    const input = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 2,
          cells: [{ regions: [{ id: "a", type: "text", indent: 0, text: "hi" }] }],
        },
      ],
    };
    const out = parseContent(input);
    expect(out.rows[0].columns).toBe(2);
    expect(out.rows[0].cells).toHaveLength(2);
    expect(out.rows[0].cells[0].regions[0]).toMatchObject({ id: "a" });
  });

  it("widens columns (never trims cells) when more cells than columns ship", () => {
    const input = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            { regions: [{ id: "a", type: "text", indent: 0, text: "1" }] },
            { regions: [{ id: "b", type: "text", indent: 0, text: "2" }] },
          ],
        },
      ],
    };
    const out = parseContent(input);
    expect(out.rows[0].columns).toBe(2);
    const ids = out.rows[0].cells.flatMap((c) => c.regions.map((r) => r.id));
    expect(ids).toEqual(["a", "b"]);
  });
});

describe("non-lossy round-trip", () => {
  it("preserves unknown payload on render-only region types", () => {
    const input = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            {
              regions: [
                {
                  id: "t1",
                  type: "table",
                  indent: 0,
                  rows: 3,
                  cols: 2,
                  cells: [["a", "b"]],
                  columnUnits: ["mm", "kN"],
                },
              ],
            },
          ],
        },
      ],
    };
    const out = validateContent(input) as WorksheetContent;
    const table = out.rows[0].cells[0].regions[0] as Record<string, unknown>;
    expect(table.columnUnits).toEqual(["mm", "kN"]);
    expect(table.cells).toEqual([["a", "b"]]);
  });
});

describe("typed table region", () => {
  const tableDoc = (region: Record<string, unknown>) => ({
    version: 1,
    rows: [{ id: "r1", columns: 1, cells: [{ regions: [region] }] }],
  });

  it("round-trips a typed table (columns, rows, name, per-column unit/format)", () => {
    const input = tableDoc({
      id: "t1",
      type: "table",
      indent: 0,
      name: "anchor_schedule",
      columns: [
        { key: "mark", label: "Mark" },
        { key: "len", label: "Length", unit: "mm", format: { decimals: 1 } },
      ],
      rows: [["A1", "120"], ["A2", "=B2*2"]],
    });
    const out = validateContent(input) as WorksheetContent;
    const table = out.rows[0].cells[0].regions[0] as Record<string, unknown>;
    expect(table.name).toBe("anchor_schedule");
    expect((table.columns as { key: string }[]).map((c) => c.key)).toEqual(["mark", "len"]);
    expect(table.rows).toEqual([["A1", "120"], ["A2", "=B2*2"]]);
  });

  it("migrates a legacy {rows: count, cells, columnUnits} table without nulling the document", () => {
    const input = tableDoc({
      id: "t1",
      type: "table",
      indent: 0,
      rows: 2, // legacy numeric count — would fail the typed schema unmigrated
      columnUnits: ["mm", "kN"],
      cells: [["a", "b"]],
    });
    const out = validateContent(input);
    expect(out).not.toBeNull();
    const table = (out as WorksheetContent).rows[0].cells[0].regions[0] as Record<string, unknown>;
    expect(table.rows).toEqual([["a", "b"]]); // numeric count overwritten by the string grid
    expect((table.columns as { unit?: string }[]).map((c) => c.unit)).toEqual(["mm", "kN"]);
  });

  it("seeds newRegion('table') with editable columns and rows", () => {
    const r = newRegion("table");
    expect(r.type).toBe("table");
    if (r.type === "table") {
      expect(r.columns.length).toBeGreaterThan(0);
      expect(r.rows.length).toBeGreaterThan(0);
    }
  });
});

describe("typed solve region", () => {
  const solveDoc = (region: Record<string, unknown>) => ({
    version: 1,
    rows: [{ id: "r1", columns: 1, cells: [{ regions: [region] }] }],
  });

  it("round-trips guesses (with units), constraints, algorithm + tolerances", () => {
    const input = solveDoc({
      id: "s1",
      type: "solve",
      indent: 0,
      name: "plate thickness",
      algorithm: "find",
      guesses: [
        { var: "t", value: "10", unit: "mm" },
        { var: "theta", value: "30", unit: "deg" },
      ],
      constraints: ["sigma_vm(t) = f_y", "t >= 6 mm"],
      ctol: 1e-8,
      onNonConverge: "last",
    });
    const out = validateContent(input) as WorksheetContent;
    const s = out.rows[0].cells[0].regions[0] as Record<string, unknown>;
    expect(s.algorithm).toBe("find");
    expect(s.guesses).toEqual([
      { var: "t", value: "10", unit: "mm" },
      { var: "theta", value: "30", unit: "deg" },
    ]);
    expect(s.constraints).toEqual(["sigma_vm(t) = f_y", "t >= 6 mm"]);
    expect(s.ctol).toBe(1e-8);
    expect(s.onNonConverge).toBe("last");
  });

  it("round-trips the full ODE/PDE config for a deferred algorithm", () => {
    const input = solveDoc({
      id: "s1",
      type: "solve",
      indent: 0,
      algorithm: "odesolve",
      guesses: [{ var: "y", value: "0" }],
      constraints: [],
      ode: {
        system: ["y'' + y = 0"],
        indepVar: "t",
        range: { min: 0, max: 10 },
        conditions: ["y(0) = 1", "y'(0) = 0"],
        step: 0.01,
        mesh: 50,
      },
    });
    const out = validateContent(input) as WorksheetContent;
    const ode = (out.rows[0].cells[0].regions[0] as Record<string, unknown>).ode as Record<string, unknown>;
    expect(ode).toEqual({
      system: ["y'' + y = 0"],
      indepVar: "t",
      range: { min: 0, max: 10 },
      conditions: ["y(0) = 1", "y'(0) = 0"],
      step: 0.01,
      mesh: 50,
    });
  });

  it("validates a legacy bare {type:'solve'} (defaults applied, never wiped)", () => {
    const out = validateContent(solveDoc({ id: "s1", type: "solve", indent: 0 }));
    expect(out).not.toBeNull();
    const s = (out as WorksheetContent).rows[0].cells[0].regions[0] as Record<string, unknown>;
    expect(s.algorithm).toBe("find");
    expect(s.guesses).toEqual([]);
    expect(s.constraints).toEqual([]);
  });

  it("seeds newRegion('solve') with a usable find block", () => {
    const r = newRegion("solve");
    expect(r.type).toBe("solve");
    if (r.type === "solve") {
      expect(r.algorithm).toBe("find");
      expect(r.guesses.length).toBeGreaterThan(0);
      expect(r.constraints.length).toBeGreaterThan(0);
    }
  });

  it("round-trips a solve block's bounds, integer/discrete options, and maxSolutions", () => {
    const input = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            {
              regions: [
                {
                  id: "s1",
                  type: "solve",
                  indent: 0,
                  algorithm: "find",
                  guesses: [{ var: "x", value: "1", lower: "0", upper: "5", integer: true, discrete: [6, 8, 10] }],
                  constraints: ["x^2 = 9"],
                  maxSolutions: 2,
                },
              ],
            },
          ],
        },
      ],
    };
    const out = parseContent(input);
    const region = out.rows[0].cells[0].regions[0];
    expect(region.type).toBe("solve");
    if (region.type === "solve") {
      expect(region.maxSolutions).toBe(2);
      expect(region.guesses[0]).toMatchObject({ lower: "0", upper: "5", integer: true, discrete: [6, 8, 10] });
    }
  });

  it("round-trips a parametric sweep region", () => {
    const input = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            {
              regions: [
                {
                  id: "sw1",
                  type: "sweep",
                  indent: 0,
                  param: "L",
                  from: "0 m",
                  to: "4 m",
                  steps: 9,
                  scale: "linear",
                  outputs: [{ expr: "L^2", name: "A", unit: "m^2" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const out = parseContent(input);
    const region = out.rows[0].cells[0].regions[0];
    expect(region.type).toBe("sweep");
    if (region.type === "sweep") {
      expect(region).toMatchObject({ param: "L", from: "0 m", to: "4 m", steps: 9 });
      expect(region.outputs[0]).toMatchObject({ expr: "L^2", name: "A", unit: "m^2" });
    }
  });

  it("seeds newRegion('sweep') with a usable example", () => {
    const r = newRegion("sweep");
    expect(r.type).toBe("sweep");
    if (r.type === "sweep") {
      expect(r.param).toBe("x");
      expect(r.outputs.length).toBeGreaterThan(0);
      expect(r.outputs[0].name).toBe("y");
    }
  });
});

describe("newRegion", () => {
  it("creates a math region with show-steps defaults", () => {
    const r = newRegion("math");
    expect(r.type).toBe("math");
    if (r.type === "math") {
      expect(r.source).toBe("");
      expect(r.display).toMatchObject({ name: true, formula: true, result: true, substituted: false });
    }
  });

  it("creates an expandable area", () => {
    const r = newRegion("area");
    expect(r).toMatchObject({ type: "area", collapsed: false, regions: [] });
  });
});
