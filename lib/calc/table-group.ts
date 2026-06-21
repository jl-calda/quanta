/**
 * Table grouping summary — group rows by a column and summarise another
 * (Functional Brief §6.3, Phase 2).
 *
 * Pure, deterministic, display-only: it reads the table's evaluated grid (in DATA
 * order, never sorted/filtered) and returns one summary row per group. It never
 * reorders `rows`, never touches the dependency graph / recalc core, and renders
 * from the live grid (no second data copy).
 *
 * Aggregates are unit-aware: `sum`/`mean`/`min`/`max` carry units and reject
 * incompatible-unit mixing within a group (surfaced as a per-row `error`, never
 * thrown); `count` is dimensionless. Empty groups, non-numeric cells, missing
 * columns, and errored cells degrade gracefully — the summary still renders.
 *
 * Inputs are primitives (`TableGroupColumn` is structurally satisfied by
 * content's `TableColumn`) so there is no calc↔content cycle.
 */
import { math } from "./math";
import { formatValue } from "./format";
import type { TableCellResult } from "./table";
import type { ResultFormat } from "./types";

export type GroupAgg = "count" | "sum" | "mean" | "min" | "max";

export interface TableGroupColumn {
  key: string;
  label?: string;
  unit?: string;
  format?: ResultFormat;
}

export interface TableGroupSpec {
  /** Column key to group rows by. */
  by: string;
  /** Column key to aggregate (ignored for `count`). */
  value?: string;
  agg: GroupAgg;
}

export interface TableGroupArgs {
  /** Row-major raw cell sources (the data-order grid). */
  rows: string[][];
  columns: TableGroupColumn[];
  /** Evaluated grid in DATA order (`cells[r][c]`); optional before first calc. */
  cells?: TableCellResult[][];
  group: TableGroupSpec;
}

export interface TableGroupRow {
  /** The group's label (the by-column display value; blanks read as "(blank)"). */
  key: string;
  /** Rows in the group. */
  count: number;
  /** Aggregated value (unit-aware), or the count; `undefined` when nothing to show. */
  value: unknown;
  formatted: string;
  /** App-voice reason the aggregate couldn't be computed (e.g. unit mismatch). */
  error?: string;
}

export interface TableGroupResult {
  rows: TableGroupRow[];
  agg: GroupAgg;
  byLabel: string;
  valueLabel?: string;
}

const BLANK = "(blank)";

function columnIndex(columns: TableGroupColumn[], key: string): number {
  return columns.findIndex((col) => col.key === key);
}

function columnLabel(columns: TableGroupColumn[], key: string): string {
  const col = columns.find((c) => c.key === key);
  return col?.label?.trim() || key;
}

/** The group key shown for row `r`: the evaluated by-cell display, else its source. */
function keyAt(args: TableGroupArgs, r: number, byIdx: number): string {
  const cell = args.cells?.[r]?.[byIdx];
  let text: string;
  if (cell && cell.kind !== "empty" && !cell.error) {
    text = (cell.formatted || String(cell.value ?? "")).trim();
  } else {
    const raw = args.rows[r]?.[byIdx] ?? "";
    text = raw.startsWith("=") ? "" : raw.trim();
  }
  return text === "" ? BLANK : text;
}

/** A numeric/unit value for aggregation at `(r, valueIdx)`, or `undefined` to skip. */
function valueAt(args: TableGroupArgs, r: number, valueIdx: number): unknown {
  const cell = args.cells?.[r]?.[valueIdx];
  if (cell && cell.kind !== "empty" && !cell.error) {
    const v = cell.value;
    if (typeof v === "number" && !Number.isFinite(v)) return undefined;
    return v ?? undefined;
  }
  const raw = args.rows[r]?.[valueIdx] ?? "";
  if (raw === "" || raw.startsWith("=")) return undefined;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : undefined; // non-numeric literal → skip
}

/** Unit-aware sum; throws (mathjs) when units are incompatible. */
function sum(values: unknown[]): unknown {
  let acc: unknown = values[0];
  for (let i = 1; i < values.length; i++) acc = math.add(acc as never, values[i] as never);
  return acc;
}

/** Unit-aware min/max; `math.smaller`/`larger` convert compatible units and throw otherwise. */
function extreme(values: unknown[], agg: "min" | "max"): unknown {
  let best = values[0];
  for (let i = 1; i < values.length; i++) {
    const take = agg === "min" ? math.smaller(values[i] as never, best as never) : math.larger(values[i] as never, best as never);
    if (take === true) best = values[i];
  }
  return best;
}

export function evaluateTableGroup(args: TableGroupArgs): TableGroupResult {
  const { group } = args;
  const byLabel = columnLabel(args.columns, group.by);
  const valueLabel = group.value ? columnLabel(args.columns, group.value) : undefined;
  const byIdx = columnIndex(args.columns, group.by);
  const valueIdx = group.value ? columnIndex(args.columns, group.value) : -1;
  const valueCol = valueIdx === -1 ? undefined : args.columns[valueIdx];
  const fmt = (v: unknown) => formatValue(v, valueCol?.format);

  // Missing/deleted group column → nothing to summarise (graceful, no crash).
  if (byIdx === -1) return { rows: [], agg: group.agg, byLabel, valueLabel };

  // Bucket data-order rows by key, first-seen order.
  const order: string[] = [];
  const buckets = new Map<string, number[]>();
  for (let r = 0; r < args.rows.length; r++) {
    const key = keyAt(args, r, byIdx);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
      order.push(key);
    }
    bucket.push(r);
  }

  const rows: TableGroupRow[] = order.map((key) => {
    const idxs = buckets.get(key) ?? [];
    const count = idxs.length;

    if (group.agg === "count") {
      return { key, count, value: count, formatted: String(count) };
    }

    if (valueIdx === -1) {
      return { key, count, value: undefined, formatted: "—", error: "Pick a column to summarise." };
    }

    const values = idxs.map((r) => valueAt(args, r, valueIdx)).filter((v) => v !== undefined);
    if (values.length === 0) return { key, count, value: undefined, formatted: "—" };

    try {
      if (group.agg === "sum") {
        const s = sum(values);
        return { key, count, value: s, formatted: fmt(s) };
      }
      if (group.agg === "mean") {
        const m = math.divide(sum(values) as never, values.length);
        return { key, count, value: m, formatted: fmt(m) };
      }
      const pick = extreme(values, group.agg);
      return { key, count, value: pick, formatted: fmt(pick) };
    } catch {
      return { key, count, value: undefined, formatted: "—", error: "Units don't match in this group." };
    }
  });

  return { rows, agg: group.agg, byLabel, valueLabel };
}
