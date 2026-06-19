import { describe, expect, it } from "vitest";
import { findMatches, replaceAllEdits, replaceAllInContent, replaceInString } from "./find";
import { findRegion } from "./flatten";
import { singleColumnRow, type WorksheetContent } from "./content";

function sheet(): WorksheetContent {
  return {
    version: 1,
    rows: [
      singleColumnRow([
        { id: "m1", indent: 0, type: "math", source: "x := 2" },
        { id: "m2", indent: 0, type: "math", source: "y := x + x_i" },
        { id: "t1", indent: 0, type: "text", text: "Set x to the span." },
        {
          id: "tb1",
          indent: 0,
          type: "table",
          columns: [{ key: "a", label: "A" }],
          rows: [["x"], ["= x + 1"]],
        },
      ]),
    ],
  };
}

describe("replaceInString", () => {
  it("is case-insensitive by default and case-sensitive on request", () => {
    expect(replaceInString("X and x", "x", "y").count).toBe(2);
    expect(replaceInString("X and x", "x", "y", { caseSensitive: true }).count).toBe(1);
  });

  it("honors whole-word", () => {
    expect(replaceInString("axe x ox", "x", "y", { wholeWord: true })).toEqual({
      value: "axe y ox",
      count: 1,
    });
  });

  it("escapes regex metacharacters in the query", () => {
    expect(replaceInString("a+b", "a+b", "c").value).toBe("c");
  });

  it("subscript-identifier mode rewrites the base, preserving the subscript", () => {
    expect(replaceInString("x + x_i + x_max", "x", "y", { subscriptIdentifier: true })).toEqual({
      value: "y + y_i + y_max",
      count: 3,
    });
  });
});

describe("findMatches / replaceAllEdits", () => {
  it("finds across math, text, and table cells in reading order", () => {
    const matches = findMatches(sheet(), "x");
    expect(matches.map((m) => m.field)).toEqual([
      "source", "source", "source", "text", "cell", "cell",
    ]);
  });

  it("restricts to selected scopes", () => {
    const matches = findMatches(sheet(), "x", { scopes: ["text"] });
    expect(matches).toHaveLength(1);
    expect(matches[0].regionId).toBe("t1");
  });

  it("produces one field edit per changed field", () => {
    const edits = replaceAllEdits(sheet(), "x", "z");
    expect(edits).toHaveLength(5); // m1, m2, t1, tb1[0][0], tb1[1][0]
    const cellEdit = edits.find((e) => e.field === "cell" && e.cell?.r === 1);
    expect(cellEdit?.value).toBe("= z + 1");
  });

  it("replaceAllInContent returns a new tree and the occurrence count", () => {
    const src = sheet();
    const { content, count } = replaceAllInContent(src, "x", "z");
    expect(count).toBe(6);
    expect((findRegion(content, "m2") as { source: string }).source).toBe("y := z + z_i");
    // original tree is untouched
    expect((findRegion(src, "m2") as { source: string }).source).toBe("y := x + x_i");
  });
});
