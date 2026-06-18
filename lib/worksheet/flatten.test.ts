import { describe, expect, it } from "vitest";
import type { SheetResult } from "@/lib/calc";
import type { WorksheetContent } from "./content";
import {
  findRegion,
  findRowOf,
  flattenToRegionInputs,
  mapResults,
  readingOrderIds,
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

describe("readingOrderIds", () => {
  it("includes every region (math, text, area, area children) in order", () => {
    expect(readingOrderIds(doc)).toEqual(["A", "B", "N", "AREA", "C"]);
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
