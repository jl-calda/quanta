import { describe, expect, it } from "vitest";
import { tableViewOrder, type TableViewArgs } from "./table-view";
import { evaluateTable, type TableCellResult, type TableSpec } from "./table";
import { math } from "./math";

/** A literal cell carrying `value` (the sort/filter comparand). */
function cell(value: unknown): TableCellResult {
  return { value, formatted: String(value), kind: "literal" };
}
const EMPTY: TableCellResult = { value: undefined, formatted: "", kind: "empty" };

/** Build view args from a column-of-values grid (single column "x" unless given). */
function args(values: unknown[][], extra?: Partial<TableViewArgs>): TableViewArgs {
  return {
    rows: values.map((row) => row.map((v) => String(v ?? ""))),
    columns: (values[0] ?? []).map((_, c) => ({ key: `c${c}` })),
    cells: values.map((row) => row.map((v) => (v === undefined ? EMPTY : cell(v)))),
    ...extra,
  };
}

describe("tableViewOrder — identity", () => {
  it("returns every row in order with no sort or filter", () => {
    expect(tableViewOrder(args([[3], [1], [2]]))).toEqual([0, 1, 2]);
  });
  it("ignores a sort/filter key that maps to no column", () => {
    const a = args([[3], [1], [2]]);
    expect(tableViewOrder({ ...a, sort: { key: "gone", dir: "asc" } })).toEqual([0, 1, 2]);
    expect(tableViewOrder({ ...a, filter: { key: "gone", op: ">", value: 0 } })).toEqual([0, 1, 2]);
  });
  it("returns [] for an empty table", () => {
    expect(tableViewOrder(args([]))).toEqual([]);
  });
});

describe("tableViewOrder — sort", () => {
  it("sorts a numeric column ascending and descending", () => {
    const a = args([[3], [1], [2]]);
    expect(tableViewOrder({ ...a, sort: { key: "c0", dir: "asc" } })).toEqual([1, 2, 0]);
    expect(tableViewOrder({ ...a, sort: { key: "c0", dir: "desc" } })).toEqual([0, 2, 1]);
  });

  it("sorts unit values by magnitude (unit-aware)", () => {
    const a = args([[math.unit("12 kN")], [math.unit("41 kN")], [math.unit("18.5 kN")]]);
    expect(tableViewOrder({ ...a, sort: { key: "c0", dir: "asc" } })).toEqual([0, 2, 1]);
  });

  it("sorts a string column with localeCompare", () => {
    const a = args([["M16"], ["M12"], ["M24"]]);
    expect(tableViewOrder({ ...a, sort: { key: "c0", dir: "asc" } })).toEqual([1, 0, 2]);
  });

  it("keeps ties in original (data) order — stable", () => {
    const a = args([[5], [1], [5], [1]]);
    expect(tableViewOrder({ ...a, sort: { key: "c0", dir: "asc" } })).toEqual([1, 3, 0, 2]);
  });

  it("sinks non-orderable cells to the end of a numeric column", () => {
    const a = args([[3], ["n/a"], [1]]);
    expect(tableViewOrder({ ...a, sort: { key: "c0", dir: "asc" } })).toEqual([2, 0, 1]);
  });

  it("falls back to raw row strings when there are no evaluated cells", () => {
    const a: TableViewArgs = {
      rows: [["3"], ["1"], ["2"]],
      columns: [{ key: "c0" }],
    };
    expect(tableViewOrder({ ...a, sort: { key: "c0", dir: "asc" } })).toEqual([1, 2, 0]);
  });
});

