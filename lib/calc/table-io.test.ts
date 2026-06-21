import { describe, expect, it } from "vitest";
import {
  parseDelimited,
  inferColumn,
  isUnitExpr,
  buildTableImport,
  tableToMatrix,
  toDelimited,
} from "./table-io";

describe("parseDelimited", () => {
  it("parses CSV with a trailing newline into a rectangular grid", () => {
    const grid = parseDelimited("a,b,c\n1,2,3\n");
    expect(grid).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("detects tab-delimited (Excel/Sheets paste)", () => {
    const grid = parseDelimited("Member\tForce\nC1\t120");
    expect(grid).toEqual([
      ["Member", "Force"],
      ["C1", "120"],
    ]);
  });

  it("detects semicolon-delimited when semicolons dominate", () => {
    const grid = parseDelimited("a;b;c\n1;2;3");
    expect(grid[0]).toEqual(["a", "b", "c"]);
  });

  it("honors quoted fields with embedded commas, quotes, and newlines", () => {
    const grid = parseDelimited('name,note\n"Smith, J","said ""hi""\nthen left"');
    expect(grid).toEqual([
      ["name", "note"],
      ["Smith, J", 'said "hi"\nthen left'],
    ]);
  });

  it("handles CRLF line endings and pads short rows", () => {
    const grid = parseDelimited("a,b,c\r\n1,2\r\n");
    expect(grid).toEqual([
      ["a", "b", "c"],
      ["1", "2", ""],
    ]);
  });

  it("trims unquoted fields but preserves quoted content", () => {
    const grid = parseDelimited('  a , b \n" c ",d');
    expect(grid).toEqual([
      ["a", "b"],
      [" c ", "d"],
    ]);
  });

  it("drops fully-blank rows", () => {
    const grid = parseDelimited("a,b\n\n1,2\n");
    expect(grid).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("returns [] for empty input", () => {
    expect(parseDelimited("   ")).toEqual([]);
  });
});

describe("isUnitExpr", () => {
  it("accepts real units, including compound ones", () => {
    expect(isUnitExpr("kN")).toBe(true);
    expect(isUnitExpr("mm")).toBe(true);
    expect(isUnitExpr("MPa")).toBe(true);
    expect(isUnitExpr("kN/m")).toBe(true);
  });

  it("rejects English header words and junk", () => {
    expect(isUnitExpr("Note")).toBe(false);
    expect(isUnitExpr("Member")).toBe(false);
    expect(isUnitExpr("")).toBe(false);
  });
});

describe("inferColumn", () => {
  it("reads a unit from a (parenthesized) header annotation", () => {
    expect(inferColumn("Axial force (kN)", ["120", "95.5"])).toEqual({
      label: "Axial force",
      unit: "kN",
    });
  });

  it("reads a unit from a [bracketed] header annotation", () => {
    expect(inferColumn("Length [mm]", ["3000"])).toEqual({ label: "Length", unit: "mm" });
  });

  it("reads a unit from a comma-suffixed header", () => {
    expect(inferColumn("Stress, MPa", ["250"])).toEqual({ label: "Stress", unit: "MPa" });
  });

  it("leaves a free-text column unit-less", () => {
    expect(inferColumn("Member", ["C1", "C2"])).toEqual({ label: "Member" });
    expect(inferColumn("Note", ["ok", "check"])).toEqual({ label: "Note" });
  });

  it("sniffs a consistent trailing unit from the values", () => {
    expect(inferColumn("Force", ["12 kN", "15 kN", "8 kN"])).toEqual({
      label: "Force",
      unit: "kN",
    });
  });

  it("does not infer a unit when value units are inconsistent", () => {
    expect(inferColumn("X", ["12 kN", "15 mm"])).toEqual({ label: "X" });
  });
});

describe("buildTableImport", () => {
  it("populates columns with inferred units and strips units onto the column", () => {
    const grid = parseDelimited(
      ["Member, Axial force (kN), Length [mm], Note", "C1, 120, 3000, ok", "C2, 95.5, 2750, check"].join(
        "\n",
      ),
    );
    const { columns, rows } = buildTableImport(grid, { hasHeader: true });
    expect(columns).toEqual([
      { label: "Member" },
      { label: "Axial force", unit: "kN" },
      { label: "Length", unit: "mm" },
      { label: "Note" },
    ]);
    expect(rows).toEqual([
      ["C1", "120", "3000", "ok"],
      ["C2", "95.5", "2750", "check"],
    ]);
  });

  it("synthesizes column labels when there is no header row", () => {
    const grid = parseDelimited("12 kN, 30\n8 kN, 45");
    const { columns, rows } = buildTableImport(grid, { hasHeader: false });
    expect(columns[0]).toEqual({ label: "Column A", unit: "kN" });
    expect(columns[1]).toEqual({ label: "Column B" });
    expect(rows).toEqual([
      ["12", "30"],
      ["8", "45"],
    ]);
  });

  it("returns empty columns/rows for an empty grid", () => {
    expect(buildTableImport([], { hasHeader: true })).toEqual({ columns: [], rows: [] });
  });
});

describe("tableToMatrix + toDelimited (export)", () => {
  const columns = [
    { label: "Member" },
    { label: "Axial force", unit: "kN" },
  ];
  const rows = [
    ["C1", "120"],
    ["C2", "95.5"],
  ];

  it("emits a header with [unit] annotations then raw values when no result is given", () => {
    const matrix = tableToMatrix(columns, rows);
    expect(matrix).toEqual([
      ["Member", "Axial force [kN]"],
      ["C1", "120"],
      ["C2", "95.5"],
    ]);
  });

  it("quotes CSV fields that contain commas, quotes, or newlines", () => {
    const tricky = tableToMatrix([{ label: "note" }], [['a,b "c"\nd']]);
    const csv = toDelimited(tricky, ",");
    expect(csv).toBe('note\r\n"a,b ""c""\nd"');
  });

  it("uses tabs for TSV without quoting plain values", () => {
    expect(toDelimited(tableToMatrix(columns, rows), "\t")).toBe(
      "Member\tAxial force [kN]\r\nC1\t120\r\nC2\t95.5",
    );
  });
});

describe("round-trip parity (copy → import is idempotent)", () => {
  const columns = [
    { label: "Member" },
    { label: "Axial force", unit: "kN" },
    { label: "Length", unit: "mm" },
  ];
  const rows = [
    ["C1", "120", "3000"],
    ["C2", "95.5", "2750"],
  ];

  it("TSV survives tableToMatrix → toDelimited → parseDelimited → buildTableImport", () => {
    const tsv = toDelimited(tableToMatrix(columns, rows), "\t");
    const back = buildTableImport(parseDelimited(tsv), { hasHeader: true });
    expect(back.columns).toEqual(columns);
    expect(back.rows).toEqual(rows);
  });

  it("CSV survives the same round-trip", () => {
    const csv = toDelimited(tableToMatrix(columns, rows), ",");
    const back = buildTableImport(parseDelimited(csv), { hasHeader: true });
    expect(back.columns).toEqual(columns);
    expect(back.rows).toEqual(rows);
  });
});
