/**
 * Table view transform — sort & filter (Functional Brief §6.3, Phase 2).
 *
 * Pure, deterministic, display-only: given the evaluated grid this returns the
 * ORIGINAL row indices to render after filtering then sorting. The underlying
 * `rows` are NEVER reordered, so the engine (`./table`), A1 references, named
 * ranges, exports, and every lookup (`./lookups`) keep resolving by data-order
 * index — sort/filter is a presentation concern only.
 *
 * Inputs are primitives (no `lib/worksheet` import → no calc↔content cycle).
 */
import { comparableValue, condMatches } from "./conditional";
import type { TableCellResult } from "./table";
import type { CondOp } from "./types";

export interface TableViewColumn {
  key: string;
}

export interface TableViewSort {
  key: string;
  dir: "asc" | "desc";
}

export interface TableViewFilter {
  key: string;
  op: CondOp;
  value: number | string;
}

export interface TableViewArgs {
  /** Row-major raw cell sources (the data-order grid). */
  rows: string[][];
  columns: TableViewColumn[];
  /** Evaluated grid in DATA order (`cells[r][c]`); optional before first calc. */
  cells?: TableCellResult[][];
  sort?: TableViewSort;
  filter?: TableViewFilter;
}

/** Resolve a column key to its index, or -1 when absent / deleted. */
function columnIndex(columns: TableViewColumn[], key: string): number {
  return columns.findIndex((col) => col.key === key);
}

/**
 * The value used for sort/filter comparison at `(r, c)`: the evaluated cell value
 * (unit-aware) when present, else the raw source string. Errored cells report
 * their error via `errored` so the filter can keep them visible.
 */
function cellComparand(
  args: TableViewArgs,
  r: number,
  c: number,
): { value: unknown; errored: boolean } {
  const cell = args.cells?.[r]?.[c];
  if (cell?.error) return { value: undefined, errored: true };
  if (cell && cell.kind !== "empty") return { value: cell.value, errored: false };
  return { value: args.rows[r]?.[c] ?? "", errored: false };
}

/**
 * Original row indices to display, after **filter then stable-sort**.
 *
 * - No sort & no filter, or a key that no longer maps to a column → identity order.
 * - Filter keeps a row when its key cell errored (a checker sees `#error`, never a
 *   silently dropped row); otherwise applies `condMatches`.
 * - Sort is stable; non-orderable cells (NaN / strings in a numeric column) and
 *   errored cells sink to the end preserving original order; pure-string columns
 *   fall back to `localeCompare`.
 */
export function tableViewOrder(args: TableViewArgs): number[] {
  const n = args.rows.length;
  let order = Array.from({ length: n }, (_, r) => r);

  // ---- filter ----
  if (args.filter) {
    const c = columnIndex(args.columns, args.filter.key);
    if (c !== -1) {
      const { op, value } = args.filter;
      order = order.filter((r) => {
        const { value: v, errored } = cellComparand(args, r, c);
        return errored || condMatches(v, op, value);
      });
    }
  }

  // ---- sort (stable; ties + non-orderable rows keep original order) ----
  if (args.sort) {
    const c = columnIndex(args.columns, args.sort.key);
    if (c !== -1) {
      const dir = args.sort.dir === "desc" ? -1 : 1;
      // `decorated` is in filtered order; `Array.prototype.sort` is stable, so a
      // `0` result keeps ties (and the non-orderable tail) in their original order.
      const decorated = order.map((r) => {
        const { value: v, errored } = cellComparand(args, r, c);
        return { r, v, num: errored ? NaN : comparableValue(v) };
      });
      decorated.sort((a, b) => {
        const aNum = Number.isFinite(a.num);
        const bNum = Number.isFinite(b.num);
        if (aNum && bNum) return a.num === b.num ? 0 : (a.num - b.num) * dir;
        if (aNum !== bNum) return aNum ? -1 : 1; // orderable values before non-orderable
        return String(a.v ?? "").localeCompare(String(b.v ?? "")) * dir;
      });
      order = decorated.map((d) => d.r);
    }
  }

  return order;
}
