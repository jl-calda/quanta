/**
 * Table lookups (Functional Brief §6.3 · Matrix "Lookup & data").
 *
 * The five Mathcad-style lookups Quanta's tables support, implemented pure and
 * engine-native so they run identically on client, worker, and Node. They operate
 * on the same value model the rest of the engine uses — plain numbers, mathjs
 * `Unit`s, and matrices/arrays — and are unit-aware: a search value is compared to
 * the keys dimensionally (`12 kN` matches a key stored as `12000 N`), and a
 * returned cell keeps its unit. Every failure raises a typed {@link CalcError}
 * (via {@link CalcEngineError}) so `classifyThrow` surfaces an app-voice message;
 * they never throw a raw library string.
 *
 * These are injected as functions into each table cell's evaluation scope (the
 * same mechanism mathjs already uses to resolve callees), so the shared
 * `lib/calc/math.ts` instance is never mutated.
 */
import { math } from "./math";
import type { Unit } from "./math";
import type { MathType } from "mathjs";
import { isUnit } from "./units";
import { CalcEngineError, makeError } from "./errors";

type MatchMode = 0 | 1 | -1;

/* ------------------------------------------------------------------ *
 * Value helpers (numbers, Units, arrays/matrices)
 * ------------------------------------------------------------------ */

/** A mathjs Matrix or a JS array → a plain JS array (1-D or 2-D). */
function toArray(value: unknown): unknown[] {
  if (math.isMatrix(value)) return (value as { toArray(): unknown[] }).toArray();
  if (Array.isArray(value)) return value as unknown[];
  return [value];
}

/** Normalize any range value to a 2-D array of rows. A 1-D input becomes a column. */
function asRows(value: unknown): unknown[][] {
  const arr = toArray(value);
  if (arr.length === 0) return [];
  if (Array.isArray(arr[0])) return arr as unknown[][];
  return (arr as unknown[]).map((v) => [v]);
}

/** Normalize any range value to a 1-D vector (accepts a vector or an n×1 / 1×n matrix). */
function asVector(value: unknown, fn: string): unknown[] {
  const arr = toArray(value);
  if (arr.length > 0 && Array.isArray(arr[0])) {
    const rows = arr as unknown[][];
    if (rows.every((r) => r.length === 1)) return rows.map((r) => r[0]);
    if (rows.length === 1) return rows[0];
    throw new CalcEngineError(
      makeError(
        "domain",
        `${fn} needs a single row or column of values.`,
        "Pass a vector range like A2:A9, not a rectangle.",
      ),
    );
  }
  return arr;
}

/** Plain magnitude of a number/Unit (in the value's own unit). */
function magnitude(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (isUnit(value)) {
    const u = value as Unit;
    return u.toNumber(u.formatUnits());
  }
  const n = Number(value);
  return n;
}

/**
 * Compare `a` against `b` dimensionally → -1 | 0 | 1. Two units must share a
 * base dimension (else a unit-mismatch); a unit vs a bare number is a mismatch.
 * Strings compare lexicographically (only meaningful for equality).
 */
