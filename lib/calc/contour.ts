/**
 * Iso-band & iso-line geometry for a sampled contour field (`z = f(x, y)`).
 *
 * PURE and deterministic (client = worker = Node), with no external deps: it turns
 * a {@link ContourResult} grid into filled bands + iso-lines the renderer draws as
 * SVG paths. Both algorithms run PER GRID CELL and emit geometry in DATA
 * coordinates — there is no global polygon stitching, which keeps them robust and
 * unit-testable (the renderer just projects data → screen).
 *
 *   • contourBands — filled bands via per-cell Sutherland–Hodgman clipping: clip
 *     each cell quad to `z >= lo` then `z <= hi`; the survivor is the band's piece
 *     in that cell. Boundaries are straight chords between edge crossings (the
 *     marching-squares linear approximation), so bands align with the iso-lines.
 *   • contourLines — iso-lines via per-cell marching squares (16-case edge table;
 *     the two saddle cases are resolved by the cell-centre average).
 *
 * Cells touching a NaN sample are skipped (a gap leaves a clean hole).
 */
import type { ContourResult } from "./plot";

export type Point = readonly [number, number];

/** A filled iso-band: the cell pieces where `lo ≤ z ≤ hi`, plus a shade position. */
export interface ContourBand {
  lo: number;
  hi: number;
  /** Band midpoint normalized to [0, 1] over [zMin, zMax] (drives the shade ramp). */
  t: number;
  /** Filled polygons (one per intersecting cell), each a ring of data-space points. */
  polygons: Point[][];
}

/** An iso-line at one z level: straight segments in data space, plus a shade position. */
export interface ContourLineSet {
  level: number;
  /** Level normalized to [0, 1] over [zMin, zMax]. */
  t: number;
  segments: [Point, Point][];
}

/* ------------------------------------------------------------------ *
 * Filled bands (per-cell Sutherland–Hodgman)
 * ------------------------------------------------------------------ */

interface V {
  x: number;
  y: number;
  z: number;
}

export function contourBands(grid: ContourResult): ContourBand[] {
  const { x, y, z, levels, zMin, zMax } = grid;
  const span = zMax - zMin || 1;
  const bands: ContourBand[] = [];

  for (let k = 0; k < levels.length - 1; k += 1) {
    const lo = levels[k];
    const hi = levels[k + 1];
    const polygons: Point[][] = [];

    for (let iy = 0; iy < y.length - 1; iy += 1) {
      for (let ix = 0; ix < x.length - 1; ix += 1) {
        const z0 = z[iy][ix];
        const z1 = z[iy][ix + 1];
        const z2 = z[iy + 1][ix + 1];
        const z3 = z[iy + 1][ix];
        if (!finite4(z0, z1, z2, z3)) continue;

        // Quick reject — cell entirely outside the band's z window.
        const cmin = Math.min(z0, z1, z2, z3);
        const cmax = Math.max(z0, z1, z2, z3);
        if (cmax < lo || cmin > hi) continue;

        // CCW quad: bottom-left, bottom-right, top-right, top-left.
        const quad: V[] = [
          { x: x[ix], y: y[iy], z: z0 },
          { x: x[ix + 1], y: y[iy], z: z1 },
          { x: x[ix + 1], y: y[iy + 1], z: z2 },
          { x: x[ix], y: y[iy + 1], z: z3 },
        ];
        const clipped = clip(clip(quad, true, lo), false, hi);
        if (clipped.length >= 3) polygons.push(clipped.map((v) => [v.x, v.y] as const));
      }
    }

    const t = clamp01(((lo + hi) / 2 - zMin) / span);
    bands.push({ lo, hi, t, polygons });
  }
  return bands;
}

/**
 * Sutherland–Hodgman clip of a z-carrying polygon against one iso-threshold.
 * `keepAbove` keeps vertices with `z ≥ level` (else `z ≤ level`); a crossing edge
 * gains a new vertex interpolated to exactly `z = level`.
 */
