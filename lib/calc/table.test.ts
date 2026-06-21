import { describe, expect, it } from "vitest";
import {
  evaluateTable,
  serializeForScope,
  colToLetter,
  letterToCol,
  parseA1,
  cellAddress,
  type TableSpec,
} from "./table";
import { math } from "./math";
import type { Unit } from "./math";
import type { CondRule } from "./types";

const FAIL: CondRule = { op: ">", value: 1, style: { label: "FAIL", color: "error" } };

/** The mockup's anchor schedule: Mark / Length[mm] / Force[kN] / Capacity[kN] / Utilization. */
function anchorSchedule(): TableSpec {
  return {
    name: "anchor_schedule",
    columns: [
      { key: "mark", label: "Mark" },
      { key: "len", label: "Length", unit: "mm" },
      { key: "force", label: "Force", unit: "kN" },
      { key: "cap", label: "Capacity", unit: "kN" },
      { key: "ur", label: "Utilization", unit: "—", format: { decimals: 2, trailingZeros: true }, conditional: [FAIL] },
    ],
    rows: [
      ["A1", "120", "12.0", "52.8", "=C2/D2"],
      ["A2", "120", "18.5", "52.8", "=C3/D3"],
      ["A3", "90", "41.0", "29.7", "=C4/D4"],
      ["A4", "150", "22.4", "52.8", "=C5/D5"],
    ],
  };
}

describe("A1 addressing", () => {
  it("round-trips column letters, including multi-letter", () => {
    expect(colToLetter(0)).toBe("A");
    expect(colToLetter(25)).toBe("Z");
    expect(colToLetter(26)).toBe("AA");
    expect(colToLetter(27)).toBe("AB");
    for (const i of [0, 1, 25, 26, 51, 700]) expect(letterToCol(colToLetter(i))).toBe(i);
  });

  it("numbers data rows from 2 and rejects the header row", () => {
    expect(cellAddress(0, 0)).toBe("A2");
    expect(cellAddress(2, 4)).toBe("E4");
    expect(parseA1("E4")).toEqual({ r: 2, c: 4 });
    expect(parseA1("A1")).toBeNull(); // header row is not addressable
    expect(parseA1("nope")).toBeNull();
  });
});

describe("evaluateTable — literals & per-column units", () => {
  it("attaches the column unit to a bare numeric literal and shows the magnitude", () => {
    const res = evaluateTable(anchorSchedule());
    const len = res.cells[0][1];
    expect(len.kind).toBe("literal");
    expect(math.isUnit(len.value)).toBe(true);
    expect((len.value as Unit).toNumber("mm")).toBe(120);
    expect(len.formatted).toBe("120"); // unit lives in the header, not the cell
  });

  it("keeps text columns as text and reports an unknown unit without crashing", () => {
    const res = evaluateTable({
      columns: [
        { key: "m", label: "Mark" },
        { key: "x", label: "X", unit: "bogusunit" },
      ],
      rows: [["A1", "5"]],
    });
    expect(res.cells[0][0].value).toBe("A1");
    expect(res.cells[0][1].error?.kind).toBe("parse");
    expect(res.errorCount).toBe(1);
  });
});

describe("evaluateTable — formulas, refs & conditional formatting", () => {
  it("evaluates =formulas with A1 references and dimensionless ratios", () => {
    const res = evaluateTable(anchorSchedule());
    expect(res.cells[0][4].kind).toBe("formula");
    expect(res.cells[0][4].formatted).toBe("0.23");
    expect(res.cells[2][4].formatted).toBe("1.38");
  });

  it("applies per-column conditional formatting on the display magnitude", () => {
    const res = evaluateTable(anchorSchedule());
    expect(res.cells[0][4].style).toBeUndefined(); // 0.23 passes
    expect(res.cells[2][4].style?.label).toBe("FAIL"); // 1.38 > 1
  });

  it("resolves references in any direction (forward & backward), only cycles fail", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }],
      rows: [["=A3+1"], ["10"]], // A2 references A3 (below it)
    });
    expect(res.cells[0][0].value).toBe(11);
    expect(res.cells[1][0].value).toBe(10);
  });

  it("flags a circular reference and leaves other cells intact", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }, { key: "b", label: "B" }],
      rows: [["=B2", "=A2", "ok"]],
    });
    expect(res.cells[0][0].error?.kind).toBe("cycle");
    expect(res.cells[0][1].error?.kind).toBe("cycle");
  });

  it("isolates a malformed cell — the rest of the grid still evaluates", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }, { key: "b", label: "B" }],
      rows: [["=*", "=1+1"]],
    });
    expect(res.cells[0][0].error).toBeDefined();
    expect(res.cells[0][1].value).toBe(2);
    expect(res.errorCount).toBe(1);
  });
});

