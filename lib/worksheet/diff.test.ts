import { describe, expect, it } from "vitest";
import type { WorksheetContent } from "./content";
import {
  diffContents,
  formatSummary,
  hashRegion,
  summarizeDiff,
} from "./diff";

/** A single-column doc holding `sources` as math regions keyed by id. */
function doc(regions: { id: string; source: string }[]): WorksheetContent {
  return {
    version: 1,
    rows: [
      {
        id: "r1",
        columns: 1,
        cells: [
          {
            regions: regions.map((r) => ({
              id: r.id,
              type: "math" as const,
              indent: 0,
              source: r.source,
            })),
          },
        ],
      },
    ],
  };
}

describe("diffContents", () => {
  it("flags added / removed / changed / same by id + content hash", () => {
    const prev = doc([
      { id: "A", source: "a := 1" },
      { id: "B", source: "b := 2" },
      { id: "C", source: "c := 3" },
    ]);
    const next = doc([
      { id: "A", source: "a := 1" }, // same
      { id: "B", source: "b := 20" }, // changed
      { id: "D", source: "d := 4" }, // added
    ]); // C removed

    const diff = diffContents(prev, next);
    expect(diff.get("A")).toBe("same");
    expect(diff.get("B")).toBe("changed");
    expect(diff.get("C")).toBe("removed");
    expect(diff.get("D")).toBe("added");
  });

  it("treats a null reference as everything added", () => {
    const next = doc([{ id: "A", source: "a := 1" }]);
    const diff = diffContents(null, next);
    expect(diff.get("A")).toBe("added");
  });

  it("does not mark an area changed when only a child region changes", () => {
    const area = (childSource: string): WorksheetContent => ({
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
                  collapsed: false,
                  regions: [{ id: "C", type: "math", indent: 1, source: childSource }],
                },
              ],
            },
          ],
        },
      ],
    });

    const diff = diffContents(area("c := 1"), area("c := 2"));
    expect(diff.get("AREA")).toBe("same");
    expect(diff.get("C")).toBe("changed");
  });
});

describe("hashRegion", () => {
  it("is stable under key order", () => {
    const a = hashRegion({ id: "A", type: "math", indent: 0, source: "a := 1" });
    const b = hashRegion({ type: "math", source: "a := 1", indent: 0, id: "A" });
    expect(a).toBe(b);
  });
});

describe("summarizeDiff / formatSummary", () => {
  it("counts kinds and renders the app-voice summary", () => {
    const diff = new Map([
      ["A", "changed"],
      ["B", "changed"],
      ["C", "added"],
      ["D", "removed"],
      ["E", "same"],
    ] as const);
    const summary = summarizeDiff(diff);
    expect(summary).toEqual({ changed: 2, added: 1, removed: 1 });
    expect(formatSummary(summary)).toBe("2 changed, 1 added, 1 removed");
  });

  it("reads 'No region changes' when nothing differs", () => {
    expect(formatSummary(summarizeDiff(new Map([["A", "same"]] as const)))).toBe(
      "No region changes",
    );
  });
});
