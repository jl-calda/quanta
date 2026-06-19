import { describe, expect, it } from "vitest";
import type { SheetResult } from "@/lib/calc";
import { parseContent, type ControlRegion, type PlotRegion, type WorksheetContent } from "@/lib/worksheet/content";
import { findRegion, flattenToRegionInputs, readingOrderIds } from "@/lib/worksheet/flatten";
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

describe("INSERT_HEADING", () => {
  it("creates an H1 text region in an empty doc and opens it for editing", () => {
    const s = editorReducer(freshState(), {
      type: "INSERT_HEADING",
      anchorId: null,
      where: "below",
    });
    expect(s.content.rows).toHaveLength(1);
    const region = s.content.rows[0].cells[0].regions[0];
    expect(region.type).toBe("text");
    expect(region.type === "text" && region.heading).toBe(1);
    expect(s.selectedId).toBe(region.id);
    expect(s.editingId).toBe(region.id);
    expect(s.saveState).toBe("unsaved");
  });

  it("inserts the heading below an anchor in the same container", () => {
    const s = editorReducer(freshState(twoColDoc), {
      type: "INSERT_HEADING",
      anchorId: "A",
      where: "below",
    });
    const regions = s.content.rows[0].cells[0].regions;
    expect(regions[0].id).toBe("A");
    expect(regions[1].type === "text" && regions[1].heading).toBe(1);
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

const listDoc = (): WorksheetContent => ({
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
});

const areaDoc: WorksheetContent = {
  version: 1,
  rows: [
    {
      id: "r1",
      columns: 1,
      cells: [
        {
          regions: [
            {
              id: "AR",
              type: "area",
              indent: 0,
              title: "Derivation",
              collapsed: false,
              regions: [{ id: "X", type: "math", indent: 0, source: "x := 1" }],
            },
            { id: "Y", type: "math", indent: 0, source: "y := 2" },
          ],
        },
      ],
    },
  ],
};

describe("multi-selection", () => {
  it("SELECT resets the multi-selection to the single id (or clears it)", () => {
    let s = editorReducer(freshState(listDoc()), { type: "SELECT", id: "A" });
    expect(s.selectedId).toBe("A");
    expect(s.selectedIds).toEqual(["A"]);
    s = editorReducer(s, { type: "SELECT", id: null });
    expect(s.selectedId).toBeNull();
    expect(s.selectedIds).toEqual([]);
  });

  it("TOGGLE_SELECT adds, then removes, promoting a new primary", () => {
    let s = editorReducer(freshState(listDoc()), { type: "SELECT", id: "A" });
    s = editorReducer(s, { type: "TOGGLE_SELECT", id: "B" });
    expect(s.selectedIds).toEqual(["A", "B"]);
    expect(s.selectedId).toBe("B");
    // Removing a non-primary keeps the primary.
    s = editorReducer(s, { type: "TOGGLE_SELECT", id: "A" });
    expect(s.selectedIds).toEqual(["B"]);
    expect(s.selectedId).toBe("B");
    // Removing the primary clears it (last remaining → null here).
    s = editorReducer(s, { type: "TOGGLE_SELECT", id: "B" });
    expect(s.selectedIds).toEqual([]);
    expect(s.selectedId).toBeNull();
  });

  it("SELECT_TO selects the reading-order range either direction", () => {
    const forward = editorReducer(
      editorReducer(freshState(listDoc()), { type: "SELECT", id: "A" }),
      { type: "SELECT_TO", id: "C" },
    );
    expect(forward.selectedIds).toEqual(["A", "B", "C"]);
    expect(forward.selectedId).toBe("C");

    const backward = editorReducer(
      editorReducer(freshState(listDoc()), { type: "SELECT", id: "C" }),
      { type: "SELECT_TO", id: "A" },
    );
    expect(backward.selectedIds).toEqual(["A", "B", "C"]);
    expect(backward.selectedId).toBe("A");
  });

  it("SELECT_TO ranges across an area's children in reading order", () => {
    const s = editorReducer(
      editorReducer(freshState(areaDoc), { type: "SELECT", id: "AR" }),
      { type: "SELECT_TO", id: "Y" },
    );
    expect(s.selectedIds).toEqual(["AR", "X", "Y"]);
  });

  it("SELECT_TO with no anchor falls back to a single select", () => {
    const s = editorReducer(freshState(listDoc()), { type: "SELECT_TO", id: "B" });
    expect(s.selectedIds).toEqual(["B"]);
  });

  it("SELECT_ALL selects every region in reading order", () => {
    const s = editorReducer(freshState(listDoc()), { type: "SELECT_ALL" });
    expect(s.selectedIds).toEqual(["A", "B", "C"]);
    expect(s.selectedId).toBe("C");
  });

  it("BEGIN_EDIT collapses a multi-selection to the edited id", () => {
    let s = editorReducer(freshState(listDoc()), { type: "SELECT", id: "A" });
    s = editorReducer(s, { type: "TOGGLE_SELECT", id: "B" });
    s = editorReducer(s, { type: "BEGIN_EDIT", id: "A" });
    expect(s.selectedIds).toEqual(["A"]);
    expect(s.editingId).toBe("A");
  });
});

describe("DELETE_SELECTED", () => {
  const twoRowDoc: WorksheetContent = {
    version: 1,
    rows: [
      { id: "r1", columns: 1, cells: [{ regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] }] },
      {
        id: "r2",
        columns: 1,
        cells: [
          {
            regions: [
              { id: "B", type: "math", indent: 0, source: "b := 2" },
              { id: "C", type: "math", indent: 0, source: "c := 3" },
            ],
          },
        ],
      },
    ],
  };

  it("removes every selected region, prunes empty rows, and clears the selection", () => {
    let s = editorReducer(freshState(twoRowDoc), { type: "SELECT", id: "A" });
    s = editorReducer(s, { type: "TOGGLE_SELECT", id: "B" });
    s = editorReducer(s, { type: "DELETE_SELECTED" });
    expect(readingOrderIds(s.content)).toEqual(["C"]);
    expect(s.content.rows).toHaveLength(1);
    expect(s.selectedId).toBeNull();
    expect(s.selectedIds).toEqual([]);
  });
});

describe("DELETE_REGION selection reconcile", () => {
  it("deleting an area drops its nested children from the multi-selection", () => {
    let s = editorReducer(freshState(areaDoc), { type: "SELECT", id: "Y" });
    s = editorReducer(s, { type: "TOGGLE_SELECT", id: "AR" });
    s = editorReducer(s, { type: "TOGGLE_SELECT", id: "X" });
    expect(s.selectedIds).toEqual(["Y", "AR", "X"]);
    s = editorReducer(s, { type: "DELETE_REGION", id: "AR" });
    // AR and its child X are gone; only Y survives in the selection.
    expect(readingOrderIds(s.content)).toEqual(["Y"]);
    expect(s.selectedIds).toEqual(["Y"]);
    expect(s.selectedId).toBe("Y");
  });
});

describe("INDENT_SELECTED", () => {
  it("indents every selected region, clamping each independently", () => {
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
                { id: "B", type: "math", indent: 8, source: "b := 2" },
              ],
            },
          ],
        },
      ],
    };
    let s = editorReducer(freshState(doc), { type: "SELECT", id: "A" });
    s = editorReducer(s, { type: "TOGGLE_SELECT", id: "B" });
    s = editorReducer(s, { type: "INDENT_SELECTED", delta: 1 });
    const [a, b] = s.content.rows[0].cells[0].regions;
    expect(a.indent).toBe(1);
    expect(b.indent).toBe(8); // already at the cap
  });
});

