import { describe, expect, it } from "vitest";
import { CalcEngine, type RegionInput, type SheetResult } from "@/lib/calc";
import { buildEngineInputs, settleTables, type TableEngine } from "./flatten";
import type { ProgramRegion, Region, WorksheetContent } from "./content";

function doc(regions: Region[]): WorksheetContent {
  return { version: 1, rows: [{ id: "r1", columns: 1, cells: [{ regions }] }] };
}

function engineFor(content: WorksheetContent): TableEngine {
  return new CalcEngine(buildEngineInputs(content));
}

/** factorial(n) — a loop guarded by a conditional (the DONE-WHEN program). */
function factorialRegion(id = "p1"): ProgramRegion {
  return {
    id,
    type: "program",
    indent: 0,
    name: "factorial",
    params: ["n"],
    body: [
      { kind: "assign", target: "result", expr: "1" },
      {
        kind: "if",
        branches: [
          {
            cond: "n > 1",
            body: [
              {
                kind: "for",
                var: "i",
                from: "2",
                to: "n",
                body: [{ kind: "assign", target: "result", expr: "result * i" }],
              },
            ],
          },
        ],
      },
      { kind: "return", expr: "result" },
    ],
  };
}

describe("settleTables — program blocks (scope-bridge)", () => {
  it("makes a function program (loop + conditional) callable from a math region", () => {
    const content = doc([
      factorialRegion("p1"),
      { id: "m1", type: "math", indent: 0, source: "f5 := factorial(5)" },
    ]);
    const { sheet, programs } = settleTables(content, engineFor(content));

    expect(programs.get("p1")?.status).toBe("function");

    const f5 = sheet.regions.find((r) => r.name === "f5");
    expect(f5?.error).toBeUndefined();
    expect(f5?.value).toBe(120);
    // The synthetic function-assignment input is stripped from the published sheet.
    expect(sheet.regions.some((r) => r.id.startsWith("prog:"))).toBe(false);
  });

  it("emits a synthetic function-assignment delegating to the dispatcher", () => {
    const content = doc([factorialRegion("p1")]);
    const inputs = buildEngineInputs(content);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].id).toBe("prog:p1");
    expect(inputs[0].source).toBe('factorial(n) = __quantaProgram("p1", n)');
  });

  it("folds a value program's result back so a downstream region resolves it", () => {
    const content = doc([
      {
        id: "p2",
        type: "program",
        indent: 0,
        name: "sumToFive",
        params: [],
        body: [
          { kind: "assign", target: "s", expr: "0" },
          { kind: "for", var: "k", from: "1", to: "5", body: [{ kind: "assign", target: "s", expr: "s + k" }] },
          { kind: "return", expr: "s" },
        ],
      },
      { id: "m2", type: "math", indent: 0, source: "doubled := sumToFive * 2" },
    ]);
    const { sheet, programs } = settleTables(content, engineFor(content));

    expect(programs.get("p2")?.status).toBe("value");
    expect(programs.get("p2")?.value).toBe(15);
    const doubled = sheet.regions.find((r) => r.name === "doubled");
    expect(doubled?.error).toBeUndefined();
    expect(doubled?.value).toBe(30);
  });

  it("lets a program reference a worksheet value defined above it", () => {
    const content = doc([
      { id: "m0", type: "math", indent: 0, source: "base := 10" },
      {
        id: "p3",
        type: "program",
        indent: 0,
        name: "plusBase",
        params: ["x"],
        body: [{ kind: "return", expr: "x + base" }],
      },
      { id: "m1", type: "math", indent: 0, source: "y := plusBase(5)" },
    ]);
    const { sheet } = settleTables(content, engineFor(content));
    const y = sheet.regions.find((r) => r.name === "y");
    expect(y?.error).toBeUndefined();
    expect(y?.value).toBe(15);
  });

  it("is bounded for a worksheet with no exporters at all", () => {
    const content = doc([{ id: "m1", type: "math", indent: 0, source: "a := 1" }]);
    const inner = new CalcEngine(buildEngineInputs(content));
    let passes = 0;
    const engine: TableEngine = {
      setRegions(inputs: RegionInput[]) {
        passes += 1;
        inner.setRegions(inputs);
      },
      getResult(): SheetResult {
        return inner.getResult();
      },
    };
    settleTables(content, engine);
    expect(passes).toBeLessThanOrEqual(1);
  });
});
