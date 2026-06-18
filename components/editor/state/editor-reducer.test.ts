import { describe, expect, it } from "vitest";
import type { SheetResult } from "@/lib/calc";
import type { WorksheetContent } from "@/lib/worksheet/content";
import { flattenToRegionInputs, readingOrderIds } from "@/lib/worksheet/flatten";
import {
  editorReducer,
  initEditorState,
  type EditorState,
} from "./editor-reducer";

function freshState(content: WorksheetContent = { version: 1, rows: [] }): EditorState {
  return initEditorState({ content, calcMode: "auto", unitsSystem: "si" });
}

const twoColDoc: WorksheetContent = {
  version: 1,
  rows: [
    {
      id: "r1",
      columns: 2,
      cells: [
        { regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] },
        { regions: [{ id: "B", type: "math", indent: 0, source: "b := 2" }] },
      ],
    },
  ],
};

describe("INSERT_REGION", () => {
  it("creates a single-column row in an empty doc and opens it for editing", () => {
    const s = editorReducer(freshState(), {
      type: "INSERT_REGION",
      regionType: "math",
      anchorId: null,
      where: "below",
    });
    expect(s.content.rows).toHaveLength(1);
    expect(s.content.rows[0].columns).toBe(1);
    const region = s.content.rows[0].cells[0].regions[0];
    expect(region.type).toBe("math");
    expect(s.selectedId).toBe(region.id);
    expect(s.editingId).toBe(region.id);
    expect(s.saveState).toBe("unsaved");
  });

  it("inserts below an anchor within the same container", () => {
    const s = editorReducer(freshState(twoColDoc), {
      type: "INSERT_REGION",
      regionType: "text",
      anchorId: "A",
      where: "below",
    });
    const ids = s.content.rows[0].cells[0].regions.map((r) => r.id);
    expect(ids[0]).toBe("A");
    expect(ids).toHaveLength(2);
  });
});

describe("INSERT_REGION_WITH_SOURCE", () => {
  it("creates a math region prefilled with the source in an empty doc", () => {
    const s = editorReducer(freshState(), {
      type: "INSERT_REGION_WITH_SOURCE",
      source: "9.80665 m/s^2",
      anchorId: null,
      where: "below",
    });
    expect(s.content.rows).toHaveLength(1);
    const region = s.content.rows[0].cells[0].regions[0];
    expect(region.type).toBe("math");
    expect(region.type === "math" && region.source).toBe("9.80665 m/s^2");
    expect(s.selectedId).toBe(region.id);
    expect(s.editingId).toBe(region.id);
    expect(s.saveState).toBe("unsaved");
  });

  it("inserts below the anchor and preserves the cells===columns invariant", () => {
    const s = editorReducer(freshState(twoColDoc), {
      type: "INSERT_REGION_WITH_SOURCE",
      source: "interp(vx, vy, x)",
      anchorId: "A",
      where: "below",
    });
    const cell = s.content.rows[0].cells[0];
    expect(cell.regions.map((r) => r.id)[0]).toBe("A");
    expect(cell.regions).toHaveLength(2);
    const inserted = cell.regions[1];
    expect(inserted.type === "math" && inserted.source).toBe("interp(vx, vy, x)");
    expect(s.content.rows[0].cells).toHaveLength(s.content.rows[0].columns);
  });
});

describe("OPEN_REFERENCE / CLOSE_REFERENCE", () => {
  it("opens to a group and closes again", () => {
    const opened = editorReducer(freshState(), { type: "OPEN_REFERENCE", kind: "UNITS" });
    expect(opened.ui.referenceOpen).toBe(true);
    expect(opened.ui.referenceKind).toBe("UNITS");
    const closed = editorReducer(opened, { type: "CLOSE_REFERENCE" });
    expect(closed.ui.referenceOpen).toBe(false);
  });
});

describe("TOGGLE_RIGHT_PANEL / CLOSE_RIGHT_PANEL", () => {
  it("opens a drawer, toggles it shut, and switches between drawers", () => {
    const base = freshState();
    expect(base.ui.rightPanel).toBe("none");

    const comments = editorReducer(base, { type: "TOGGLE_RIGHT_PANEL", panel: "comments" });
    expect(comments.ui.rightPanel).toBe("comments");

    // Re-clicking the active drawer's button closes it.
    const closedAgain = editorReducer(comments, { type: "TOGGLE_RIGHT_PANEL", panel: "comments" });
    expect(closedAgain.ui.rightPanel).toBe("none");

    // Opening AI while comments is open switches (mutually exclusive).
    const ai = editorReducer(comments, { type: "TOGGLE_RIGHT_PANEL", panel: "ai" });
    expect(ai.ui.rightPanel).toBe("ai");

    const closed = editorReducer(ai, { type: "CLOSE_RIGHT_PANEL" });
    expect(closed.ui.rightPanel).toBe("none");
  });
});

describe("DELETE_REGION", () => {
  it("removes the region and prunes a now-empty row", () => {
    const doc: WorksheetContent = {
      version: 1,
      rows: [
        { id: "r1", columns: 1, cells: [{ regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] }] },
        { id: "r2", columns: 1, cells: [{ regions: [{ id: "B", type: "math", indent: 0, source: "b := 2" }] }] },
      ],
    };
    const s = editorReducer({ ...freshState(doc), selectedId: "A" }, { type: "DELETE_REGION", id: "A" });
    expect(s.content.rows).toHaveLength(1);
    expect(s.content.rows[0].cells[0].regions[0].id).toBe("B");
    expect(s.selectedId).toBeNull();
  });
});