describe("DUPLICATE_SELECTED", () => {
  it("duplicates each selected region and selects the copies", () => {
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
    let s = editorReducer(freshState(doc), { type: "SELECT", id: "A" });
    s = editorReducer(s, { type: "TOGGLE_SELECT", id: "B" });
    s = editorReducer(s, { type: "DUPLICATE_SELECTED" });
    const ids = s.content.rows[0].cells[0].regions.map((r) => r.id);
    expect(ids).toHaveLength(4);
    expect(ids[0]).toBe("A");
    expect(ids[2]).toBe("B");
    const copies = [ids[1], ids[3]];
    expect(new Set(ids).size).toBe(4); // all ids unique
    expect(s.selectedIds).toEqual(copies);
    expect(s.selectedId).toBe(copies[1]);
  });
});

describe("SET_SPLIT", () => {
  it("stores a normalized ratio array of length === columns", () => {
    const s = editorReducer(freshState(twoColDoc), { type: "SET_SPLIT", rowId: "r1", split: [0.65, 0.35] });
    const split = s.content.rows[0].split!;
    expect(split).toHaveLength(2);
    expect(split[0] + split[1]).toBeCloseTo(1, 5);
    expect(split[0]).toBeGreaterThan(split[1]);
  });

  it("clamps a collapsing column away from zero", () => {
    const s = editorReducer(freshState(twoColDoc), { type: "SET_SPLIT", rowId: "r1", split: [0.97, 0.03] });
    const split = s.content.rows[0].split!;
    expect(split.every((v) => v > 0.1)).toBe(true);
  });

  it("is a no-op on a single-column row", () => {
    const doc: WorksheetContent = {
      version: 1,
      rows: [{ id: "r1", columns: 1, cells: [{ regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] }] }],
    };
    const base = freshState(doc);
    const s = editorReducer(base, { type: "SET_SPLIT", rowId: "r1", split: [0.5, 0.5] });
    expect(s).toBe(base);
  });

  it("SET_COLUMNS clears a previously dragged split", () => {
    let s = editorReducer(freshState(twoColDoc), { type: "SET_SPLIT", rowId: "r1", split: [0.7, 0.3] });
    expect(s.content.rows[0].split).toBeDefined();
    s = editorReducer(s, { type: "SET_COLUMNS", rowId: "r1", columns: 3 });
    expect(s.content.rows[0].split).toBeUndefined();
  });
});

