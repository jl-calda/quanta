import { describe, expect, it } from "vitest";
import { evaluateTableGroup, type TableGroupArgs } from "./table-group";
import { type TableCellResult } from "./table";
import { math } from "./math";

function lit(value: unknown, formatted?: string): TableCellResult {
  return { value, formatted: formatted ?? String(value), kind: "literal" };
}
const EMPTY: TableCellResult = { value: undefined, formatted: "", kind: "empty" };

/** Two columns: "grade" (group key) and "load" (value). */
function args(
  data: { grade: string; load?: unknown }[],
  agg: TableGroupArgs["group"]["agg"],
  opts?: { value?: string },
): TableGroupArgs {
  return {
    rows: data.map((d) => [d.grade, d.load === undefined ? "" : String(d.load)]),
    columns: [
      { key: "grade", label: "Grade" },
      { key: "load", label: "Load", unit: "kN" },
    ],
    cells: data.map((d) => [lit(d.grade), d.load === undefined ? EMPTY : lit(d.load)]),
    group: { by: "grade", agg, value: opts?.value ?? "load" },
  };
}

describe("evaluateTableGroup — count", () => {
  it("counts rows per group in first-seen order", () => {
    const r = evaluateTableGroup(args(
      [{ grade: "A" }, { grade: "B" }, { grade: "A" }, { grade: "A" }],
      "count",
    ));
    expect(r.rows.map((g) => [g.key, g.value])).toEqual([
      ["A", 3],
      ["B", 1],
    ]);
    expect(r.byLabel).toBe("Grade");
  });
});

describe("evaluateTableGroup — numeric aggregates", () => {
  const data = [
    { grade: "A", load: 10 },
    { grade: "B", load: 5 },
    { grade: "A", load: 30 },
    { grade: "A", load: 20 },
  ];
  it("sums per group", () => {
    const r = evaluateTableGroup(args(data, "sum"));
    expect(r.rows.find((g) => g.key === "A")?.value).toBe(60);
    expect(r.rows.find((g) => g.key === "B")?.value).toBe(5);
  });
  it("means per group", () => {
    const r = evaluateTableGroup(args(data, "mean"));
    expect(r.rows.find((g) => g.key === "A")?.value).toBe(20);
  });
  it("takes min and max per group", () => {
    expect(evaluateTableGroup(args(data, "min")).rows.find((g) => g.key === "A")?.value).toBe(10);
    expect(evaluateTableGroup(args(data, "max")).rows.find((g) => g.key === "A")?.value).toBe(30);
  });
});

describe("evaluateTableGroup — unit-aware", () => {
  function unitArgs(loads: { grade: string; load: unknown }[], agg: TableGroupArgs["group"]["agg"]): TableGroupArgs {
    return {
      rows: loads.map((d) => [d.grade, "x"]),
      columns: [
        { key: "grade", label: "Grade" },
        { key: "load", label: "Load" },
      ],
      cells: loads.map((d) => [lit(d.grade), lit(d.load)]),
      group: { by: "grade", agg, value: "load" },
    };
  }
  it("sums unit values, converting compatible units", () => {
    const r = evaluateTableGroup(unitArgs(
      [{ grade: "A", load: math.unit("2 kN") }, { grade: "A", load: math.unit("500 N") }],
      "sum",
    ));
    const v = r.rows[0].value;
    expect(math.unit(v as never).toNumber("kN")).toBeCloseTo(2.5, 6);
    expect(r.rows[0].error).toBeUndefined();
  });
  it("rejects incompatible-unit mixing with a per-group error, never throwing", () => {
    const r = evaluateTableGroup(unitArgs(
      [{ grade: "A", load: math.unit("2 kN") }, { grade: "A", load: math.unit("3 mm") }],
      "sum",
    ));
    expect(r.rows[0].value).toBeUndefined();
    expect(r.rows[0].error).toBeTruthy();
    expect(r.rows[0].formatted).toBe("—");
  });
});

describe("evaluateTableGroup — graceful degradation", () => {
  it("returns no rows when the group column is missing", () => {
    const a = args([{ grade: "A", load: 1 }], "sum");
    const r = evaluateTableGroup({ ...a, group: { by: "gone", agg: "sum", value: "load" } });
    expect(r.rows).toEqual([]);
  });
  it("skips non-numeric and empty cells, showing — for an all-empty group", () => {
    const r = evaluateTableGroup(args(
      [{ grade: "A", load: undefined }, { grade: "A", load: undefined }],
      "sum",
    ));
    expect(r.rows[0].formatted).toBe("—");
    expect(r.rows[0].count).toBe(2);
    expect(r.rows[0].error).toBeUndefined();
  });
  it("asks for a value column when sum has none", () => {
    const a = args([{ grade: "A", load: 1 }], "sum");
    const r = evaluateTableGroup({ ...a, group: { by: "grade", agg: "sum" } });
    expect(r.rows[0].error).toBeTruthy();
  });
  it("groups blank keys under (blank)", () => {
    const r = evaluateTableGroup(args([{ grade: "", load: 1 }], "count"));
    expect(r.rows[0].key).toBe("(blank)");
  });
});
