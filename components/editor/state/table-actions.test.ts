import { describe, expect, it } from "vitest";
import type { TableRegion, WorksheetContent } from "@/lib/worksheet/content";
import { editorReducer, initEditorState, type EditorState } from "./editor-reducer";

function tableDoc(): WorksheetContent {
  return {
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
                columns: [
                  { key: "a", label: "A" },
                  { key: "b", label: "B" },
                ],
                rows: [
                  ["1", "2"],
                  ["3", "4"],
                ],
              } as TableRegion,
            ],
          },
        ],
      },
    ],
  };
}

function fresh(content = tableDoc()): EditorState {
  return initEditorState({ content, calcMode: "auto", unitsSystem: "si" });
}

function table(state: EditorState): TableRegion {
  return state.content.rows[0].cells[0].regions[0] as TableRegion;
}

describe("EDIT_TABLE_CELL", () => {
  it("sets one cell's source and marks the doc unsaved", () => {
    const s = editorReducer(fresh(), { type: "EDIT_TABLE_CELL", id: "t1", r: 0, c: 1, source: "=A2*2" });
    expect(table(s).rows[0][1]).toBe("=A2*2");
    expect(table(s).rows[1]).toEqual(["3", "4"]); // other cells untouched
    expect(s.saveState).toBe("unsaved");
  });

  it("grows the grid to reach an out-of-bounds cell", () => {
    const s = editorReducer(fresh(), { type: "EDIT_TABLE_CELL", id: "t1", r: 3, c: 0, source: "x" });
    expect(table(s).rows).toHaveLength(4);
    expect(table(s).rows[3][0]).toBe("x");
  });
});

describe("table structural actions", () => {
  it("ADD_TABLE_ROW appends a blank row matching the column count", () => {
    const s = editorReducer(fresh(), { type: "ADD_TABLE_ROW", id: "t1" });
    expect(table(s).rows).toHaveLength(3);
    expect(table(s).rows[2]).toEqual(["", ""]);
  });

  it("DELETE_TABLE_ROW removes the row at the index", () => {
    const s = editorReducer(fresh(), { type: "DELETE_TABLE_ROW", id: "t1", r: 0 });
    expect(table(s).rows).toEqual([["3", "4"]]);
  });

  it("ADD_TABLE_COLUMN adds a column and a cell per row", () => {
    const s = editorReducer(fresh(), { type: "ADD_TABLE_COLUMN", id: "t1" });
    expect(table(s).columns).toHaveLength(3);
    expect(table(s).columns[2].label).toBe("Column C");
    expect(table(s).rows.every((row) => row.length === 3)).toBe(true);
  });

  it("DELETE_TABLE_COLUMN removes the column and its cells", () => {
    const s = editorReducer(fresh(), { type: "DELETE_TABLE_COLUMN", id: "t1", key: "a" });
    expect(table(s).columns.map((c) => c.key)).toEqual(["b"]);
    expect(table(s).rows).toEqual([["2"], ["4"]]);
  });

  it("SET_TABLE_COLUMN patches a single column", () => {
    const s = editorReducer(fresh(), { type: "SET_TABLE_COLUMN", id: "t1", key: "b", patch: { unit: "kN", align: "right" } });
    expect(table(s).columns[1].unit).toBe("kN");
    expect(table(s).columns[1].align).toBe("right");
    expect(table(s).columns[0].unit).toBeUndefined();
  });
});

describe("table view state (sort / filter)", () => {
  it("SET_TABLE_SORT sets the sort and marks the doc unsaved", () => {
    const s = editorReducer(fresh(), { type: "SET_TABLE_SORT", id: "t1", sort: { key: "b", dir: "desc" } });
    expect(table(s).sort).toEqual({ key: "b", dir: "desc" });
    expect(s.saveState).toBe("unsaved");
  });

  it("SET_TABLE_SORT with null removes the key entirely (no JSONB noise)", () => {
    const set = editorReducer(fresh(), { type: "SET_TABLE_SORT", id: "t1", sort: { key: "a", dir: "asc" } });
    const cleared = editorReducer(set, { type: "SET_TABLE_SORT", id: "t1", sort: null });
    expect("sort" in table(cleared)).toBe(false);
  });

  it("SET_TABLE_FILTER sets and clears the filter", () => {
    const set = editorReducer(fresh(), { type: "SET_TABLE_FILTER", id: "t1", filter: { key: "b", op: ">", value: 10 } });
    expect(table(set).filter).toEqual({ key: "b", op: ">", value: 10 });
    const cleared = editorReducer(set, { type: "SET_TABLE_FILTER", id: "t1", filter: null });
    expect("filter" in table(cleared)).toBe(false);
  });

  it("leaves the underlying rows untouched (display-only)", () => {
    const s = editorReducer(fresh(), { type: "SET_TABLE_SORT", id: "t1", sort: { key: "b", dir: "desc" } });
    expect(table(s).rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });
});
