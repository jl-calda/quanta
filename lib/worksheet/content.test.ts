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
