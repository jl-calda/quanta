import { describe, expect, it } from "vitest";
import { buildChartFromRange } from "./chart-from-range";
import type { TableColumn, TableRegion } from "./content";

/** A valid mathjs identifier (the synthetic `key := …` def must parse). */
const KEY = /^[A-Za-z_]\w*$/;

function table(columns: TableColumn[], nRows = 4): TableRegion {
  return {
    id: "t1",
    type: "table",
    indent: 0,
    columns,
    rows: Array.from({ length: nRows }, () => columns.map(() => "")),
  };
}

describe("buildChartFromRange", () => {
  it("two-column range: leftmost column is x, the rest are y traces", () => {
    const t = table(
      [
        { key: "a", label: "Time", unit: "s" },
        { key: "b", label: "Force", unit: "kN" },
      ],
      5,
    );
    const built = buildChartFromRange(t, { r0: 0, c0: 0, r1: 4, c1: 1 });
    expect(built).not.toBeNull();
    const { ranges, plot } = built!;

    const keys = Object.keys(ranges);
    expect(keys).toHaveLength(2);
    for (const k of keys) expect(k).toMatch(KEY);
    // A1 sub-ranges number data rows from 2 (A2:A6 = the five data rows).
    expect(Object.values(ranges).sort()).toEqual(["A2:A6", "B2:B6"]);

    // X binds to the first column; its axis takes that column's label + unit.
    expect(ranges[plot.xData!]).toBe("A2:A6");
    expect(plot.x.label).toBe("Time");
    expect(plot.x.unit).toBe("s");

    // One trace, bound to the second column, as a line-marker on an xy chart.
    expect(plot.kind).toBe("xy");
    expect(plot.traces).toHaveLength(1);
    expect(ranges[plot.traces[0].expr]).toBe("B2:B6");
    expect(plot.traces[0].label).toBe("Force");
    expect(plot.traces[0].style).toBe("line-marker");
    expect(plot.legend).toBe(false); // single trace ⇒ no legend
  });

  it("three-column range: two y traces and a legend", () => {
    const built = buildChartFromRange(
      table(
        [
          { key: "a", label: "x", unit: "m" },
          { key: "b", label: "y1", unit: "kN" },
          { key: "c", label: "y2", unit: "kN" },
        ],
        3,
      ),
      { r0: 0, c0: 0, r1: 2, c1: 2 },
    )!;
    expect(built.plot.traces).toHaveLength(2);
    expect(built.plot.legend).toBe(true);
    expect(built.plot.y.unit).toBe("kN"); // all y columns agree
  });

  it("omits y.unit when y columns disagree; sets it when they agree", () => {
    const mixed = buildChartFromRange(
      table(
        [
          { key: "a", label: "x" },
          { key: "b", label: "f", unit: "kN" },
          { key: "c", label: "g", unit: "mm" },
        ],
        3,
      ),
      { r0: 0, c0: 0, r1: 2, c1: 2 },
    )!;
    expect(mixed.plot.y.unit).toBeUndefined();

    const same = buildChartFromRange(
      table(
        [
          { key: "a", label: "x" },
          { key: "b", label: "f", unit: "kN" },
          { key: "c", label: "g", unit: "kN" },
        ],
        3,
      ),
      { r0: 0, c0: 0, r1: 2, c1: 2 },
    )!;
    expect(same.plot.y.unit).toBe("kN");
  });

  it("treats a dash/blank unit as no unit", () => {
    const built = buildChartFromRange(
      table(
        [
          { key: "a", label: "x" },
          { key: "b", label: "f", unit: "kN" },
          { key: "c", label: "g", unit: "—" },
        ],
        3,
      ),
      { r0: 0, c0: 0, r1: 2, c1: 2 },
    )!;
    // "kN" and "—"(=none) disagree ⇒ no pinned y unit.
    expect(built.plot.y.unit).toBeUndefined();
  });

  it("single column charts against its row index", () => {
    const built = buildChartFromRange(
      table([{ key: "a", label: "Load", unit: "kN" }], 6),
      { r0: 0, c0: 0, r1: 5, c1: 0 },
    )!;
    expect(built.plot.xData).toBe("1:6"); // literal range, one x per row
    expect(built.plot.x.label).toBe("Index");
    expect(built.plot.x.unit).toBeUndefined();
    expect(Object.keys(built.ranges)).toHaveLength(1); // only the y column
    expect(Object.values(built.ranges)).toEqual(["A2:A7"]);
    expect(built.plot.traces).toHaveLength(1);
    expect(built.plot.y.unit).toBe("kN");
    expect(built.plot.legend).toBe(false);
  });

  it("returns null for a single cell (nothing to chart)", () => {
    const t = table(
      [
        { key: "a", label: "x" },
        { key: "b", label: "y" },
      ],
      3,
    );
    expect(buildChartFromRange(t, { r0: 1, c0: 1, r1: 1, c1: 1 })).toBeNull();
  });

  it("generates valid, unique identifier keys from any label", () => {
    const built = buildChartFromRange(
      table(
        [
          { key: "a", label: "" }, // empty → column letter
          { key: "b", label: "2024 load" }, // leading digit
          { key: "c", label: "σ stress" }, // non-ASCII
          { key: "d", label: "Force" }, // duplicate label …
          { key: "e", label: "Force" }, // … must still be unique
        ],
        3,
      ),
      { r0: 0, c0: 0, r1: 2, c1: 4 },
    )!;
    const keys = Object.keys(built.ranges);
    expect(keys).toHaveLength(5);
    for (const k of keys) expect(k).toMatch(KEY);
    expect(new Set(keys).size).toBe(5); // unique despite duplicate labels
  });

  it("normalizes a reversed (bottom-right → top-left) drag", () => {
    const t = table(
      [
        { key: "a", label: "x", unit: "s" },
        { key: "b", label: "y", unit: "m" },
      ],
      5,
    );
    const fwd = buildChartFromRange(t, { r0: 0, c0: 0, r1: 4, c1: 1 })!;
    const rev = buildChartFromRange(t, { r0: 4, c0: 1, r1: 0, c1: 0 })!;
    expect(Object.values(rev.ranges).sort()).toEqual(Object.values(fwd.ranges).sort());
    // X is still the leftmost column regardless of drag direction.
    expect(rev.ranges[rev.plot.xData!]).toBe("A2:A6");
    expect(rev.plot.x.label).toBe("x");
    expect(rev.plot.traces).toHaveLength(1);
    expect(rev.ranges[rev.plot.traces[0].expr]).toBe("B2:B6");
  });

  it("does not mutate the source table", () => {
    const t = table(
      [
        { key: "a", label: "x" },
        { key: "b", label: "y" },
      ],
      3,
    );
    buildChartFromRange(t, { r0: 0, c0: 0, r1: 2, c1: 1 });
    expect(t.ranges).toBeUndefined();
  });
});