describe("tableViewOrder — filter", () => {
  it("applies each ordered operator", () => {
    const a = args([[10], [20], [30]]);
    expect(tableViewOrder({ ...a, filter: { key: "c0", op: ">", value: 15 } })).toEqual([1, 2]);
    expect(tableViewOrder({ ...a, filter: { key: "c0", op: ">=", value: 20 } })).toEqual([1, 2]);
    expect(tableViewOrder({ ...a, filter: { key: "c0", op: "<", value: 25 } })).toEqual([0, 1]);
    expect(tableViewOrder({ ...a, filter: { key: "c0", op: "<=", value: 20 } })).toEqual([0, 1]);
    expect(tableViewOrder({ ...a, filter: { key: "c0", op: "=", value: 20 } })).toEqual([1]);
    expect(tableViewOrder({ ...a, filter: { key: "c0", op: "!=", value: 20 } })).toEqual([0, 2]);
  });

  it("coerces a string filter value for a numeric column", () => {
    const a = args([[10], [20], [30]]);
    expect(tableViewOrder({ ...a, filter: { key: "c0", op: ">", value: "15" } })).toEqual([1, 2]);
  });

  it("matches strings by equality on a text column", () => {
    const a = args([["PASS"], ["FAIL"], ["PASS"]]);
    expect(tableViewOrder({ ...a, filter: { key: "c0", op: "=", value: "PASS" } })).toEqual([0, 2]);
  });

  it("excludes empty cells under a numeric operator", () => {
    const a = args([[10], [undefined], [30]]);
    expect(tableViewOrder({ ...a, filter: { key: "c0", op: ">", value: 5 } })).toEqual([0, 2]);
  });
});

describe("tableViewOrder — filter + sort composition", () => {
  it("filters first, then sorts; a filtered-out row never reappears", () => {
    const a = args([[30], [5], [20], [10]]);
    const order = tableViewOrder({
      ...a,
      filter: { key: "c0", op: ">", value: 9 },
      sort: { key: "c0", dir: "asc" },
    });
    expect(order).toEqual([3, 2, 0]); // 5 dropped; {10,20,30} ascending
  });
});

describe("tableViewOrder — errored rows stay visible", () => {
  it("keeps a row whose filter-key cell errored (a checker sees #error, not a gap)", () => {
    // `=nope` references an undefined name → a real error cell in data order.
    const spec: TableSpec = {
      columns: [{ key: "x", label: "X" }],
      rows: [["10"], ["=nope"], ["30"]],
    };
    const result = evaluateTable(spec);
    expect(result.cells[1][0].error).toBeDefined();

    const order = tableViewOrder({
      rows: spec.rows,
      columns: spec.columns,
      cells: result.cells,
      filter: { key: "x", op: ">", value: 15 },
    });
    expect(order).toContain(1); // the errored row is retained
    expect(order).toEqual([1, 2]); // 10 dropped (<15), error kept, 30 kept
  });
});

describe("tableViewOrder — lookups still resolve (display-only invariant)", () => {
  it("evaluation is byte-identical regardless of the sort/filter view", () => {
    const spec: TableSpec = {
      columns: [
        { key: "mark", label: "Mark" },
        { key: "val", label: "Value" },
        { key: "out", label: "Out" },
      ],
      ranges: { db: "A2:B3" },
      rows: [
        ["A1", "10", '=Vlookup("A2", db, 2)'],
        ["A2", "20", "=B2+B3"],
      ],
    };
    const result = evaluateTable(spec);

    // Sanity: the Vlookup and the A1 sum resolve by DATA-order index.
    expect(result.cells[0][2].value).toBe(20);
    expect(result.cells[1][2].value).toBe(30);

    // A sort/filter view is computed over the SAME cells; it must not mutate them
    // nor change what the engine resolved — it only reorders display indices.
    const view = tableViewOrder({
      rows: spec.rows,
      columns: spec.columns,
      cells: result.cells,
      sort: { key: "val", dir: "desc" },
    });
    expect(view).toEqual([1, 0]); // 20 before 10

    const reEval = evaluateTable(spec);
    expect(reEval.cells[0][2].value).toBe(20);
    expect(reEval.cells[1][2].value).toBe(30);
    expect(spec.rows).toEqual([
      ["A1", "10", '=Vlookup("A2", db, 2)'],
      ["A2", "20", "=B2+B3"],
    ]); // rows untouched
  });
});
