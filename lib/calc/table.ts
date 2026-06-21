/**
 * Table / spreadsheet evaluator (Functional Brief §6.3).
 *
 * A worksheet table is a self-contained mini-spreadsheet: each cell holds a raw
 * source — a literal (`120`, `12 kN`, `M16`) or an `=formula` — and the grid
 * resolves A1 references (`A3`, `B2:B5`), named ranges, and **worksheet names**
 * defined by other regions (passed in as `externalScope`). This module is pure and
 * deterministic (client = worker = Node): it reuses the engine's own value model,
 * unit conversion, formatter, conditional formatting, and typed errors — never a
 * parallel system — and never throws into the UI (every cell is wrapped, a bad
 * cell errors locally and the grid still renders).
 *
 * Spreadsheet semantics intentionally differ from the worksheet in one place:
 * cells may reference each other in ANY direction (only a true cycle fails),
 * whereas worksheet regions must be defined earlier in reading order.
 *
 * The engine core (`graph.ts`, `recalc.ts`) is untouched: tables read worksheet
 * names from `externalScope`, and their named outputs fold back into the worksheet
 * via {@link serializeForScope} (the provider turns each export into a synthetic
 * definition the unmodified engine evaluates).
 */
import { math } from "./math";
import type { MathNode, Unit } from "./math";
import { collectDeps } from "./parse";
import { toDisplayUnit, SI_SYSTEM, isUnit } from "./units";
import { formatValue } from "./format";
import { applyConditional } from "./conditional";
import { classifyThrow, makeError, cycle as cycleError, blockedBy } from "./errors";
import { LOOKUP_FUNCTIONS } from "./lookups";
import type { CalcError, CondRule, CondStyle, ResultFormat, UnitSystem } from "./types";

/* ------------------------------------------------------------------ *
 * Input contract (structurally satisfied by lib/worksheet's TableRegion,
 * so the engine stays decoupled from the content tree).
 * ------------------------------------------------------------------ */

export interface TableColumnSpec {
  key: string;
  label?: string;
  /** Per-column unit. Attaches to bare numeric literals; display target for results. */
  unit?: string;
  format?: ResultFormat;
  conditional?: CondRule[];
}

/**
 * Per-cell formatting the engine consumes. Only `format` affects the computed
 * display string (it overrides the column number format); the content tree's
 * cell style carries extra render-only fields (align/bold/fill/border) the
 * engine ignores, so a `TableRegion` is structurally a valid `TableSpec`.
 */
export interface TableCellFormat {
  format?: ResultFormat;
}

export interface TableSpec {
  /** Named range for the whole grid; exported to the worksheet scope. */
  name?: string;
  columns: TableColumnSpec[];
  /** Row-major raw cell sources. `rows[r][c]` aligns to `columns[c]`. */
  rows: string[][];
  /** Named A1 sub-ranges, e.g. `{ anchor_db: "A2:C5" }`. */
  ranges?: Record<string, string>;
  /** Per-cell formatting overlay, keyed `"r,c"` (0-based data coords). */
  cellStyles?: Record<string, TableCellFormat>;
}

export type TableCellKind = "literal" | "formula" | "empty";

export interface TableCellResult {
  /** Raw evaluated value (number, Unit, string, bool); `undefined` on error/empty. */
  value: unknown;
  /** Display string — magnitude only in a unit column (the unit lives in the header). */
  formatted: string;
  style?: CondStyle;
  error?: CalcError;
  kind: TableCellKind;
}

export interface TableResult {
  /** `cells[r][c]` mirrors `table.rows` (DATA order — never sorted/filtered). */
  cells: TableCellResult[][];
  /** Names this table exports to the worksheet (grid `name` + each `ranges` key). */
  exports: Record<string, unknown>;
  errorCount: number;
}

/* ------------------------------------------------------------------ *
 * A1 addressing (header = row 1; first data row = row 2)
 * ------------------------------------------------------------------ */

