import { describe, expect, it } from "vitest";
import { Vlookup, Hlookup, Index, Match, Interp } from "./lookups";
import { CalcEngineError } from "./errors";
import { math } from "./math";
import type { Unit } from "./math";

/** Assert a call throws a typed CalcError of a given kind. */
function expectKind(fn: () => unknown, kind: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(CalcEngineError);
    expect((error as CalcEngineError).calcError.kind).toBe(kind);
    return;
  }
  throw new Error("expected the call to throw");
}

describe("Vlookup", () => {
  const bolts = [
    [12, 84.3, 800],
    [16, 157, 800],
    [20, 245, 800],
  ];

  it("returns the 1-based column of an exact match", () => {
    expect(Vlookup(16, bolts, 2)).toBe(157);
    expect(Vlookup(16, bolts, 3)).toBe(800);
  });

  it("matches strings in the key column", () => {
    const schedule = [
      ["A1", 12],
      ["A2", 18.5],
      ["A3", 41],
    ];
    expect(Vlookup("A3", schedule, 2)).toBe(41);
  });

  it("nearest-below with match=1 on ascending keys", () => {
    expect(Vlookup(18, bolts, 2, 1)).toBe(157); // 16 is the largest key ≤ 18
  });

  it("matches keys dimensionally regardless of unit prefix", () => {
    const table = [
      [math.unit("12 kN"), 100],
      [math.unit("18 kN"), 200],
    ];
    expect(Vlookup(math.unit("12000 N"), table, 2)).toBe(100);
  });

  it("errors no-solution on an exact miss", () => {
    expectKind(() => Vlookup(17, bolts, 2), "no-solution");
  });

  it("errors domain when the return column is out of range", () => {
    expectKind(() => Vlookup(16, bolts, 9), "domain");
  });

  it("errors unit-mismatch when the needle and keys disagree dimensionally", () => {
    const table = [[math.unit("12 kN"), 1]];
    expectKind(() => Vlookup(12, table, 2), "unit-mismatch");
  });
});

describe("Hlookup", () => {
  const grid = [
    ["d", 12, 16, 20],
    ["A", 84.3, 157, 245],
  ];
  it("searches the first row and returns a 1-based row", () => {
    expect(Hlookup(16, grid, 2)).toBe(157);
  });
  it("errors domain when the return row is out of range", () => {
    expectKind(() => Hlookup(16, grid, 9), "domain");
  });
});

describe("Index", () => {
  const table = [
    [1, math.unit("84.3 mm^2")],
    [2, math.unit("157 mm^2")],
  ];
  it("returns the 1-based element, preserving units", () => {
    expect(Index(table, 2, 1)).toBe(2);
    expect((Index(table, 2, 2) as Unit).toNumber("mm^2")).toBeCloseTo(157, 6);
  });
  it("errors domain when out of range", () => {
    expectKind(() => Index(table, 5, 1), "domain");
  });
});

describe("Match", () => {
  const vec = [10, 20, 30];
  it("returns the 1-based position of an exact match", () => {
    expect(Match(20, vec)).toBe(2);
  });
  it("finds the largest ≤ with match=1 and smallest ≥ with match=-1", () => {
    expect(Match(25, vec, 1)).toBe(2);
    expect(Match(25, vec, -1)).toBe(3);
  });
  it("errors no-solution on an exact miss", () => {
    expectKind(() => Match(99, vec), "no-solution");
  });
});

describe("Interp", () => {
  const vx = [10, 15, 20, 30];
  const vy = [0.74, 0.86, 0.95, 1.08];

  it("interpolates linearly inside the range", () => {
    expect(Interp(vx, vy, 17)).toBeCloseTo(0.86 + (2 / 5) * (0.95 - 0.86), 6);
  });

  it("returns a node value exactly", () => {
    expect(Interp(vx, vy, 20)).toBeCloseTo(0.95, 6);
  });

  it("propagates the y unit and accepts a unit-compatible x", () => {
    const ux = [math.unit("10 m"), math.unit("20 m")];
    const uy = [math.unit("0.74 kPa"), math.unit("0.86 kPa")];
    const out = Interp(ux, uy, math.unit("15 m"));
    expect(math.isUnit(out)).toBe(true);
    expect((out as Unit).toNumber("kPa")).toBeCloseTo(0.8, 6);
  });

  it("errors domain outside the data range", () => {
    expectKind(() => Interp(vx, vy, 5), "domain");
  });

  it("errors domain when vx is not strictly increasing", () => {
    expectKind(() => Interp([10, 10, 20], [1, 2, 3], 12), "domain");
  });
});
