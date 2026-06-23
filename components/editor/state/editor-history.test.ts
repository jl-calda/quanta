import { describe, expect, it } from "vitest";
import type { Dispatch } from "react";
import type { SheetResult } from "@/lib/calc";
import type { MathRegion, SymbolicCache, WorksheetContent } from "@/lib/worksheet/content";
import {
  canRedo,
  canUndo,
  editorHistoryReducer,
  initHistory,
  type HistoryAction,
  type HistoryState,
} from "./editor-history";
import { findRegion } from "@/lib/worksheet/flatten";
import type { EditorAction } from "./editor-reducer";

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
          ],
        },
      ],
    },
  ],
});

const twoRowDoc = (): WorksheetContent => ({
  version: 1,
  rows: [
    { id: "r1", columns: 1, cells: [{ regions: [{ id: "A", type: "math", indent: 0, source: "a := 1" }] }] },
    { id: "r2", columns: 1, cells: [{ regions: [{ id: "B", type: "math", indent: 0, source: "b := 2" }] }] },
  ],
});

function init(content: WorksheetContent = listDoc()): HistoryState {
  return initHistory({ content, calcMode: "auto", unitsSystem: "si" });
}
const reduce = (h: HistoryState, a: HistoryAction): HistoryState => editorHistoryReducer(h, a);
const sourceOf = (h: HistoryState, id: string): string => (findRegion(h.present.content, id) as MathRegion).source;
const cache: SymbolicCache = { v: 1, hash: "h", tex: "x + 1", computedAt: "t" };
const emptySheet: SheetResult = { status: "current", errorCount: 0, regions: [] };

describe("editor history — recording", () => {
  it("pushes one snapshot for a content edit and clears the redo stack", () => {
    let h = init();
    h = reduce(h, { type: "EDIT_SOURCE", id: "A", source: "a := 9" });
    expect(h.past).toHaveLength(1);
    expect(h.future).toHaveLength(0);
    expect(h.present.saveState).toBe("unsaved");
  });

  it("never records selection / results / save-state / UI actions", () => {
    let h = init();
    h = reduce(h, { type: "SELECT", id: "A" });
    h = reduce(h, { type: "MARK_STALE" });
    h = reduce(h, { type: "SET_SAVE_STATE", state: "saved" });
    h = reduce(h, { type: "TOGGLE_LEFT" });
    h = reduce(h, { type: "SET_ZOOM", zoom: 1.5 });
    h = reduce(h, { type: "SET_RESULTS", sheet: emptySheet });
    expect(h.past).toHaveLength(0);
    expect(h.present.selectedId).toBe("A");
  });

  it("returns the same HistoryState for an inner no-op (empty-clipboard paste)", () => {
    const h = init();
    expect(reduce(h, { type: "PASTE" })).toBe(h);
  });
});

describe("editor history — coalescing", () => {
  it("folds rapid same-target edits into one undo step", () => {
    let h = init();
    h = reduce(h, { type: "EDIT_SOURCE", id: "A", source: "a := 2" });
    h = reduce(h, { type: "EDIT_SOURCE", id: "A", source: "a := 3" });
    h = reduce(h, { type: "EDIT_SOURCE", id: "A", source: "a := 4" });
    expect(h.past).toHaveLength(1);
    h = reduce(h, { type: "UNDO" });
    expect(sourceOf(h, "A")).toBe("a := 1"); // one undo reverts the whole run
  });

  it("keeps coalescing across an interleaved background recompute", () => {
    let h = init();
    h = reduce(h, { type: "SET_REGION_PROP", id: "A", patch: { unit: "kN" } });
    h = reduce(h, { type: "SET_RESULTS", sheet: emptySheet }); // auto recompute between ticks
    h = reduce(h, { type: "SET_REGION_PROP", id: "A", patch: { unit: "MPa" } });
    expect(h.past).toHaveLength(1);
    expect(h.lastKey).toBe("SET_REGION_PROP:A");
  });

  it("ends the run on a user boundary (a fresh selection)", () => {
    let h = init();
    h = reduce(h, { type: "SET_REGION_PROP", id: "A", patch: { unit: "kN" } });
    h = reduce(h, { type: "SELECT", id: "B" });
    h = reduce(h, { type: "SET_REGION_PROP", id: "A", patch: { unit: "MPa" } });
    expect(h.past).toHaveLength(2);
  });

  it("never coalesces structural ops — each is its own step", () => {
    let h = init();
    h = reduce(h, { type: "INSERT_REGION", regionType: "math", anchorId: "A", where: "below" });
    h = reduce(h, { type: "INSERT_REGION", regionType: "math", anchorId: "B", where: "below" });
    expect(h.past).toHaveLength(2);
  });

  it("treats a page-break toggle (PR #65) as its own undo step", () => {
    let h = init(twoRowDoc());
    h = reduce(h, { type: "TOGGLE_ROW_BREAK", rowId: "r2" });
    h = reduce(h, { type: "TOGGLE_ROW_BREAK", rowId: "r2" });
    expect(h.past).toHaveLength(2);
  });
});