describe("evaluateTable — ranges, lookups & named refs", () => {
  it("reads an A1 range with a reducer like mean()", () => {
    const res = evaluateTable({
      columns: [{ key: "f", label: "Force", unit: "kN" }, { key: "avg", label: "Mean", unit: "kN" }],
      rows: [["10", "=mean(A2:A4)"], ["20", ""], ["30", ""]],
    });
    expect((res.cells[0][1].value as Unit).toNumber("kN")).toBeCloseTo(20, 6);
    expect(res.cells[0][1].formatted).toBe("20");
  });

  it("resolves a named range used by Vlookup", () => {
    const res = evaluateTable({
      columns: [
        { key: "mark", label: "Mark" },
        { key: "val", label: "Value" },
        { key: "out", label: "Out" },
      ],
      ranges: { db: "A2:B3" },
      rows: [
        ["A1", "10", '=Vlookup("A2", db, 2)'],
        ["A2", "20", ""],
      ],
    });
    expect(res.cells[0][2].value).toBe(20);
  });
});

describe("evaluateTable — worksheet scope bridge", () => {
  it("reads a worksheet name passed in externalScope", () => {
    const res = evaluateTable(
      {
        columns: [{ key: "a", label: "A" }, { key: "r", label: "R" }],
        rows: [["10", "=A2 * mult"]],
      },
      { mult: 3 },
    );
    expect(res.cells[0][1].value).toBe(30);
  });

  it("a table-internal A1 ref shadows a same-named worksheet value", () => {
    const res = evaluateTable(
      {
        columns: [{ key: "a", label: "A" }, { key: "r", label: "R" }],
        rows: [["10", "=A2"]],
      },
      { A2: 999 },
    );
    expect(res.cells[0][1].value).toBe(10); // the cell, not the worksheet name
  });
});

describe("evaluateTable — exports", () => {
  it("exports the grid under the table name", () => {
    const res = evaluateTable(anchorSchedule());
    const grid = res.exports.anchor_schedule as unknown[][];
    expect(grid[0][0]).toBe("A1");
    expect((grid[0][1] as Unit).toNumber("mm")).toBe(120);
  });
});

