import { describe, expect, it } from "vitest";
import { contourBands, contourLines } from "./contour";
import type { ContourResult } from "./plot";

/** z = x over the unit square, 2×2 samples; band boundaries at 0, 0.5, 1. */
function gridZx(): ContourResult {
  return {
    x: [0, 1],
    y: [0, 1],
    z: [
      [0, 1],
      [0, 1],
    ],
    zMin: 0,
    zMax: 1,
    levels: [0, 0.5, 1],
    zUnit: null,
    zLabel: "z",
  };
}

describe("contourBands", () => {
  it("clips each cell into the band, with a vertex on the level crossing", () => {
    const bands = contourBands(gridZx());
    expect(bands).toHaveLength(2); // [0, 0.5] and [0.5, 1]

    const lower = bands[0];
    expect(lower.lo).toBe(0);
    expect(lower.hi).toBe(0.5);
    expect(lower.polygons).toHaveLength(1);

    const verts = lower.polygons[0];
    // The band's right boundary is the iso-line x = 0.5; the whole piece is left of it.
    expect(verts.some(([x]) => Math.abs(x - 0.5) < 1e-9)).toBe(true);
    expect(verts.every(([x]) => x <= 0.5 + 1e-9)).toBe(true);
  });

  it("shades bands from low to high", () => {
    const bands = contourBands(gridZx());
    expect(bands[0].t).toBeLessThan(bands[1].t);
  });

  it("skips cells touching a NaN sample", () => {
    const g = gridZx();
    g.z[0][0] = NaN;
    const bands = contourBands(g);
    expect(bands.every((b) => b.polygons.length === 0)).toBe(true);
  });
});

describe("contourLines", () => {
  it("traces a straight iso-line at the level crossing", () => {
    const sets = contourLines(gridZx());
    const mid = sets.find((s) => s.level === 0.5);
    expect(mid).toBeDefined();
    expect(mid!.segments).toHaveLength(1);

    const [a, b] = mid!.segments[0];
    expect(a[0]).toBeCloseTo(0.5); // vertical line at x = 0.5
    expect(b[0]).toBeCloseTo(0.5);
    expect(Math.abs(a[1] - b[1])).toBeCloseTo(1); // spans the cell in y
  });

  it("skips cells touching a NaN sample", () => {
    const g = gridZx();
    g.z[1][1] = NaN;
    const sets = contourLines(g);
    expect(sets.every((s) => s.segments.length === 0)).toBe(true);
  });
});
