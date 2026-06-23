import { describe, expect, it } from "vitest";
import type { SheetResult } from "@/lib/calc";
import type { ControlRegion, WorksheetContent } from "./content";
import {
  controlDefinitionSource,
  findRegion,
  findRowOf,
  flattenToRegionInputs,
  mapResults,
  readingOrderIds,
  visibleReadingOrderIds,
} from "./flatten";

/** A doc: a single-col row, then a 2-col row, then an area with a child math. */
const doc: WorksheetContent = {
  version: 1,
  rows: [
    {
      id: "r1",
      columns: 1,
      cells: [{ regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] }],
    },
    {
      id: "r2",
      columns: 2,
      cells: [
        { regions: [{ id: "B", type: "math", indent: 0, source: "b := a + 1" }] },
        { regions: [{ id: "N", type: "text", indent: 0, text: "a note" }] },
      ],
    },
    {
      id: "r3",
      columns: 1,
      cells: [
        {
          regions: [
            {
              id: "AREA",
              type: "area",
              indent: 0,
              title: "Inputs",
              collapsed: false,
              regions: [{ id: "C", type: "math", indent: 1, source: "c := b * 2" }],
            },
          ],
        },
      ],
    },
  ],
};

describe("flattenToRegionInputs", () => {
  it("emits math regions in reading order (rows → cells L→R → descend areas)", () => {
    const inputs = flattenToRegionInputs(doc);
    expect(inputs.map((i) => i.id)).toEqual(["A", "B", "C"]);
    expect(inputs.map((i) => i.source)).toEqual(["a := 1", "b := a + 1", "c := b * 2"]);
  });

  it("skips non-math regions as non-evaluables", () => {
    const inputs = flattenToRegionInputs(doc);
    expect(inputs.find((i) => i.id === "N")).toBeUndefined();
  });
});

/** Build a control region with sensible required fields for the helper. */
function control(patch: Partial<ControlRegion>): ControlRegion {
  return { id: "ctl", type: "control", indent: 0, kind: "slider", bind: "x", valueType: "number", ...patch };
}

describe("controlDefinitionSource", () => {
  it("serializes a unit-aware number (slider)", () => {
    expect(controlDefinitionSource(control({ bind: "L", valueType: "number", value: 6, unit: "m" }))).toBe("L := 6 m");
  });

  it("serializes a bare number with no unit", () => {
    expect(controlDefinitionSource(control({ bind: "n", valueType: "number", value: 6 }))).toBe("n := 6");
  });

  it("quotes a text value (combo / dropdown / listbox)", () => {
    expect(controlDefinitionSource(control({ bind: "grade", valueType: "text", value: "S355" }))).toBe('grade := "S355"');
  });

  it("serializes a boolean (checkbox)", () => {
    expect(controlDefinitionSource(control({ bind: "ok", valueType: "boolean", value: true }))).toBe("ok := true");
    expect(controlDefinitionSource(control({ bind: "ok", valueType: "boolean", value: false }))).toBe("ok := false");
  });

  it("emits an expression verbatim", () => {
    expect(controlDefinitionSource(control({ bind: "v", valueType: "expr", value: "2 m + 3 m" }))).toBe("v := 2 m + 3 m");
  });

  it("returns null when unbound, value missing, or empty text", () => {
    expect(controlDefinitionSource(control({ bind: "", value: 5 }))).toBeNull();
    expect(controlDefinitionSource(control({ bind: "L", value: undefined }))).toBeNull();
    expect(controlDefinitionSource(control({ bind: "s", valueType: "text", value: "" }))).toBeNull();
  });
});

describe("flattenToRegionInputs — controls", () => {
  const withControl: WorksheetContent = {
    version: 1,
    rows: [
      {
        id: "r1",
        columns: 1,
        cells: [
          {
            regions: [
              control({ id: "S", bind: "L", valueType: "number", value: 6, unit: "m" }),
              { id: "M", type: "math", indent: 0, source: "M := L * 2" },
              control({ id: "U", bind: "", value: 1 }), // unconfigured → skipped
            ],
          },
        ],
      },
    ],
  };

  it("emits a configured control as a `bind := value` definition at its position", () => {
    const inputs = flattenToRegionInputs(withControl);
    expect(inputs.map((i) => i.id)).toEqual(["S", "M"]);
    expect(inputs[0]).toMatchObject({ id: "S", source: "L := 6 m" });
  });

  it("skips an unbound control", () => {
    expect(flattenToRegionInputs(withControl).find((i) => i.id === "U")).toBeUndefined();
  });
});

describe("readingOrderIds", () => {
  it("includes every region (math, text, area, area children) in order", () => {
    expect(readingOrderIds(doc)).toEqual(["A", "B", "N", "AREA", "C"]);
  });
});

describe("visibleReadingOrderIds", () => {
  it("matches readingOrderIds when no area is collapsed", () => {
    expect(visibleReadingOrderIds(doc)).toEqual(readingOrderIds(doc));
  });

  it("excludes a collapsed area's children but keeps the area itself", () => {
    const collapsed: WorksheetContent = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            {
              regions: [
                {
                  id: "AREA",
                  type: "area",
                  indent: 0,
                  title: "Inputs",
                  collapsed: true,
                  regions: [{ id: "C", type: "math", indent: 1, source: "c := 1" }],
                },
                { id: "D", type: "math", indent: 0, source: "d := 2" },
              ],
            },
          ],
        },
      ],
    };
    // "C" (the area child) drops out; "AREA" stays navigable.
    expect(visibleReadingOrderIds(collapsed)).toEqual(["AREA", "D"]);
    // readingOrderIds is unchanged — it still sees the hidden child.
    expect(readingOrderIds(collapsed)).toEqual(["AREA", "C", "D"]);
  });

  it("hides all descendants when an outer nested area is collapsed", () => {
    const nested: WorksheetContent = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            {
              regions: [
                {
                  id: "OUTER",
                  type: "area",
                  indent: 0,
                  title: "Outer",
                  collapsed: true,
                  regions: [
                    {
                      id: "INNER",
                      type: "area",
                      indent: 0,
                      title: "Inner",
                      collapsed: false,
                      regions: [{ id: "X", type: "math", indent: 0, source: "x := 1" }],
                    },
                  ],
                },
                { id: "Y", type: "math", indent: 0, source: "y := 2" },
              ],
            },
          ],
        },
      ],
    };
    expect(visibleReadingOrderIds(nested)).toEqual(["OUTER", "Y"]);
  });
});

describe("findRegion", () => {
  it("finds a region nested inside an area", () => {
    expect(findRegion(doc, "C")).toMatchObject({ id: "C", type: "math" });
  });

  it("returns undefined for an unknown id", () => {
    expect(findRegion(doc, "ZZZ")).toBeUndefined();
  });
});

describe("findRowOf", () => {
  it("finds the row of a top-level region", () => {
    expect(findRowOf(doc, "A")?.id).toBe("r1");
    expect(findRowOf(doc, "N")?.id).toBe("r2");
  });

  it("finds the row of a region nested inside an area", () => {
    expect(findRowOf(doc, "C")?.id).toBe("r3");
  });

  it("returns null for an unknown id", () => {
    expect(findRowOf(doc, "ZZZ")).toBeNull();
  });
});

describe("mapResults", () => {
  it("indexes a sheet result by region id", () => {
    const sheet: SheetResult = {
      status: "current",
      errorCount: 0,
      regions: [
        { id: "A", name: "a", value: 1, formatted: "1", tex: "a := 1", status: "current" },
      ],
    };
    const map = mapResults(sheet);
    expect(map.get("A")?.formatted).toBe("1");
  });
});