describe("MOVE_TO_CELL", () => {
  const emptyCellDoc: WorksheetContent = {
    version: 1,
    rows: [
      {
        id: "r1",
        columns: 2,
        cells: [
          { regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] },
          { regions: [] },
        ],
      },
    ],
  };

  it("appends a region into an empty cell, preserving the cells===columns invariant", () => {
    const s = editorReducer(freshState(emptyCellDoc), { type: "MOVE_TO_CELL", id: "A", rowId: "r1", cellIndex: 1 });
    expect(s.content.rows[0].cells[0].regions).toHaveLength(0);
    expect(s.content.rows[0].cells[1].regions.map((r) => r.id)).toEqual(["A"]);
    expect(s.content.rows[0].cells).toHaveLength(s.content.rows[0].columns);
  });

  it("is a no-op when the region already lives in the target cell", () => {
    const base = freshState(emptyCellDoc);
    const s = editorReducer(base, { type: "MOVE_TO_CELL", id: "A", rowId: "r1", cellIndex: 0 });
    expect(s).toBe(base);
  });

  it("is a no-op for an out-of-range cell index", () => {
    const base = freshState(emptyCellDoc);
    const s = editorReducer(base, { type: "MOVE_TO_CELL", id: "A", rowId: "r1", cellIndex: 5 });
    expect(s).toBe(base);
  });

  it("prunes the source row when the moved region was its only content", () => {
    const doc: WorksheetContent = {
      version: 1,
      rows: [
        { id: "r1", columns: 1, cells: [{ regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] }] },
        {
          id: "r2",
          columns: 2,
          cells: [{ regions: [{ id: "B", type: "math", indent: 0, source: "b := 2" }] }, { regions: [] }],
        },
      ],
    };
    const s = editorReducer(freshState(doc), { type: "MOVE_TO_CELL", id: "A", rowId: "r2", cellIndex: 1 });
    expect(s.content.rows).toHaveLength(1);
    expect(readingOrderIds(s.content)).toEqual(["B", "A"]);
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

/* ------------------------------------------------------------------ *
 * Plot region edits
 * ------------------------------------------------------------------ */

const plotDoc: WorksheetContent = {
  version: 1,
  rows: [{ id: "r1", columns: 1, cells: [{ regions: [{ id: "P", type: "plot", indent: 0, kind: "xy", xVar: "x", yVar: "y", x: {}, y: {}, traces: [{ id: "t1", expr: "2*x", style: "line" }], legend: true }] }] }],
};

function getPlot(content: WorksheetContent, id = "P"): PlotRegion {
  return findRegion(content, id) as PlotRegion;
}

describe("INSERT_PLOT", () => {
  it("inserts a plot of the requested kind and selects it", () => {
    const s = editorReducer(freshState(), { type: "INSERT_PLOT", kind: "polar", anchorId: null, where: "below" });
    const region = getPlot(s.content, s.selectedId!);
    expect(region.type).toBe("plot");
    expect(region.kind).toBe("polar");
    expect(s.editingId).toBeNull(); // plots open to their inspector, not inline edit
    expect(s.saveState).toBe("unsaved");
  });
});

describe("SET_PLOT_AXIS", () => {
  it("merges an axis patch and can clear a pin back to auto", () => {
    let s = editorReducer(freshState(plotDoc), { type: "SET_PLOT_AXIS", id: "P", axis: "x", patch: { min: 0, max: 6, unit: "m" } });
    expect(getPlot(s.content).x).toEqual({ min: 0, max: 6, unit: "m" });
    s = editorReducer(s, { type: "SET_PLOT_AXIS", id: "P", axis: "x", patch: { min: undefined } });
    expect(getPlot(s.content).x.min).toBeUndefined();
    expect(getPlot(s.content).x.max).toBe(6); // other keys preserved
  });
});

describe("plot trace edits", () => {
  it("adds, edits, toggles, and deletes traces", () => {
    let s = editorReducer(freshState(plotDoc), { type: "ADD_PLOT_TRACE", id: "P" });
    expect(getPlot(s.content).traces).toHaveLength(2);
    const newId = getPlot(s.content).traces[1].id;

    s = editorReducer(s, { type: "SET_PLOT_TRACE", id: "P", traceId: newId, patch: { expr: "x^2", style: "scatter" } });
    expect(getPlot(s.content).traces[1]).toMatchObject({ expr: "x^2", style: "scatter" });

    s = editorReducer(s, { type: "TOGGLE_PLOT_TRACE", id: "P", traceId: "t1" });
    expect(getPlot(s.content).traces[0].hidden).toBe(true);

    s = editorReducer(s, { type: "DELETE_PLOT_TRACE", id: "P", traceId: "t1" });
    expect(getPlot(s.content).traces.map((t) => t.id)).toEqual([newId]);
  });
});

describe("contour / 3D config round-trips through the content schema", () => {
  it("preserves z-expr, x/y ranges, grid resolution, and options across a load→save cycle", () => {
    const doc: WorksheetContent = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            {
              regions: [
                {
                  id: "S",
                  type: "plot",
                  indent: 0,
                  kind: "surface",
                  xVar: "x",
                  yVar: "y",
                  x: { min: -2, max: 2 },
                  y: { min: -2, max: 2 },
                  z: { expr: "sin(x)*cos(y)", unit: "mm" },
                  grid: { x: 40, y: 30 },
                  surface: { wireframe: true, showScale: true },
                  traces: [],
                  legend: true,
                },
              ],
            },
          ],
        },
      ],
    };
    // A full parse (the load path) must keep every contour/3D config field.
    const parsed = parseContent(doc);
    const region = getPlot(parsed, "S");
    expect(region.kind).toBe("surface");
    expect(region.z).toEqual({ expr: "sin(x)*cos(y)", unit: "mm" });
    expect(region.x).toEqual({ min: -2, max: 2 });
    expect(region.grid).toEqual({ x: 40, y: 30 });
    expect(region.surface).toEqual({ wireframe: true, showScale: true });
    // And a re-parse (save→load) is stable.
    expect(parseContent(parsed)).toEqual(parsed);
  });
});