describe("MOVE_REGION", () => {
  it("swaps a region with its neighbour within the container", () => {
    const doc: WorksheetContent = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            {
              regions: [
                { id: "A", type: "math", indent: 0, source: "a := 1" },
                { id: "B", type: "math", indent: 0, source: "b := 2" },
              ],
            },
          ],
        },
      ],
    };
    const s = editorReducer(freshState(doc), { type: "MOVE_REGION", id: "B", dir: "up" });
    expect(s.content.rows[0].cells[0].regions.map((r) => r.id)).toEqual(["B", "A"]);
  });
});

describe("INDENT", () => {
  it("clamps indent within [0, 8]", () => {
    const doc: WorksheetContent = {
      version: 1,
      rows: [{ id: "r1", columns: 1, cells: [{ regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] }] }],
    };
    let s = freshState(doc);
    s = editorReducer(s, { type: "INDENT", id: "A", delta: -1 });
    expect((s.content.rows[0].cells[0].regions[0]).indent).toBe(0);
    s = editorReducer(s, { type: "INDENT", id: "A", delta: 1 });
    expect((s.content.rows[0].cells[0].regions[0]).indent).toBe(1);
  });
});

describe("SET_COLUMNS", () => {
  it("pads cells going 1 → 2", () => {
    const doc: WorksheetContent = {
      version: 1,
      rows: [{ id: "r1", columns: 1, cells: [{ regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] }] }],
    };
    const s = editorReducer(freshState(doc), { type: "SET_COLUMNS", rowId: "r1", columns: 2 });
    expect(s.content.rows[0].columns).toBe(2);
    expect(s.content.rows[0].cells).toHaveLength(2);
  });

  it("merges all regions into the first cell going 2 → 1 (no loss)", () => {
    const s = editorReducer(freshState(twoColDoc), { type: "SET_COLUMNS", rowId: "r1", columns: 1 });
    expect(s.content.rows[0].columns).toBe(1);
    expect(s.content.rows[0].cells).toHaveLength(1);
    expect(s.content.rows[0].cells[0].regions.map((r) => r.id)).toEqual(["A", "B"]);
  });
});

describe("MOVE_TO", () => {
  it("reorders within a container by drop position", () => {
    const doc: WorksheetContent = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            {
              regions: [
                { id: "A", type: "math", indent: 0, source: "a := 1" },
                { id: "B", type: "math", indent: 0, source: "b := 2" },
                { id: "C", type: "math", indent: 0, source: "c := 3" },
              ],
            },
          ],
        },
      ],
    };
    const s = editorReducer(freshState(doc), { type: "MOVE_TO", id: "C", targetId: "A", position: "before" });
    expect(s.content.rows[0].cells[0].regions.map((r) => r.id)).toEqual(["C", "A", "B"]);
  });

  it("moves a region across cells (still snapped to a cell)", () => {
    const s = editorReducer(freshState(twoColDoc), { type: "MOVE_TO", id: "A", targetId: "B", position: "after" });
    expect(s.content.rows[0].cells[0].regions).toHaveLength(0);
    expect(s.content.rows[0].cells[1].regions.map((r) => r.id)).toEqual(["B", "A"]);
  });
});

describe("DUPLICATE_REGION", () => {
  it("inserts a re-identified copy right after the source", () => {
    const doc: WorksheetContent = {
      version: 1,
      rows: [{ id: "r1", columns: 1, cells: [{ regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] }] }],
    };
    const s = editorReducer(freshState(doc), { type: "DUPLICATE_REGION", id: "A" });
    const regions = s.content.rows[0].cells[0].regions;
    expect(regions).toHaveLength(2);
    expect(regions[0].id).toBe("A");
    expect(regions[1].id).not.toBe("A");
    expect((regions[1] as { source: string }).source).toBe("a := 1");
  });
});

describe("TOGGLE_SPAN", () => {
  it("extracts a region from a multi-column row into its own single-column row", () => {
    const s = editorReducer(freshState(twoColDoc), { type: "TOGGLE_SPAN", id: "A" });
    // Original row keeps B; a new single-col row holds A right after it.
    expect(readingOrderIds(s.content)).toEqual(["B", "A"]);
    const spanRow = s.content.rows.find((r) => r.cells[0].regions[0]?.id === "A");
    expect(spanRow?.columns).toBe(1);
  });
});

describe("SET_RESULTS / MARK_STALE", () => {
  const sheet: SheetResult = {
    status: "current",
    errorCount: 0,
    regions: [{ id: "A", name: "a", value: 1, formatted: "1", tex: "a := 1", status: "current" }],
  };

  it("applies results, status, and error count", () => {
    const s = editorReducer(freshState(), { type: "SET_RESULTS", sheet });
    expect(s.results.get("A")?.formatted).toBe("1");
    expect(s.calcStatus).toBe("current");
    expect(s.errorCount).toBe(0);
  });

  it("marks current results stale", () => {
    let s = editorReducer(freshState(), { type: "SET_RESULTS", sheet });
    s = editorReducer(s, { type: "MARK_STALE" });
    expect(s.results.get("A")?.status).toBe("stale");
    expect(s.calcStatus).toBe("stale");
  });
});

describe("engine bridge contract", () => {
  it("flattening the post-insert content yields the new evaluable", () => {
    const s = editorReducer(freshState(), {
      type: "INSERT_REGION",
      regionType: "math",
      anchorId: null,
      where: "below",
    });
    const inputs = flattenToRegionInputs(s.content);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].id).toBe(s.selectedId);
  });
});
