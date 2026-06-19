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

  it("falls back to an empty document on garbage", () => {
    expect(parseContent(null)).toEqual(EMPTY_CONTENT);
    expect(parseContent("nope")).toEqual(EMPTY_CONTENT);
    expect(parseContent({ rows: "bad" })).toEqual(EMPTY_CONTENT);
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