describe("evaluateTable — array formulas & spill", () => {
  it("spills a 1-D vector DOWN as a column, marking the anchor and the spilled cells", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }],
      rows: [["=[1, 2, 3]"], [""], [""]],
    });
    expect(res.cells[0][0].kind).toBe("formula");
    expect(res.cells[0][0].value).toBe(1);
    expect(res.cells[0][0].spill).toEqual({ rows: 3, cols: 1 });
    expect(res.cells[1][0].kind).toBe("spill");
    expect(res.cells[1][0].value).toBe(2);
    expect(res.cells[1][0].spilledFrom).toBe("A2");
    expect(res.cells[2][0].value).toBe(3);
    expect(res.errorCount).toBe(0);
  });

  it("lets a downstream cell read a NON-anchor spill cell (needs the geometry-fixpoint)", () => {
    // The reader A2 sits earlier in index order than its anchor B3, so the static topo
    // order evaluates it first; only after the spill edges are rewritten does it resolve.
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }, { key: "b", label: "B" }],
      rows: [
        ["=B4 * 10", ""],
        ["", "=[1, 2]"],
        ["", ""],
      ],
    });
    expect(res.cells[1][1].value).toBe(1); // B3 anchor
    expect(res.cells[2][1].value).toBe(2); // B4 spilled
    expect(res.cells[0][0].value).toBe(20); // A2 reads B4 (=2) × 10
    expect(res.errorCount).toBe(0);
  });

  it("lets a downstream RANGE read the spilled range", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }, { key: "s", label: "Sum" }],
      rows: [
        ["=[10, 20, 30]", "=sum(A2:A4)"],
        ["", ""],
        ["", ""],
      ],
    });
    expect(res.cells[0][1].value).toBe(60);
  });

  it("spills a 2-D matrix across rows × columns", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }, { key: "b", label: "B" }],
      rows: [
        ["=[[1, 2], [3, 4]]", ""],
        ["", ""],
      ],
    });
    expect(res.cells[0][0].value).toBe(1);
    expect(res.cells[0][0].spill).toEqual({ rows: 2, cols: 2 });
    expect(res.cells[0][1].kind).toBe("spill");
    expect(res.cells[0][1].value).toBe(2);
    expect(res.cells[1][0].value).toBe(3);
    expect(res.cells[1][1].value).toBe(4);
  });

  it("blocks the whole spill (#SPILL!) when a target cell is not empty — no partial write", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }],
      rows: [["=[1, 2, 3]"], ["99"], [""]],
    });
    expect(res.cells[0][0].error?.kind).toBe("spill");
    expect(res.cells[1][0].value).toBe(99); // the literal is untouched
    expect(res.cells[2][0].kind).toBe("empty"); // nothing spilled (no partial)
    expect(res.errorCount).toBe(1);
  });

  it("blocks a spill that runs past the edge of the grid (#SPILL!)", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }],
      rows: [["=[1, 2, 3]"], [""]], // only two rows for a three-tall result
    });
    expect(res.cells[0][0].error?.kind).toBe("spill");
    expect(res.cells[1][0].kind).toBe("empty");
  });

  it("resolves two anchors competing for a cell deterministically (topo-earlier wins)", () => {
    // B2 (index 1) spills down into B3; A3 (index 2) would spill right into B3 too.
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }, { key: "b", label: "B" }],
      rows: [
        ["", "=[1, 2]"],
        ["=[[9, 9]]", ""],
      ],
    });
    expect(res.cells[1][1].kind).toBe("spill"); // B3 won by B2
    expect(res.cells[1][1].spilledFrom).toBe("B2");
    expect(res.cells[1][1].value).toBe(2);
    expect(res.cells[1][0].error?.kind).toBe("spill"); // A3 collides, #SPILL!
  });

  it("does NOT spill a Unit-valued formula (isUnit-first predicate)", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "F", unit: "kN" }, { key: "b", label: "2F", unit: "kN" }],
      rows: [["12", "=A2 * 2"]],
    });
    expect(res.cells[0][1].kind).toBe("formula");
    expect(res.cells[0][1].spill).toBeUndefined();
    expect((res.cells[0][1].value as Unit).toNumber("kN")).toBe(24);
  });

  it("spills an array of Units, showing each magnitude in the unit column", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "F", unit: "kN" }],
      rows: [["=[12 kN, 18 kN]"], [""]],
    });
    expect(res.cells[0][0].formatted).toBe("12");
    expect(res.cells[1][0].kind).toBe("spill");
    expect(res.cells[1][0].formatted).toBe("18");
    expect((res.cells[1][0].value as Unit).toNumber("kN")).toBe(18);
  });

  it("treats an empty array as a non-spilling scalar (no churn, no stray spill cells)", () => {
    const res = evaluateTable({
      columns: [{ key: "a", label: "A" }],
      rows: [["=[]"], [""]],
    });
    expect(res.cells[0][0].spill).toBeUndefined();
    expect(res.cells[1][0].kind).toBe("empty");
  });

  it("re-evaluates a shrinking spill cleanly — vacated cells are empty, not stale", () => {
    const grid = (): TableSpec => ({
      columns: [{ key: "a", label: "A" }],
      rows: [["=ones(n)"], [""], [""], [""], [""]],
    });
    const five = evaluateTable(grid(), { n: 5 });
    expect(five.cells[4][0].kind).toBe("spill"); // A6 filled

    const three = evaluateTable(grid(), { n: 3 });
    expect(three.cells[2][0].kind).toBe("spill"); // A4 filled
    expect(three.cells[3][0].kind).toBe("empty"); // A5 vacated
    expect(three.cells[4][0].kind).toBe("empty"); // A6 vacated
  });

  it("terminates and stays correct for a spill→spill→read chain", () => {
    let res!: ReturnType<typeof evaluateTable>;
    expect(() => {
      res = evaluateTable({
        columns: [{ key: "a", label: "A" }, { key: "b", label: "B" }, { key: "c", label: "C" }],
        rows: [
          ["=[1, 2]", "", ""],
          ["", "=A3 * [1, 1]", ""],
          ["", "", "=B4 + 1"],
        ],
      });
    }).not.toThrow();
    expect(res.cells[2][2].value).toBe(3); // C4 = B4(2) + 1
  });
});

describe("serializeForScope (fold-back)", () => {
  it("serializes numbers, units, and arrays round-trip", () => {
    expect(serializeForScope(5)).toBe("5");
    expect(serializeForScope(12.5)).toBe("12.5");
    expect(serializeForScope(math.unit("12 kN"))).toBe("12 kN");
    expect(serializeForScope([1, 2, 3])).toBe("[1, 2, 3]");
    // The serialized form re-parses to the same value.
    expect((math.evaluate(serializeForScope(math.unit("12 kN"))!) as Unit).toNumber("kN")).toBe(12);
  });

  it("returns null for non-finite numbers", () => {
    expect(serializeForScope(Infinity)).toBeNull();
    expect(serializeForScope(NaN)).toBeNull();
  });
});