function compare(a: unknown, b: unknown, fn: string): number {
  if (typeof a === "string" || typeof b === "string") {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  }
  const au = isUnit(a);
  const bu = isUnit(b);
  if (au && bu) {
    const ua = a as Unit;
    const ub = b as Unit;
    if (!ua.equalBase(ub)) {
      throw new CalcEngineError(
        makeError(
          "unit-mismatch",
          `${fn}: the search value and the keys have different units.`,
          "Use a value with the same dimension as the column it searches.",
        ),
      );
    }
    const x = ua.toNumber(ub.formatUnits());
    const y = ub.toNumber(ub.formatUnits());
    return x < y ? -1 : x > y ? 1 : 0;
  }
  if (au !== bu) {
    throw new CalcEngineError(
      makeError(
        "unit-mismatch",
        `${fn}: one side has a unit and the other doesn't.`,
        "Give the search value and the keys the same units.",
      ),
    );
  }
  const x = magnitude(a);
  const y = magnitude(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** 1-based column/row index → a typed domain error when out of range. */
function requireIndex(i: unknown, length: number, fn: string, what: string): number {
  const idx = Math.trunc(Number(i));
  if (!Number.isFinite(idx) || idx < 1 || idx > length) {
    throw new CalcEngineError(
      makeError(
        "domain",
        `${fn}: ${what} ${String(i)} is outside the table.`,
        `Use a ${what} between 1 and ${length}.`,
      ),
    );
  }
  return idx - 1;
}

/**
 * Find the row whose key (in `keys`) matches `value` under `mode`:
 * 0 = exact, 1 = largest key ≤ value (keys ascending), -1 = smallest key ≥ value.
 * Returns the zero-based position, or throws `no-solution` when nothing matches.
 */
function findMatch(value: unknown, keys: unknown[], mode: MatchMode, fn: string): number {
  if (mode === 0) {
    for (let i = 0; i < keys.length; i += 1) {
      if (compare(value, keys[i], fn) === 0) return i;
    }
    throw new CalcEngineError(
      makeError(
        "no-solution",
        `${fn}: no row matches ${describe(value)}.`,
        "Check the search value, or use the nearest-match mode.",
      ),
    );
  }
  if (mode === 1) {
    // Largest key ≤ value.
    let best = -1;
    for (let i = 0; i < keys.length; i += 1) {
      if (compare(keys[i], value, fn) <= 0) best = i;
    }
    if (best === -1) {
      throw new CalcEngineError(
        makeError(
          "no-solution",
          `${fn}: ${describe(value)} is below every key.`,
          "The first column should be sorted ascending for nearest-match.",
        ),
      );
    }
    return best;
  }
  // mode === -1: smallest key ≥ value.
  for (let i = 0; i < keys.length; i += 1) {
    if (compare(keys[i], value, fn) >= 0) return i;
  }
  throw new CalcEngineError(
    makeError(
      "no-solution",
      `${fn}: ${describe(value)} is above every key.`,
      "Provide a key greater than or equal to the search value.",
    ),
  );
}

function describe(value: unknown): string {
  if (isUnit(value)) return (value as Unit).toString();
  return String(value);
}

/* ------------------------------------------------------------------ *
 * The five lookups
 * ------------------------------------------------------------------ */

/** Vertical lookup: find `value` in column 1 of `table`, return column `col` (1-based) of that row. */
export function Vlookup(value: unknown, table: unknown, col: unknown, match: unknown = 0): unknown {
  const rows = asRows(table);
  if (rows.length === 0) {
    throw new CalcEngineError(makeError("domain", "Vlookup: the table is empty.", "Point it at a range with rows."));
  }
  const keys = rows.map((r) => r[0]);
  const row = findMatch(value, keys, normalizeMatch(match), "Vlookup");
  const c = requireIndex(col, rows[row].length, "Vlookup", "column");
  return rows[row][c];
}

/** Horizontal lookup: find `value` in row 1 of `table`, return row `row` (1-based) of that column. */
export function Hlookup(value: unknown, table: unknown, row: unknown, match: unknown = 0): unknown {
  const rows = asRows(table);
  if (rows.length === 0 || rows[0].length === 0) {
    throw new CalcEngineError(makeError("domain", "Hlookup: the table is empty.", "Point it at a range with columns."));
  }
  const keys = rows[0];
  const col = findMatch(value, keys, normalizeMatch(match), "Hlookup");
  const r = requireIndex(row, rows.length, "Hlookup", "row");
  return rows[r][col];
}

/** Element at 1-based (`i`, `j`) of a table; `Index(vector, i)` for a 1-D range. Keeps units. */
export function Index(table: unknown, i: unknown, j: unknown = 1): unknown {
  const rows = asRows(table);
  const r = requireIndex(i, rows.length, "Index", "row");
  const c = requireIndex(j, rows[r].length, "Index", "column");
  return rows[r][c];
}

/** 1-based position of `value` in `vector` under `match` (0 exact, 1 ≤, -1 ≥). */
export function Match(value: unknown, vector: unknown, match: unknown = 0): number {
  const vec = asVector(vector, "Match");
  return findMatch(value, vec, normalizeMatch(match), "Match") + 1;
}

/**
 * Linear interpolation of `x` against paired vectors `vx` (strictly increasing) and
 * `vy`. The result carries `vy`'s unit; `x` must be unit-compatible with `vx`.
 * Outside the `vx` range is a domain error (use a future `linterp` to extrapolate).
 */
export function Interp(vx: unknown, vy: unknown, x: unknown): unknown {
  const xs = asVector(vx, "Interp");
  const ys = asVector(vy, "Interp");
  if (xs.length < 2 || ys.length < 2) {
    throw new CalcEngineError(makeError("domain", "Interp needs at least two points.", "Provide longer vx and vy vectors."));
  }
  if (xs.length !== ys.length) {
    throw new CalcEngineError(makeError("domain", "Interp: vx and vy have different lengths.", "Give one y for each x."));
  }
  for (let i = 1; i < xs.length; i += 1) {
    if (compare(xs[i], xs[i - 1], "Interp") <= 0) {
      throw new CalcEngineError(makeError("domain", "Interp: vx must be strictly increasing.", "Sort the x-data ascending with no repeats."));
    }
  }
  if (compare(x, xs[0], "Interp") < 0 || compare(x, xs[xs.length - 1], "Interp") > 0) {
    throw new CalcEngineError(
      makeError("domain", `Interp: ${describe(x)} is outside the data range.`, "Interpolate at a point within vx, or extend the data."),
    );
  }
  for (let i = 1; i < xs.length; i += 1) {
    if (compare(x, xs[i], "Interp") <= 0) {
      const frac = ratio(x, xs[i - 1], xs[i]);
      // y0 + (y1 - y0) * frac, keeping y's units via mathjs arithmetic.
      const y0 = ys[i - 1] as MathType;
      const y1 = ys[i] as MathType;
      return math.add(y0, math.multiply(math.subtract(y1, y0), frac));
    }
  }
  return ys[ys.length - 1];
}

/** Dimensionless ratio (x − a) / (b − a), comparing magnitudes in a common unit. */
function ratio(x: unknown, a: unknown, b: unknown): number {
  const base = isUnit(a) ? (a as Unit).formatUnits() : null;
  const num = base ? unitNumber(x, base) - unitNumber(a, base) : magnitude(x) - magnitude(a);
  const den = base ? unitNumber(b, base) - unitNumber(a, base) : magnitude(b) - magnitude(a);
  return num / den;
}

function unitNumber(value: unknown, unit: string): number {
  if (isUnit(value)) return (value as Unit).toNumber(unit);
  return magnitude(value);
}

function normalizeMatch(match: unknown): MatchMode {
  const m = Math.trunc(Number(match));
  return m === 1 ? 1 : m === -1 ? -1 : 0;
}

/** Names → functions, ready to spread into a cell's evaluation scope. */
export const LOOKUP_FUNCTIONS: Record<string, (...args: unknown[]) => unknown> = {
  Vlookup,
  Hlookup,
  Index,
  Match: Match as (...args: unknown[]) => unknown,
  Interp,
  // Lowercase aliases for the catalog's spellings.
  interp: Interp,
};