function clip(poly: V[], keepAbove: boolean, level: number): V[] {
  const n = poly.length;
  if (n === 0) return poly;
  const out: V[] = [];
  for (let i = 0; i < n; i += 1) {
    const cur = poly[i];
    const nxt = poly[(i + 1) % n];
    const curIn = keepAbove ? cur.z >= level : cur.z <= level;
    const nxtIn = keepAbove ? nxt.z >= level : nxt.z <= level;
    if (curIn) out.push(cur);
    if (curIn !== nxtIn) {
      const t = (level - cur.z) / (nxt.z - cur.z); // nxt.z !== cur.z when sides differ
      out.push({ x: cur.x + t * (nxt.x - cur.x), y: cur.y + t * (nxt.y - cur.y), z: level });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Iso-lines (per-cell marching squares)
 * ------------------------------------------------------------------ */

type Edge = 0 | 1 | 2 | 3; // 0 bottom · 1 right · 2 top · 3 left

/** Non-saddle marching-squares cases → the edge pair(s) to connect. */
const SEGMENTS: Record<number, [Edge, Edge][]> = {
  1: [[3, 0]],
  2: [[0, 1]],
  3: [[3, 1]],
  4: [[1, 2]],
  6: [[0, 2]],
  7: [[3, 2]],
  8: [[2, 3]],
  9: [[2, 0]],
  11: [[2, 1]],
  12: [[1, 3]],
  13: [[1, 0]],
  14: [[0, 3]],
};

export function contourLines(grid: ContourResult): ContourLineSet[] {
  const { x, y, z, levels, zMin, zMax } = grid;
  const span = zMax - zMin || 1;
  const out: ContourLineSet[] = [];

  for (const level of levels) {
    const segments: [Point, Point][] = [];
    for (let iy = 0; iy < y.length - 1; iy += 1) {
      for (let ix = 0; ix < x.length - 1; ix += 1) {
        const zbl = z[iy][ix];
        const zbr = z[iy][ix + 1];
        const ztr = z[iy + 1][ix + 1];
        const ztl = z[iy + 1][ix];
        if (!finite4(zbl, zbr, ztr, ztl)) continue;
        cellSegments(level, x[ix], x[ix + 1], y[iy], y[iy + 1], zbl, zbr, ztr, ztl, segments);
      }
    }
    out.push({ level, t: clamp01((level - zMin) / span), segments });
  }
  return out;
}

function cellSegments(
  level: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  zbl: number,
  zbr: number,
  ztr: number,
  ztl: number,
  out: [Point, Point][],
): void {
  const idx =
    (zbl >= level ? 1 : 0) | (zbr >= level ? 2 : 0) | (ztr >= level ? 4 : 0) | (ztl >= level ? 8 : 0);
  if (idx === 0 || idx === 15) return;

  const cross = (e: Edge): Point => {
    switch (e) {
      case 0:
        return [lerp(x0, x1, (level - zbl) / (zbr - zbl)), y0]; // bottom (bl→br)
      case 1:
        return [x1, lerp(y0, y1, (level - zbr) / (ztr - zbr))]; // right (br→tr)
      case 2:
        return [lerp(x1, x0, (level - ztr) / (ztl - ztr)), y1]; // top (tr→tl)
      default:
        return [x0, lerp(y1, y0, (level - ztl) / (zbl - ztl))]; // left (tl→bl)
    }
  };

  let pairs: [Edge, Edge][];
  if (idx === 5 || idx === 10) {
    // Saddle: the centre value decides which diagonal of crossings connects.
    const centerIn = (zbl + zbr + ztr + ztl) / 4 >= level;
    const isolateOut: [Edge, Edge][] = [[0, 1], [2, 3]]; // [bottom,right] + [top,left]
    const isolateIn: [Edge, Edge][] = [[3, 0], [1, 2]]; // [left,bottom] + [right,top]
    pairs = idx === 5 ? (centerIn ? isolateOut : isolateIn) : centerIn ? isolateIn : isolateOut;
  } else {
    pairs = SEGMENTS[idx];
  }
  for (const [e1, e2] of pairs) out.push([cross(e1), cross(e2)]);
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function finite4(a: number, b: number, c: number, d: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && Number.isFinite(d);
}