/** Zero-based column index → spreadsheet letter (0→A, 25→Z, 26→AA). */
export function colToLetter(index: number): string {
  let c = index + 1;
  let s = "";
  while (c > 0) {
    c -= 1;
    s = String.fromCharCode(65 + (c % 26)) + s;
    c = Math.floor(c / 26);
  }
  return s;
}

/** Spreadsheet letter → zero-based column index (A→0, Z→25, AA→26). */
export function letterToCol(letters: string): number {
  let c = 0;
  for (const ch of letters) c = c * 26 + (ch.charCodeAt(0) - 64);
  return c - 1;
}

/** A1 string → zero-based `{ r, c }`, or null (malformed or the header row 1). */
export function parseA1(ref: string): { r: number; c: number } | null {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  const rowNum = parseInt(m[2], 10);
  if (rowNum < 2) return null; // row 1 is the header — not addressable as data
  return { r: rowNum - 2, c: letterToCol(m[1]) };
}

/** Zero-based `(r, c)` → its A1 address (data rows number from 2). */
export function cellAddress(r: number, c: number): string {
  return `${colToLetter(c)}${r + 2}`;
}

const A1_CELL = /^[A-Z]+\d+$/;
const A1_RANGE = /([A-Z]+\d+):([A-Z]+\d+)/g;