describe("editor history — worker cache exclusion", () => {
  it("does not record a worker cache write and preserves the redo stack", () => {
    let h = init();
    h = reduce(h, { type: "EDIT_SOURCE", id: "A", source: "a := 2" });
    h = reduce(h, { type: "UNDO" });
    expect(h.future).toHaveLength(1);
    expect(canRedo(h)).toBe(true);
    // A SymPy result lands after the undo — it must not clobber redo or add a step.
    h = reduce(h, { type: "SET_REGION_PROP", id: "A", patch: { cache } });
    expect(h.past).toHaveLength(0);
    expect(h.future).toHaveLength(1);
    expect(canRedo(h)).toBe(true);
    // The cache still applied to the live document.
    expect((findRegion(h.present.content, "A") as MathRegion).cache).toEqual(cache);
  });

  it("keeps a MIXED patch (worker key + user key) undoable", () => {
    let h = init();
    h = reduce(h, { type: "SET_REGION_PROP", id: "A", patch: { cache, unit: "kN" } });
    expect(h.past).toHaveLength(1);
  });
});

describe("editor history — undo / redo", () => {
  it("no-ops on empty stacks", () => {
    const h = init();
    expect(canUndo(h)).toBe(false);
    expect(reduce(h, { type: "UNDO" })).toBe(h);
    expect(reduce(h, { type: "REDO" })).toBe(h);
  });

  it("restores content + selection, leaves edit mode, marks unsaved, and round-trips", () => {
    let h = init();
    h = reduce(h, { type: "BEGIN_EDIT", id: "A" });
    h = reduce(h, { type: "EDIT_SOURCE", id: "A", source: "a := 5" });
    const edited = h.present.content;
    h = reduce(h, { type: "UNDO" });
    expect(sourceOf(h, "A")).toBe("a := 1");
    expect(h.present.editingId).toBeNull();
    expect(h.present.saveState).toBe("unsaved");
    expect(canRedo(h)).toBe(true);
    h = reduce(h, { type: "REDO" });
    expect(h.present.content).toBe(edited); // exact tree restored
    expect(sourceOf(h, "A")).toBe("a := 5");
  });

  it("clears the redo stack when a new edit follows an undo", () => {
    let h = init();
    h = reduce(h, { type: "EDIT_SOURCE", id: "A", source: "a := 2" });
    h = reduce(h, { type: "UNDO" });
    expect(canRedo(h)).toBe(true);
    h = reduce(h, { type: "EDIT_SOURCE", id: "B", source: "b := 9" });
    expect(h.future).toHaveLength(0);
  });

  it("walks multiple distinct steps back and forward", () => {
    let h = init();
    h = reduce(h, { type: "EDIT_SOURCE", id: "A", source: "a := 2" });
    h = reduce(h, { type: "EDIT_SOURCE", id: "B", source: "b := 3" });
    h = reduce(h, { type: "UNDO" });
    expect(sourceOf(h, "B")).toBe("b := 2");
    h = reduce(h, { type: "UNDO" });
    expect(sourceOf(h, "A")).toBe("a := 1");
    h = reduce(h, { type: "REDO" });
    expect(sourceOf(h, "A")).toBe("a := 2");
  });
});

describe("editor history — capacity", () => {
  it("caps the undo stack at HISTORY_LIMIT, dropping the oldest", () => {
    let h = init();
    for (let i = 0; i < 101; i += 1) {
      h = reduce(h, { type: "INSERT_REGION", regionType: "math", anchorId: null, where: "below" });
    }
    expect(h.past).toHaveLength(100);
  });
});

describe("editor history — typing", () => {
  it("a Dispatch<HistoryAction> is assignable where Dispatch<EditorAction> is expected", () => {
    const dispatch: Dispatch<HistoryAction> = () => {};
    const asEditor: Dispatch<EditorAction> = dispatch; // compiles only under contravariance
    expect(typeof asEditor).toBe("function");
  });
});
