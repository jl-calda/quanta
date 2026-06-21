import { describe, expect, it } from "vitest";
import { freezeStyle, freezeZIndex } from "./table-frozen";

const base = {
  frozenRows: 1,
  frozenCols: 1,
  colWidths: [100, 120, 140],
  rowHeight: 30,
  headerHeight: 32,
};

describe("freezeStyle — non-sticky cells", () => {
  it("returns {} for a body cell outside both frozen bands", () => {
    expect(freezeStyle({ ...base, row: 3, col: 2 })).toEqual({});
  });
});

describe("freezeStyle — columns", () => {
  it("pins the first column at left 0 (plus leftBase)", () => {
    expect(freezeStyle({ ...base, row: 3, col: 0 })).toMatchObject({ position: "sticky", left: 0 });
    expect(freezeStyle({ ...base, row: 3, col: 0, leftBase: 26 })).toMatchObject({ left: 26 });
  });
  it("accumulates left offsets across multiple frozen columns", () => {
    const a = { ...base, frozenCols: 2 };
    expect(freezeStyle({ ...a, row: 3, col: 0 })).toMatchObject({ left: 0 });
    expect(freezeStyle({ ...a, row: 3, col: 1 })).toMatchObject({ left: 100 });
  });
});

describe("freezeStyle — rows", () => {
  it("pins the header at top 0", () => {
    expect(freezeStyle({ ...base, row: 0, col: 2, isHeader: true })).toMatchObject({ position: "sticky", top: 0 });
  });
  it("pins frozen body rows below the header by a fixed row height", () => {
    const a = { ...base, frozenRows: 2 };
    expect(freezeStyle({ ...a, row: 0, col: 2 })).toMatchObject({ top: 32 }); // header height
    expect(freezeStyle({ ...a, row: 1, col: 2 })).toMatchObject({ top: 62 }); // + one row
  });
});

describe("freezeStyle — backgrounds are opaque", () => {
  it("gives header and body sticky cells a background so content doesn't bleed", () => {
    expect(freezeStyle({ ...base, row: 0, col: 2, isHeader: true }).background).toBeTruthy();
    expect(freezeStyle({ ...base, row: 0, col: 0 }).background).toBeTruthy();
  });
});

describe("freezeZIndex — layering", () => {
  it("orders corners above bands above normal cells", () => {
    const headerCorner = freezeZIndex(true, false, true);
    const bodyCorner = freezeZIndex(false, true, true);
    const headerBand = freezeZIndex(true, false, false);
    const rowBand = freezeZIndex(false, true, false);
    const colBand = freezeZIndex(false, false, true);
    expect(headerCorner).toBeGreaterThan(bodyCorner);
    expect(bodyCorner).toBeGreaterThan(headerBand);
    expect(headerBand).toBeGreaterThan(rowBand);
    expect(rowBand).toBeGreaterThan(colBand);
  });
});