interface Rect {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

function parseA1Range(range: string): Rect | null {
  const [a, b] = range.split(":");
  const pa = a && parseA1(a);
  const pb = b && parseA1(b);
  if (!pa || !pb) return null;
  return {
    r0: Math.min(pa.r, pb.r),
    c0: Math.min(pa.c, pb.c),
    r1: Math.max(pa.r, pb.r),
    c1: Math.max(pa.c, pb.c),
  };
}

/* ------------------------------------------------------------------ *
 * Literal & display helpers
 * ------------------------------------------------------------------ */

const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** A column's real unit, or undefined for unitless columns (blank / "—"). */
function realUnit(unit: string | undefined): string | undefined {
  if (!unit) return undefined;
  const t = unit.trim();
  if (t === "" || t === "—" || t === "-" || t === "–") return undefined;
  return t;
}

/** Resolve a literal cell source to a value, attaching the column unit to bare numbers. */
function resolveLiteral(
  raw: string,
  col: TableColumnSpec | undefined,
): { value: unknown; error?: CalcError } {
  const text = raw.trim();
  const unit = realUnit(col?.unit);
  if (NUMERIC.test(text)) {
    const n = Number(text);
    if (unit) {
      try {
        return { value: math.unit(`${n} ${unit}`) };
      } catch {
        return {
          value: n,
          error: makeError(
            "parse",
            `"${col?.unit}" isn't a unit Quanta recognizes.`,
            "Use a unit like mm, kN, or MPa for this column.",
          ),
        };
      }
    }
    return { value: n };
  }
  if (text === "true" || text === "false") return { value: text === "true" };
  // An inline-unit literal typed directly into a cell, e.g. "12 kN".
  if (/[a-zA-Z]/.test(text) && /\d/.test(text)) {
    try {
      return { value: math.unit(text) };
    } catch {
      /* not a unit — fall through to plain text */
    }
  }
  return { value: text };
}

/**
 * Format a value for a cell: magnitude only when the column carries a unit.
 * `format` defaults to the column number format; a per-cell override (already
 * merged over the column format by the caller) takes its place when present.
 */
function displayCell(
  value: unknown,
  col: TableColumnSpec | undefined,
  system: UnitSystem,
  format: ResultFormat | undefined = col?.format,
): { formatted: string; displayValue: unknown } {
  const unit = realUnit(col?.unit);
  const displayValue = toDisplayUnit(value, unit, system);
  if (unit && isUnit(displayValue)) {
    const u = displayValue as Unit;
    return { formatted: formatValue(u.toNumber(u.formatUnits()), format), displayValue };
  }
  return { formatted: formatValue(displayValue, format), displayValue };
}

/* ------------------------------------------------------------------ *
 * Cell parsing
 * ------------------------------------------------------------------ */

interface ParsedCell {
  kind: TableCellKind;
  /** Literal value (resolved upfront) or formula result placeholder. */
  literal?: { value: unknown; error?: CalcError };
  node?: MathNode;
  parseError?: CalcError;
  /** placeholder symbol → original A1 range, for `=mean(B2:B5)` style refs. */
  placeholders?: Map<string, string>;
  deps?: string[];
}

function parseCell(raw: string, col: TableColumnSpec | undefined): ParsedCell {
  const text = raw.trim();
  if (text.length === 0) return { kind: "empty" };
  if (text.startsWith("=")) {
    const placeholders = new Map<string, string>();
    let i = 0;
    const rewritten = text.slice(1).replace(A1_RANGE, (whole) => {
      const ph = `QRNG${i++}Z`;
      placeholders.set(ph, whole);
      return ph;
    });
    try {
      const node = math.parse(rewritten);
      return { kind: "formula", node, placeholders, deps: collectDeps(node) };
    } catch (error) {
      return { kind: "formula", placeholders, parseError: classifyThrow(error) };
    }
  }
  return { kind: "literal", literal: resolveLiteral(text, col) };
}

/* ------------------------------------------------------------------ *
 * Evaluation
 * ------------------------------------------------------------------ */

export function evaluateTable(
  table: TableSpec,
  externalScope: Record<string, unknown> = {},
  system: UnitSystem = SI_SYSTEM,
): TableResult {
  const nCols = Math.max(table.columns.length, ...table.rows.map((r) => r.length), 0);
  const nRows = table.rows.length;
  const col = (c: number): TableColumnSpec | undefined => table.columns[c];
  const rawAt = (r: number, c: number): string => table.rows[r]?.[c] ?? "";
  const idx = (r: number, c: number): number => r * nCols + c;
  const inGrid = (r: number, c: number): boolean => r >= 0 && r < nRows && c >= 0 && c < nCols;

  // 1) Parse every cell.
  const parsed: ParsedCell[][] = [];
  for (let r = 0; r < nRows; r += 1) {
    const row: ParsedCell[] = [];
    for (let c = 0; c < nCols; c += 1) row.push(parseCell(rawAt(r, c), col(c)));
    parsed.push(row);
  }

  // Resolved raw values, keyed by linear index (literals available immediately).
  const values = new Map<number, unknown>();
  for (let r = 0; r < nRows; r += 1) {
    for (let c = 0; c < nCols; c += 1) {
      const p = parsed[r][c];
      if (p.kind === "literal" && !p.literal?.error) values.set(idx(r, c), p.literal!.value);
    }
  }

  // Range resolution (used both for dependency edges and for the eval scope).
  const rangeValue = (range: string): unknown => {
    const rect = parseA1Range(range);
    if (!rect) return undefined;
    const out: unknown[][] = [];
    for (let r = rect.r0; r <= rect.r1; r += 1) {
      const line: unknown[] = [];
      for (let c = rect.c0; c <= rect.c1; c += 1) line.push(values.get(idx(r, c)));
      out.push(line);
    }
    if (out.length === 1) return out[0];
    if (out.every((line) => line.length === 1)) return out.map((line) => line[0]);
    return out;
  };
  const gridValue = (): unknown[][] => {
    const out: unknown[][] = [];
    for (let r = 0; r < nRows; r += 1) {
      const line: unknown[] = [];
      for (let c = 0; c < nCols; c += 1) line.push(values.get(idx(r, c)));
      out.push(line);
    }
    return out;
  };

  // 2) Build dependency edges among FORMULA cells.
  const formulaIdx: number[] = [];
  const edges = new Map<number, Set<number>>();
  const rangeEdges = (range: string, into: Set<number>) => {
    const rect = parseA1Range(range);
    if (!rect) return;
    for (let r = rect.r0; r <= rect.r1; r += 1)
      for (let c = rect.c0; c <= rect.c1; c += 1) if (inGrid(r, c)) into.add(idx(r, c));
  };
  for (let r = 0; r < nRows; r += 1) {
    for (let c = 0; c < nCols; c += 1) {
      const p = parsed[r][c];
      if (p.kind !== "formula") continue;
      const self = idx(r, c);
      formulaIdx.push(self);
      const set = new Set<number>();
      for (const dep of p.deps ?? []) {
        if (p.placeholders?.has(dep)) rangeEdges(p.placeholders.get(dep)!, set);
        else if (A1_CELL.test(dep)) {
          const a1 = parseA1(dep);
          if (a1 && inGrid(a1.r, a1.c)) set.add(idx(a1.r, a1.c));
        } else if (table.ranges && dep in table.ranges) rangeEdges(table.ranges[dep], set);
        else if (table.name && dep === table.name)
          for (let i = 0; i < nRows * nCols; i += 1) set.add(i);
      }
      edges.set(self, set);
    }
  }

  // 3) Kahn topological order over formula cells (stable, index tie-break); the
  //    rest are cyclic. A cell that (transitively) references itself never readies.
  const { order, cyclic } = topoOrder(formulaIdx, edges);

  // 4) Evaluate formula cells in order, maintaining the resolved value map.
  const errored = new Set<number>();
  const cellError = new Map<number, CalcError>();
  for (const self of order) {
    const r = Math.floor(self / nCols);
    const c = self % nCols;
    const p = parsed[r][c];
    if (p.parseError) {
      errored.add(self);
      cellError.set(self, p.parseError);
      continue;
    }
    // Blocked when a dependency cell errored.
    const blocker = [...(edges.get(self) ?? [])].find((d) => errored.has(d));
    if (blocker !== undefined) {
      errored.add(self);
      cellError.set(self, blockedBy(cellAddress(Math.floor(blocker / nCols), blocker % nCols)));
      continue;
    }
    try {
      const scope: Record<string, unknown> = { ...externalScope, ...LOOKUP_FUNCTIONS };
      for (const dep of p.deps ?? []) {
        if (p.placeholders?.has(dep)) scope[dep] = rangeValue(p.placeholders.get(dep)!);
        else if (A1_CELL.test(dep)) {
          const a1 = parseA1(dep);
          if (a1 && inGrid(a1.r, a1.c)) scope[dep] = values.get(idx(a1.r, a1.c));
        } else if (table.ranges && dep in table.ranges) scope[dep] = rangeValue(table.ranges[dep]);
        else if (table.name && dep === table.name) scope[dep] = gridValue();
      }
      values.set(self, p.node!.evaluate(scope));
    } catch (error) {
      errored.add(self);
      cellError.set(self, classifyThrow(error));
    }
  }
  for (const self of cyclic) {
    errored.add(self);
    cellError.set(self, cycleErrorFor(self, edges, nCols));
  }

  // 5) Build per-cell results (display + conditional), reusing the engine helpers.
  const cells: TableCellResult[][] = [];
  let errorCount = 0;
  for (let r = 0; r < nRows; r += 1) {
    const row: TableCellResult[] = [];
    for (let c = 0; c < nCols; c += 1) {
      const self = idx(r, c);
      const p = parsed[r][c];
      const err = cellError.get(self) ?? p.literal?.error;
      if (p.kind === "empty") {
        row.push({ value: undefined, formatted: "", kind: "empty" });
        continue;
      }
      if (err) {
        errorCount += 1;
        row.push({ value: undefined, formatted: "", error: err, kind: p.kind });
        continue;
      }
      const value = values.get(self);
      try {
        // A per-cell number format overrides the column format for this cell only.
        const cellFmt = table.cellStyles?.[`${r},${c}`]?.format;
        const fmt = cellFmt ? { ...col(c)?.format, ...cellFmt } : col(c)?.format;
        const { formatted, displayValue } = displayCell(value, col(c), system, fmt);
        row.push({
          value,
          formatted,
          style: applyConditional(displayValue, col(c)?.conditional),
          kind: p.kind,
        });
      } catch (error) {
        errorCount += 1;
        row.push({ value: undefined, formatted: "", error: classifyThrow(error), kind: p.kind });
      }
    }
    cells.push(row);
  }

  // 6) Exports — the grid under `name`, plus each named range, for the fold-back.
  const exports: Record<string, unknown> = {};
  if (table.name) exports[table.name] = gridValue();
  for (const [key, range] of Object.entries(table.ranges ?? {})) {
    const v = rangeValue(range);
    if (v !== undefined) exports[key] = v;
  }

  return { cells, exports, errorCount };
}

/* ------------------------------------------------------------------ *
 * Local topological sort + cycle naming (graph.ts is intentionally untouched)
 * ------------------------------------------------------------------ */

function topoOrder(
  indices: number[],
  edges: Map<number, Set<number>>,
): { order: number[]; cyclic: Set<number> } {
  const inSet = new Set(indices);
  const remaining = new Map<number, Set<number>>();
  const dependents = new Map<number, number[]>();
  for (const i of indices) {
    const deps = new Set([...(edges.get(i) ?? [])].filter((d) => inSet.has(d)));
    remaining.set(i, deps);
    for (const d of deps) {
      const arr = dependents.get(d) ?? [];
      arr.push(i);
      dependents.set(d, arr);
    }
  }
  const ready = indices.filter((i) => remaining.get(i)!.size === 0).sort((a, b) => a - b);
  const order: number[] = [];
  const emitted = new Set<number>();
  while (ready.length > 0) {
    const i = ready.shift()!;
    order.push(i);
    emitted.add(i);
    for (const dep of dependents.get(i) ?? []) {
      const rem = remaining.get(dep)!;
      rem.delete(i);
      if (rem.size === 0) insertSorted(ready, dep);
    }
  }
  const cyclic = new Set(indices.filter((i) => !emitted.has(i)));
  return { order, cyclic };
}

function insertSorted(arr: number[], value: number): void {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  arr.splice(lo, 0, value);
}

/** Name a cell's cycle in A1 addresses (best-effort: the cell + one cyclic neighbour). */
function cycleErrorFor(self: number, edges: Map<number, Set<number>>, nCols: number): CalcError {
  const addr = (i: number) => cellAddress(Math.floor(i / nCols), i % nCols);
  const neighbour = [...(edges.get(self) ?? [])].find((d) => d !== self);
  const names = neighbour === undefined ? [addr(self)] : [addr(self), addr(neighbour)];
  return cycleError(names);
}

/* ------------------------------------------------------------------ *
 * Fold-back serialization (table outputs → worksheet scope)
 * ------------------------------------------------------------------ */

/**
 * Serialize an exported value to an engine source string the provider can splice
 * in as a synthetic definition (`name := <source>`), so the unmodified engine
 * resolves it for downstream regions. Lossless for the cases that matter:
 * `String(number)` round-trips IEEE doubles exactly, a Unit becomes
 * `"<magnitude> <unit>"`, arrays/matrices nest. Returns null for anything that
 * can't be represented (the provider then skips that export).
 */
export function serializeForScope(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (isUnit(value)) {
    const u = value as Unit;
    const unit = u.formatUnits();
    const mag = u.toNumber(unit);
    if (!Number.isFinite(mag)) return null;
    return unit ? `${mag} ${unit}` : String(mag);
  }
  if (math.isMatrix(value) || Array.isArray(value)) {
    const arr = math.isMatrix(value) ? (value as { toArray(): unknown[] }).toArray() : (value as unknown[]);
    const parts: string[] = [];
    for (const el of arr) {
      const s = serializeForScope(el);
      if (s === null) return null;
      parts.push(s);
    }
    return `[${parts.join(", ")}]`;
  }
  return null;
}