describe("input controls", () => {
  const controlDoc: WorksheetContent = {
    version: 1,
    rows: [
      {
        id: "r1",
        columns: 1,
        cells: [
          {
            regions: [
              { id: "C", type: "control", indent: 0, kind: "slider", bind: "L", valueType: "number", value: 5 },
            ],
          },
        ],
      },
    ],
  };
  const getControl = (s: EditorState) => findRegion(s.content, "C") as ControlRegion;

  it("inserts a control selected but not in inline edit (configured via inspector)", () => {
    const s = editorReducer(freshState(), {
      type: "INSERT_REGION",
      regionType: "control",
      anchorId: null,
      where: "below",
    });
    const region = s.content.rows[0].cells[0].regions[0] as ControlRegion;
    expect(region.type).toBe("control");
    expect(region.kind).toBe("slider");
    expect(s.selectedId).toBe(region.id);
    expect(s.editingId).toBeNull();
    expect(s.saveState).toBe("unsaved");
  });

  it("SET_REGION_PROP updates the control value and marks the doc unsaved", () => {
    const s = editorReducer(freshState(controlDoc), { type: "SET_REGION_PROP", id: "C", patch: { value: 8 } });
    expect(getControl(s).value).toBe(8);
    expect(s.saveState).toBe("unsaved");
  });

  it("SET_REGION_PROP assigns a falsy value (checkbox unchecked / zero)", () => {
    const s = editorReducer(freshState(controlDoc), { type: "SET_REGION_PROP", id: "C", patch: { value: false } });
    expect(getControl(s).value).toBe(false);
  });

  it("SET_REGION_PROP replaces the options list (combo paste)", () => {
    const s = editorReducer(freshState(controlDoc), {
      type: "SET_REGION_PROP",
      id: "C",
      patch: { kind: "combo", options: [{ value: "S275" }, { value: "S355" }], value: "S275" },
    });
    const c = getControl(s);
    expect(c.kind).toBe("combo");
    expect(c.options).toEqual([{ value: "S275" }, { value: "S355" }]);
    expect(c.value).toBe("S275");
  });
});
