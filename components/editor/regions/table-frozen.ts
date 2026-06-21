/**
 * Frozen-pane CSS offsets for the table grid (Functional Brief §6.3, Phase 2).
 *
 * Pure & deterministic (no JSX, vitest-testable): given the freeze config and the
 * known column widths / fixed row+header heights, returns the `position: sticky`
 * style for a header or body cell. Offsets are exact only because the renderer
 * pins explicit column widths (`colWidths`) and row/header heights — a known
 * boundary recorded in DECISIONS.md, to revisit if variable row heights or
 * auto-sized columns land.
 *
 * z-index layering keeps the four scroll quadrants honest:
 *   header×frozen-col corner (6) > body frozen corner (5) > header band (4)
 *   > frozen-row band (3) > frozen-col band (2) > normal body (no sticky).
 */
import type { CSSProperties } from "react";

export interface FreezeStyleArgs {
  /** Display-order row index (body cells only; ignored for the header). */
  row: number;
  /** Data-column index (0-based). */
  col: number;
  frozenRows: number;
  frozenCols: number;
  /** Pixel widths of each data column, in order. */
  colWidths: number[];
  /** Fixed pixel height of each frozen body row (for `top` offsets). */
  rowHeight: number;
  /** Fixed pixel height of the sticky header row. */
  headerHeight: number;
  /** Pixels before the first data column (e.g. a row-number gutter). */
  leftBase?: number;
  isHeader?: boolean;
  /** Opaque background for frozen body cells (sticky cells must not be see-through). */
  surface?: string;
  /** Opaque background for header cells. */
  headerSurface?: string;
}

/** z-index for a cell given which bands it belongs to. */
export function freezeZIndex(isHeader: boolean, frozenRow: boolean, frozenCol: boolean): number {
  if (isHeader) return frozenCol ? 6 : 4;
  if (frozenRow && frozenCol) return 5;
  if (frozenRow) return 3;
  return 2; // frozen column only
}

/**
 * Sticky style for one cell, or `{}` when it scrolls normally. The header is
 * always pinned to the top; the first `frozenCols` columns pin left; the first
 * `frozenRows` body rows pin just below the header.
 */
export function freezeStyle(a: FreezeStyleArgs): CSSProperties {
  const frozenCol = a.col < a.frozenCols;
  const frozenRow = !a.isHeader && a.row < a.frozenRows;
  if (!a.isHeader && !frozenRow && !frozenCol) return {};

  const style: CSSProperties = { position: "sticky" };

  if (a.isHeader) style.top = 0;
  else if (frozenRow) style.top = a.headerHeight + a.row * a.rowHeight;

  if (frozenCol) {
    let left = a.leftBase ?? 0;
    for (let i = 0; i < a.col; i++) left += a.colWidths[i] ?? 0;
    style.left = left;
  }

  style.zIndex = freezeZIndex(a.isHeader === true, frozenRow, frozenCol);
  style.background = a.isHeader
    ? a.headerSurface ?? "var(--surface-chrome)"
    : a.surface ?? "var(--surface-raised)";
  return style;
}
