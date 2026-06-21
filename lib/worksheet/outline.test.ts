import { describe, expect, it } from "vitest";
import type { Region, WorksheetContent } from "./content";
import { buildOutline } from "./outline";

/** Wrap a flat list of regions in one single-column row (reading order = list order). */
function doc(...regions: Region[]): WorksheetContent {
  return { version: 1, rows: [{ id: "r", columns: 1, cells: [{ regions }] }] };
}

function heading(id: string, level: 1 | 2 | 3, text = `H${level} ${id}`): Region {
  return { id, type: "text", indent: 0, text, heading: level };
}

function tagged(id: string, type: Region["type"], tag: string): Region {
  return { id, type, indent: 0, tag } as Region;
}

describe("buildOutline", () => {
  it("returns nothing for an empty document", () => {
    expect(buildOutline({ version: 1, rows: [] })).toEqual([]);
  });

  it("numbers a single top-level heading 1", () => {
    const out = buildOutline(doc(heading("a", 1)));
    expect(out).toEqual([
      { id: "a", label: "H1 a", level: 0, number: "1", isHeading: true },
    ]);
  });

  it("numbers nested headings as a table of contents (1, 1.1, 1.2, 2)", () => {
    const out = buildOutline(
      doc(heading("a", 1), heading("b", 2), heading("c", 2), heading("d", 1)),
    );
    expect(out.map((o) => o.number)).toEqual(["1", "1.1", "1.2", "2"]);
    expect(out.map((o) => o.level)).toEqual([0, 1, 1, 0]);
  });

  it("steps back out correctly (1, 1.1, 1.1.1, 2)", () => {
    const out = buildOutline(
      doc(heading("a", 1), heading("b", 2), heading("c", 3), heading("d", 1)),
    );
    expect(out.map((o) => o.number)).toEqual(["1", "1.1", "1.1.1", "2"]);
  });

  it("pads ancestors deterministically when the first heading is an H2", () => {
    const out = buildOutline(doc(heading("a", 2), heading("b", 2)));
    expect(out.map((o) => o.number)).toEqual(["1.1", "1.2"]);
  });

  it("falls back to a label when heading text is blank", () => {
    const out = buildOutline(doc(heading("a", 1, "   ")));
    expect(out[0].label).toBe("Untitled heading");
  });

  it("lists a tagged region as an unnumbered leaf beneath its section", () => {
    const out = buildOutline(
      doc(heading("a", 1), tagged("t", "table", "Anchor schedule")),
    );
    expect(out[1]).toEqual({
      id: "t",
      label: "Anchor schedule",
      level: 1,
      number: null,
      tag: "table",
      isHeading: false,
    });
  });

  it("places a tag before any heading at level 0", () => {
    const out = buildOutline(doc(tagged("t", "plot", "Chart")));
    expect(out[0]).toMatchObject({ level: 0, number: null, tag: "plot" });
  });

  it("ignores plain text regions and untagged math", () => {
    const out = buildOutline(
      doc(
        { id: "p", type: "text", indent: 0, text: "body copy" },
        { id: "m", type: "math", indent: 0, source: "x := 1" },
      ),
    );
    expect(out).toEqual([]);
  });
});
