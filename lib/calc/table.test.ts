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

describe("evaluateTable — per-cell number format overlay", () => {
  it("a per-cell format overrides the column format for that cell only", () => {
    const table = anchorSchedule();
    // Column "ur" formats to 2 decimals; pin A3's utilization to 4 decimals.
    table.cellStyles = { "2,4": { format: { decimals: 4, trailingZeros: true } } };
    const res = evaluateTable(table);
    expect(res.cells[2][4].formatted).toBe("1.3805"); // 41.0 / 29.7, 4 dp
    expect(res.cells[0][4].formatted).toBe("0.23"); // other rows keep the column's 2 dp
  });

  it("merges the cell format over the column format (inherits unspecified keys)", () => {
    const table: TableSpec = {
      columns: [{ key: "x", label: "X", format: { decimals: 1, trailingZeros: true } }],
      rows: [["3.14159"]],
      cellStyles: { "0,0": { format: { decimals: 3 } } },
    };
    const res = evaluateTable(table);
    // decimals overridden to 3; trailingZeros inherited from the column format.
    expect(res.cells[0][0].formatted).toBe("3.142");
  });

  it("leaves cells without an overlay entry untouched", () => {
    const table = anchorSchedule();
    table.cellStyles = { "0,4": { format: { decimals: 3, trailingZeros: true } } };
    const res = evaluateTable(table);
    expect(res.cells[0][4].formatted).toBe("0.227");
    expect(res.cells[1][4].formatted).toBe("0.35");
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
