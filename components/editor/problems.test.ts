import { describe, expect, it } from "vitest";
import type { CalcError, RegionResult } from "@/lib/calc";
import type { WorksheetContent } from "@/lib/worksheet/content";
import { collectProblems } from "./problems";

/** A RegionResult with the bits collectProblems reads; the rest are filler. */
function mkResult(
  id: string,
  opts: { name?: string | null; error?: CalcError } = {},
): RegionResult {
  return {
    id,
    name: opts.name ?? null,
    value: undefined,
    formatted: "",
    tex: "",
    error: opts.error,
    status: opts.error ? "error" : "current",
  };
}

const err = (overrides: Partial<CalcError> = {}): CalcError => ({
  kind: "parse",
  message: "Can't read this expression.",
  ...overrides,
});

function results(...rs: RegionResult[]): Map<string, RegionResult> {
  return new Map(rs.map((r) => [r.id, r]));
}

const empty: WorksheetContent = { version: 1, rows: [] };

/** A one-row, one-cell doc holding the given math regions in reading order. */
function doc(...regions: { id: string; type: "math"; source?: string }[]): WorksheetContent {
  return {
    version: 1,
    rows: [
      {
        id: "r1",
        columns: 1,
        cells: [
          {
            regions: regions.map((r) => ({ id: r.id, type: "math" as const, indent: 0, source: r.source ?? "" })),
          },
        ],
      },
    ],
  };
}

/** A one-row doc holding a single control with the given bind/label. */
function controlDoc(bind: string, label: string): WorksheetContent {
  return {
    version: 1,
    rows: [
      {
        id: "r",
        columns: 1,
        cells: [
          { regions: [{ id: "C", type: "control", indent: 0, kind: "textbox", bind, label, valueType: "number" }] },
        ],
      },
    ],
  };
}

describe("collectProblems", () => {
  it("returns [] for empty content and empty results", () => {
    expect(collectProblems(empty, new Map())).toEqual([]);
  });

  it("returns [] when no region has an error", () => {
    const content = doc({ id: "A", type: "math", source: "a := 1" });
    expect(collectProblems(content, results(mkResult("A")))).toEqual([]);
  });

  it("passes kind/message/fixHint through verbatim", () => {
    const content = doc({ id: "A", type: "math", source: "a := 1 kN + 1 mm" });
    const e = err({ kind: "unit-mismatch", message: "Units don't match.", fixHint: "Check the expression." });
    const out = collectProblems(content, results(mkResult("A", { error: e })));
    expect(out).toEqual([
      { regionId: "A", label: "a := 1 kN + 1 mm", kind: "unit-mismatch", message: "Units don't match.", fixHint: "Check the expression." },
    ]);
  });

  it("prefers the assigned name over the source for the label", () => {
    const content = doc({ id: "A", type: "math", source: "sigma := F / A" });
    const out = collectProblems(content, results(mkResult("A", { name: "sigma", error: err() })));
    expect(out[0].label).toBe("sigma");
  });

  it("falls back to a trimmed source snippet when there is no name", () => {
    const content = doc({ id: "A", type: "math", source: "  x   :=   a + bzzz  " });
    const out = collectProblems(content, results(mkResult("A", { error: err() })));
    expect(out[0].label).toBe("x := a + bzzz");
  });

  it("truncates a long source label with an ellipsis (<= max length)", () => {
    const long = "result := alpha + beta + gamma + delta + epsilon + zeta";
    const content = doc({ id: "A", type: "math", source: long });
    const out = collectProblems(content, results(mkResult("A", { error: err() })));
    expect(out[0].label.length).toBeLessThanOrEqual(40);
    expect(out[0].label.endsWith("…")).toBe(true);
  });

  it("uses a type fallback for an empty-source math region", () => {
    const content = doc({ id: "A", type: "math", source: "" });
    const out = collectProblems(content, results(mkResult("A", { error: err() })));
    expect(out[0].label).toBe("Math expression");
  });

  it("labels controls by label, then bind, then a fallback", () => {
    const e = err();
    expect(collectProblems(controlDoc("p", "Pressure"), results(mkResult("C", { error: e })))[0].label).toBe("Pressure");
    expect(collectProblems(controlDoc("p", ""), results(mkResult("C", { error: e })))[0].label).toBe("p");
    expect(collectProblems(controlDoc("", ""), results(mkResult("C", { error: e })))[0].label).toBe("Input control");
  });

  it("emits problems in reading order, descending into areas", () => {
    const content: WorksheetContent = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 2,
          cells: [
            { regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] },
            {
              regions: [
                {
                  id: "AREA",
                  type: "area",
                  indent: 0,
                  title: "Group",
                  collapsed: true,
                  regions: [{ id: "B", type: "math", indent: 0, source: "b := 2" }],
                },
              ],
            },
          ],
        },
        { id: "r2", columns: 1, cells: [{ regions: [{ id: "C", type: "math", indent: 0, source: "c := 3" }] }] },
      ],
    };
    const out = collectProblems(
      content,
      results(mkResult("C", { error: err() }), mkResult("B", { error: err() }), mkResult("A", { error: err() })),
    );
    // Reading order is A, then B (inside the collapsed area), then C.
    expect(out.map((p) => p.regionId)).toEqual(["A", "B", "C"]);
  });

  it("skips a result that has no error", () => {
    const content = doc(
      { id: "A", type: "math", source: "a := 1" },
      { id: "B", type: "math", source: "b := nope" },
    );
    const out = collectProblems(content, results(mkResult("A"), mkResult("B", { error: err({ kind: "undefined" }) })));
    expect(out.map((p) => p.regionId)).toEqual(["B"]);
  });

  it("skips a region missing from results without throwing", () => {
    const content = doc({ id: "A", type: "math", source: "a := 1" });
    expect(collectProblems(content, new Map())).toEqual([]);
  });

  it("never emits a result whose id is absent from the content tree", () => {
    const content = doc({ id: "A", type: "math", source: "a := 1" });
    const out = collectProblems(content, results(mkResult("GHOST", { error: err() })));
    expect(out).toEqual([]);
  });
});
