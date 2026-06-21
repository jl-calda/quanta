"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Dispatch } from "react";
import { cellAddress, tableViewOrder, validateCellSource, type TableCellResult, type TableResult } from "@/lib/calc";
import type { CondOp, TableColumn, TableRegion, TableSort } from "@/lib/worksheet/content";
import { Button } from "@/components/ds/core/button";
import { Input } from "@/components/ds/forms/input";
import { Select } from "@/components/ds/forms/select";
import { useEditor } from "../state/editor-provider";
import type { EditorAction } from "../state/editor-reducer";
import { Icon } from "../icons";
import {
  TablePresent,
  cellOf,
  colAlign,
  colFontFamily,
  colWidthsOf,
  columnLabel,
  isFrozen,
  numericColumn,
} from "./table-present";
import { freezeStyle, freezeZIndex } from "./table-frozen";
import { TableGroupSummary } from "./table-group-summary";
import type { RegionRenderProps } from "./types";

/* Edit-grid freeze geometry — the gutter + add-column rails make the editor's
 * fixed widths/heights differ from read mode (see DECISIONS.md). */
const GUTTER_W = 26;
const ADD_COL_W = 28;
const EDIT_HEADER_H = 34;
const EDIT_ROW_H = 30;

/**
 * Table / spreadsheet region (Functional Brief §6.3, mockup `table-region.html`).
 * Read mode is a clean banded table (what prints / a checker sees); the edit mode
 * — shown while the region is the active selection — adds the mockup's chrome: a
 * named-range chip, the selected cell reference, a Geist-Mono formula bar, the
 * gridded sheet with per-cell selection, and per-column conditional formatting.
 * All math comes from the pure `evaluateTable`; this view is presentational.
 */
export function TableRegionView({ region, selected, canEdit, dispatch }: RegionRenderProps<TableRegion>) {
  const { tableResults } = useEditor();
  const result = tableResults.get(region.id);
  if (selected && canEdit) return <TableEditor region={region} result={result} dispatch={dispatch} />;
  return <TablePresent region={region} result={result} />;
}

/* ------------------------------------------------------------------ *
 * Edit mode — formula bar + gridded sheet (mockup EditTable)
 * ------------------------------------------------------------------ */

function TableEditor({
  region,
  result,
  dispatch,
}: {
  region: TableRegion;
  result?: TableResult;
  dispatch: Dispatch<EditorAction>;
}) {
  const cols = region.columns;
  const nRows = region.rows.length;
  const nCols = cols.length;
  // `sel` is the head/active cell (drives the formula bar); `anchor` is the other
  // corner of a rectangular selection. A plain click / non-shift nav collapses the
  // two onto the head; shift-click / shift-arrow moves the head only to extend it.
  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [anchor, setAnchor] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [cellError, setCellError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // A rejected value is per-cell; clear the message whenever the selection moves.
  useEffect(() => setCellError(null), [sel.r, sel.c]);

  const clamp = (r: number, c: number) => ({
    r: Math.max(0, Math.min(nRows - 1, r)),
    c: Math.max(0, Math.min(nCols - 1, c)),
  });
  const rawAt = (r: number, c: number) => region.rows[r]?.[c] ?? "";
  const errorCount = result?.errorCount ?? 0;

  // The selected rectangle (min/max of anchor + head) and whether it spans >1 cell.
  const rect = {
    r0: Math.min(anchor.r, sel.r),
    c0: Math.min(anchor.c, sel.c),
    r1: Math.max(anchor.r, sel.r),
    c1: Math.max(anchor.c, sel.c),
  };
  const multiCell = rect.r0 !== rect.r1 || rect.c0 !== rect.c1;
  const inRect = (r: number, c: number) =>
    r >= rect.r0 && r <= rect.r1 && c >= rect.c0 && c <= rect.c1;

  // Frozen panes (display-only). The edit grid stays in data order, so freeze
  // pins the first N data rows/cols; offsets are exact because we pin widths.
  const frozen = isFrozen(region);
  const freeze = region.freeze;
  const colWidths = colWidthsOf(cols);
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const fzHead = (c: number): CSSProperties =>
    frozen && freeze
      ? freezeStyle({ row: 0, col: c, frozenRows: freeze.frozenRows, frozenCols: freeze.frozenCols, colWidths, rowHeight: EDIT_ROW_H, headerHeight: EDIT_HEADER_H, leftBase: GUTTER_W, isHeader: true, surface: "var(--surface-chrome)", headerSurface: "var(--surface-chrome)" })
      : {};
  const fzCell = (r: number, c: number, surface: string): CSSProperties =>
    frozen && freeze
      ? freezeStyle({ row: r, col: c, frozenRows: freeze.frozenRows, frozenCols: freeze.frozenCols, colWidths, rowHeight: EDIT_ROW_H, headerHeight: EDIT_HEADER_H, leftBase: GUTTER_W, surface })
      : {};
  // Gutter (row-number rail) pins left with the frozen columns and top with the
  // frozen rows; it isn't a data column so its sticky style is computed directly.
  const fzGutter = (r: number): CSSProperties => {
    if (!frozen || !freeze) return {};
    const onCol = freeze.frozenCols > 0;
    const onRow = r < freeze.frozenRows;
    if (!onCol && !onRow) return {};
    return {
      position: "sticky",
      ...(onCol ? { left: 0 } : {}),
      ...(onRow ? { top: EDIT_HEADER_H + r * EDIT_ROW_H } : {}),
      zIndex: freezeZIndex(false, onRow, onCol),
      background: "var(--surface-chrome)",
    };
  };

  const select = (r: number, c: number) => {
    const next = clamp(r, c);
    setSel(next);
    setAnchor(next); // collapse the selection onto the clicked cell
    dispatch({ type: "SELECT", id: region.id });
    gridRef.current?.focus();
  };

  // Extend the rectangle: move the head, keep the anchor (shift-click / shift-arrow).
  const extendTo = (r: number, c: number) => {
    setSel(clamp(r, c));
    dispatch({ type: "SELECT", id: region.id });
    gridRef.current?.focus();
  };

  const moveHead = (r: number, c: number, extend: boolean) => {
    const next = clamp(r, c);
    setSel(next);
    if (!extend) setAnchor(next);
  };

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp") { e.preventDefault(); moveHead(sel.r - 1, sel.c, e.shiftKey); }
    else if (e.key === "ArrowDown") { e.preventDefault(); moveHead(sel.r + 1, sel.c, e.shiftKey); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); moveHead(sel.r, sel.c - 1, e.shiftKey); }
    else if (e.key === "ArrowRight" || e.key === "Tab") { e.preventDefault(); moveHead(sel.r, sel.c + 1, e.shiftKey); }
  };

  const selCell = cellOf(result, sel.r, sel.c);
  const selCol = cols[sel.c];
  const selSpilledFrom = selCell?.kind === "spill" ? selCell.spilledFrom : undefined;
  const selRaw = rawAt(sel.r, sel.c);
  // A `list`-validated cell becomes a dropdown (bad input impossible), unless it
  // already holds a formula — then keep the formula bar so it stays editable.
  const listOptions =
    selCol?.validation?.kind === "list" && selCell?.kind !== "spill" && !selRaw.startsWith("=")
      ? selCol.validation.options ?? []
      : null;

  /** Commit a cell after validation. Returns false (and shows why) when rejected. */
  const commitCell = (source: string): boolean => {
    // A spilled cell is owned by its array formula — its source stays empty.
    if (selCell?.kind === "spill") return false;
    if (source === selRaw) {
      setCellError(null);
      return true;
    }
    const check = validateCellSource(selCol?.validation, source);
    if (!check.ok) {
      setCellError(check.message);
      return false;
    }
    setCellError(null);
    dispatch({ type: "EDIT_TABLE_CELL", id: region.id, r: sel.r, c: sel.c, source });
    return true;
  };

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }} onClick={(e) => e.stopPropagation()}>
      {/* named-range chip + cell reference + formula bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            height: 26,
            padding: "0 8px",
            borderRadius: "var(--radius-sm)",
            background: "var(--accent-tint)",
            color: "var(--accent)",
            font: "600 11px/1 var(--font-mono)",
            flex: "0 0 auto",
          }}
          title={region.name ? "Named range" : "Name this table in the inspector"}
        >
          <Icon name="label" size={13} />
          {region.name || "table"}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 40,
            height: 26,
            padding: "0 8px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-strong)",
            background: "var(--surface-raised)",
            font: "600 12px/1 var(--font-mono)",
            color: "var(--text-primary)",
            flex: "0 0 auto",
          }}
        >
          {nRows > 0 && nCols > 0 ? cellAddress(sel.r, sel.c) : "—"}
        </span>
        {listOptions ? (
          <CellDropdown
            key={`${region.id}:${sel.r}:${sel.c}`}
            value={selRaw}
            options={listOptions}
            disabled={nRows === 0 || nCols === 0}
            onPick={(value) => {
              commitCell(value);
              gridRef.current?.focus();
            }}
          />
        ) : (
          <FormulaBar
            key={`${region.id}:${sel.r}:${sel.c}`}
            source={selRaw}
            disabled={nRows === 0 || nCols === 0}
            spilledFrom={selSpilledFrom}
            onCommit={commitCell}
            onCommitNext={(source) => {
              // Enter walks down a column — collapse the selection so no stale rect lingers.
              if (commitCell(source)) {
                const next = clamp(sel.r + 1, sel.c);
                setSel(next);
                setAnchor(next);
              }
              gridRef.current?.focus();
            }}
          />
        )}
        <Button
          size="sm"
          variant="secondary"
          iconLeft={<Icon name="chart" size={14} />}
          disabled={!multiCell}
          onClick={() => dispatch({ type: "CHART_TABLE_RANGE", id: region.id, rect })}
          title={multiCell ? "Chart the selected range" : "Select a range of cells to chart"}
          style={{ flex: "0 0 auto" }}
        >
          Chart range
        </Button>
      </div>
      {cellError && (
        <div
          role="alert"
          style={{ display: "flex", alignItems: "center", gap: 5, font: "11.5px/1.3 var(--font-sans)", color: "var(--status-error)" }}
        >
          <span style={{ display: "inline-flex", flex: "0 0 auto" }}>
            <Icon name="alertCirc" size={13} />
          </span>
          {cellError}
        </div>
      )}

      {/* the grid */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={onGridKey}
        style={{
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-sm)",
          overflow: frozen ? "auto" : "hidden",
          maxHeight: frozen && freeze && freeze.frozenRows > 0 ? 360 : undefined,
          background: "var(--surface-raised)",
          outline: "none",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: frozen ? GUTTER_W + totalWidth + ADD_COL_W : "100%",
            tableLayout: frozen ? "fixed" : "auto",
          }}
        >
          {frozen && (
            <colgroup>
              <col style={{ width: GUTTER_W }} />
              {colWidths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
              <col style={{ width: ADD_COL_W }} />
            </colgroup>
          )}
          <thead>
            <tr>
              <th
                style={{
                  width: 26,
                  background: "var(--surface-chrome)",
                  borderRight: "1px solid var(--border-hairline)",
                  borderBottom: "1px solid var(--border-strong)",
                  height: frozen ? EDIT_HEADER_H : undefined,
                  ...(frozen
                    ? {
                        position: "sticky",
                        top: 0,
                        ...(freeze && freeze.frozenCols > 0 ? { left: 0 } : {}),
                        zIndex: freeze && freeze.frozenCols > 0 ? 6 : 4,
                      }
                    : {}),
                }}
              />
              {cols.map((col, c) => (
                <th
                  key={col.key}
                  style={{
                    padding: "6px 10px",
                    textAlign: colAlign(col),
                    background: "var(--surface-chrome)",
                    borderRight: c < nCols - 1 ? "1px solid var(--border-hairline)" : "none",
                    borderBottom: "1px solid var(--border-strong)",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                    height: frozen ? EDIT_HEADER_H : undefined,
                    ...fzHead(c),
                  }}
                >
                  <ColumnHead region={region} col={col} dispatch={dispatch} />
                </th>
              ))}
              <th
                style={{
                  width: 28,
                  background: "var(--surface-chrome)",
                  borderBottom: "1px solid var(--border-strong)",
                  borderLeft: "1px solid var(--border-hairline)",
                  ...(frozen ? { position: "sticky", top: 0, zIndex: 4 } : {}),
                }}
              >
                <button
                  type="button"
                  title="Add column"
                  aria-label="Add column"
                  onClick={() => dispatch({ type: "ADD_TABLE_COLUMN", id: region.id })}
                  style={iconBtn}
                >
                  <Icon name="plusSm" size={13} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {region.rows.map((row, r) => (
              <tr
                key={r}
                style={{
                  background: r % 2 ? "color-mix(in srgb, var(--surface-chrome) 45%, var(--surface-raised))" : "var(--surface-raised)",
                }}
              >
                <td
                  className="tbl-gutter"
                  style={{
                    position: "relative",
                    textAlign: "center",
                    font: "10.5px/1 var(--font-mono)",
                    color: "var(--text-muted)",
                    background: "var(--surface-chrome)",
                    borderRight: "1px solid var(--border-hairline)",
                    borderTop: r ? "1px solid var(--border-hairline)" : "none",
                    height: frozen ? EDIT_ROW_H : undefined,
                    ...fzGutter(r),
                  }}
                >
                  {r + 2}
                  <button
                    type="button"
                    title="Delete row"
                    aria-label="Delete row"
                    onClick={() => dispatch({ type: "DELETE_TABLE_ROW", id: region.id, r })}
                    className="tbl-gutter-del"
                    style={{ ...iconBtn, position: "absolute", inset: 0, width: "100%", height: "100%", color: "var(--status-error)" }}
                  >
                    <Icon name="x" size={11} />
                  </button>
                </td>
                {cols.map((col, c) => {
                  const isHead = sel.r === r && sel.c === c;
                  // A cell inside a multi-cell selection (but not the head) gets a
                  // translucent overlay that layers over any conditional / spill fill.
                  const isRange = multiCell && !isHead && inRect(r, c);
                  const cell = cellOf(result, r, c);
                  const style = cell?.style;
                  // Cells an array formula filled read as derived: faint accent tint +
                  // muted text, so the spilled block is legible but clearly not typed in.
                  const isSpill = cell?.kind === "spill";
                  // Sticky frozen cells need an opaque fill so the scrolled grid
                  // can't bleed through; fall back to the row band.
                  const bandBg = r % 2 ? "color-mix(in srgb, var(--surface-chrome) 45%, var(--surface-raised))" : "var(--surface-raised)";
                  const frozenBg = style?.fill ?? (isSpill ? "var(--accent-tint)" : bandBg);
                  return (
                    <td
                      key={col.key}
                      className="cell"
                      onClick={(e) => (e.shiftKey ? extendTo(r, c) : select(r, c))}
                      style={{
                        position: "relative",
                        padding: "5px 10px",
                        textAlign: colAlign(col),
                        font: `${numericColumn(col) ? "" : "600 "}12px/1.3 ${colFontFamily(col)}`,
                        color: cell?.error
                          ? "var(--status-error)"
                          : style?.color ?? (isSpill ? "var(--text-muted)" : "var(--text-primary)"),
                        background: isHead ? "transparent" : style?.fill ?? (isSpill ? "var(--accent-tint)" : "transparent"),
                        borderRight: c < nCols - 1 ? "1px solid var(--border-hairline)" : "none",
                        borderTop: r ? "1px solid var(--border-hairline)" : "none",
                        cursor: "cell",
                        outline: isHead ? "2px solid var(--accent)" : "none",
                        outlineOffset: -2,
                        boxShadow: isHead
                          ? "inset 0 0 0 2px color-mix(in srgb, var(--accent) 12%, transparent)"
                          : isRange
                            ? "inset 0 0 0 999px color-mix(in srgb, var(--accent) 12%, transparent)"
                            : "none",
                        whiteSpace: "nowrap",
                        transition: "background var(--dur-fast) var(--ease-out)",
                        height: frozen ? EDIT_ROW_H : undefined,
                        ...fzCell(r, c, frozenBg),
                      }}
                    >
                      <EditCellContent region={region} cell={cell} r={r} c={c} />
                      {!isHead && style?.label && (
                        <span style={{ font: "8.5px/1 var(--font-sans)", fontWeight: 600, marginLeft: 5, letterSpacing: "0.04em" }}>
                          {style.label}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td style={{ background: "var(--surface-raised)", borderTop: r ? "1px solid var(--border-hairline)" : "none", borderLeft: "1px solid var(--border-hairline)" }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(region.sort || region.filter) && <ViewSummary region={region} result={result} dispatch={dispatch} />}

      {/* footer: counts + add row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 2px" }}>
        <span style={{ font: "11px/1 var(--font-sans)", color: "var(--text-muted)" }}>
          {nRows} {nRows === 1 ? "row" : "rows"}
          {errorCount > 0 && ` · ${errorCount} ${errorCount === 1 ? "cell fails" : "cells fail"}`}
        </span>
        <button
          type="button"
          onClick={() => dispatch({ type: "ADD_TABLE_ROW", id: region.id })}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            border: "none",
            background: "none",
            color: "var(--accent)",
            font: "500 11px/1 var(--font-sans)",
            cursor: "pointer",
            padding: "2px 0",
          }}
        >
          <Icon name="plusSm" size={12} /> Add row
        </button>
      </div>

      {region.group && <TableGroupSummary region={region} result={result} />}
    </div>
  );
}

const iconBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: 24,
  border: "none",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
};

function EditCellContent({
  region,
  cell,
  r,
  c,
}: {
  region: TableRegion;
  cell: TableCellResult | undefined;
  r: number;
  c: number;
}) {
  if (cell?.error) {
    const raw = region.rows[r]?.[c] ?? "";
    return (
      <span
        title={`${cell.error.message}${cell.error.fixHint ? " " + cell.error.fixHint : ""}`}
        style={{ textDecoration: "underline wavy var(--status-error)", textDecorationThickness: "1.5px", textUnderlineOffset: 3 }}
      >
        {raw || "#error"}
      </span>
    );
  }
  if (cell?.kind === "spill") {
    return (
      <span title={cell.spilledFrom ? `Spilled from ${cell.spilledFrom}` : undefined}>{cell.formatted}</span>
    );
  }
  if (cell && cell.kind !== "empty") return <>{cell.formatted}</>;
  const raw = region.rows[r]?.[c] ?? "";
  return <>{raw.startsWith("=") ? "" : raw}</>;
}

/* ------------------------------------------------------------------ *
 * Formula bar — Geist Mono, commit on Enter / blur (mockup formula bar)
 * ------------------------------------------------------------------ */

function FormulaBar({
  source,
  disabled,
  spilledFrom,
  onCommit,
  onCommitNext,
}: {
  source: string;
  disabled: boolean;
  /** When set, the selected cell was filled by an array formula and is read-only. */
  spilledFrom?: string;
  onCommit: (source: string) => void;
  onCommitNext: (source: string) => void;
}) {
  const [draft, setDraft] = useState(source);
  const ref = useRef<HTMLInputElement>(null);

  // A spilled cell isn't editable — show where its value came from instead of an input.
  if (spilledFrom) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 7,
          height: 26,
          padding: "0 9px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-hairline)",
          background: "var(--accent-tint)",
          font: "12px/1 var(--font-sans)",
          color: "var(--text-muted)",
        }}
      >
        <span style={{ display: "inline-flex", color: "var(--accent)", flex: "0 0 auto" }}>
          <Icon name="label" size={14} />
        </span>
        Spilled from <span style={{ font: "12px/1 var(--font-mono)", color: "var(--accent)" }}>{spilledFrom}</span>
      </div>
    );
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommitNext(draft);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(source);
      ref.current?.blur();
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 7,
        height: 26,
        padding: "0 9px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--accent)",
        background: "var(--surface-raised)",
        boxShadow: "0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ display: "inline-flex", color: "var(--accent)", flex: "0 0 auto" }}>
        <Icon name="fx" size={15} />
      </span>
      <input
        ref={ref}
        value={draft}
        disabled={disabled}
        spellCheck={false}
        placeholder="Value or =formula (A1, names, Vlookup …)"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => onCommit(draft)}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          font: "12.5px/1 var(--font-mono)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Cell dropdown — a `list`-validated column edits via a Select, so only
 * allowed values can be entered (bad input is impossible by construction).
 * ------------------------------------------------------------------ */

function CellDropdown({
  value,
  options,
  disabled,
  onPick,
}: {
  value: string;
  options: string[];
  disabled: boolean;
  onPick: (value: string) => void;
}) {
  // Blank clears the cell; a pre-existing off-list value stays selectable (and
  // flagged) so switching a populated column to a list never hides data.
  const list = [{ value: "", label: "—" }, ...options.map((o) => ({ value: o, label: o }))];
  if (value && !options.includes(value)) list.push({ value, label: `${value} (off list)` });
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Select
        size="sm"
        value={value}
        disabled={disabled}
        options={list}
        onChange={(e) => onPick(e.target.value)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Column header — sort toggle + filter menu (the sort/filter is a
 * display-only view applied by `TablePresent`; the edit grid stays in
 * raw data order so A1 addresses and cell editing remain honest).
 * ------------------------------------------------------------------ */

const FILTER_OPS: { value: CondOp; label: string }[] = [
  { value: ">", label: ">" },
  { value: ">=", label: "≥" },
  { value: "<", label: "<" },
  { value: "<=", label: "≤" },
  { value: "=", label: "=" },
  { value: "!=", label: "≠" },
];

function opGlyph(op: CondOp): string {
  return FILTER_OPS.find((o) => o.value === op)?.label ?? op;
}

/** A numeric-looking value persists as a number; anything else stays a string. */
function parseFilterValue(raw: string): number | string {
  const trimmed = raw.trim();
  const num = Number(trimmed);
  return trimmed !== "" && Number.isFinite(num) ? num : trimmed;
}

function colLabelText(region: TableRegion, key: string): string {
  const col = region.columns.find((c) => c.key === key);
  return col?.label?.trim() || key;
}

const headCompactBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
};

function ColumnHead({
  region,
  col,
  dispatch,
}: {
  region: TableRegion;
  col: TableColumn;
  dispatch: Dispatch<EditorAction>;
}) {
  const sort = region.sort?.key === col.key ? region.sort : undefined;
  const align = colAlign(col);
  const justify = align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start";

  // Cycle none → ascending → descending → none for this column (single sort key).
  const cycleSort = () => {
    const next: TableSort | null = !sort
      ? { key: col.key, dir: "asc" }
      : sort.dir === "asc"
        ? { key: col.key, dir: "desc" }
        : null;
    dispatch({ type: "SET_TABLE_SORT", id: region.id, sort: next });
  };
  const label = col.label?.trim() || col.key;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: justify }}>
      <button
        type="button"
        onClick={cycleSort}
        title={sort ? `Sorted ${sort.dir === "asc" ? "ascending" : "descending"} — click to ${sort.dir === "asc" ? "reverse" : "clear"}` : `Sort by ${label}`}
        aria-label={`Sort by ${label}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: "2px 3px",
          borderRadius: "var(--radius-sm)",
          color: sort ? "var(--accent)" : "var(--text-primary)",
          font: "600 11.5px/1.2 var(--font-sans)",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span>{columnLabel(col)}</span>
        {sort && <Icon name={sort.dir === "asc" ? "chevU" : "chevD"} size={12} />}
      </button>
      <ColumnFilterMenu region={region} col={col} dispatch={dispatch} />
    </div>
  );
}

function ColumnFilterMenu({
  region,
  col,
  dispatch,
}: {
  region: TableRegion;
  col: TableColumn;
  dispatch: Dispatch<EditorAction>;
}) {
  const active = region.filter?.key === col.key ? region.filter : undefined;
  const [open, setOpen] = useState(false);
  const [op, setOp] = useState<CondOp>(active?.op ?? ">");
  const [value, setValue] = useState<string>(active != null ? String(active.value) : "");
  const ref = useRef<HTMLSpanElement>(null);

  // Sync the draft to the persisted filter each time the menu opens.
  useEffect(() => {
    if (open) {
      setOp(active?.op ?? ">");
      setValue(active != null ? String(active.value) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const apply = () => {
    dispatch({
      type: "SET_TABLE_FILTER",
      id: region.id,
      filter: { key: col.key, op, value: parseFilterValue(value) },
    });
    setOpen(false);
  };
  const clear = () => {
    dispatch({ type: "SET_TABLE_FILTER", id: region.id, filter: null });
    setOpen(false);
  };
  const label = col.label?.trim() || col.key;

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", flex: "0 0 auto" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={active ? `Filtered ${opGlyph(active.op)} ${active.value} — edit` : `Filter ${label}`}
        aria-label={`Filter ${label}`}
        style={{
          ...headCompactBtn,
          color: active ? "var(--accent)" : "var(--text-muted)",
          background: active ? "var(--accent-tint)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = "var(--surface-hover)";
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = "transparent";
        }}
      >
        <Icon name="funnel" size={12} />
      </button>
      {open && (
        <div
          className="pop-in"
          // Keep arrow/Escape keys inside the menu — the grid div above listens for nav keys.
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") setOpen(false);
          }}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 50,
            width: 226,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-popover)",
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 9,
            textAlign: "left",
            cursor: "default",
          }}
        >
          <div
            className="q-eyebrow"
            style={{
              font: "600 10px/1 var(--font-sans)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Filter {label}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 64, flex: "0 0 auto" }}>
              <Select size="sm" value={op} onChange={(e) => setOp(e.target.value as CondOp)} options={FILTER_OPS} />
            </div>
            <Input
              size="sm"
              mono
              value={value}
              placeholder="value"
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apply();
                }
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
            <Button size="sm" variant="ghost" onClick={clear} disabled={!active}>
              Clear
            </Button>
            <Button size="sm" variant="primary" onClick={apply}>
              Apply filter
            </Button>
          </div>
        </div>
      )}
    </span>
  );
}

/**
 * View-summary chip — the edit grid stays in data order, so this makes the
 * sort/filter that the read/print view applies discoverable, with the live
 * match count and one-click clear.
 */
function ViewSummary({
  region,
  result,
  dispatch,
}: {
  region: TableRegion;
  result?: TableResult;
  dispatch: Dispatch<EditorAction>;
}) {
  const total = region.rows.length;
  const shown = tableViewOrder({
    rows: region.rows,
    columns: region.columns,
    cells: result?.cells,
    sort: region.sort,
    filter: region.filter,
  }).length;
  const clearAll = () => {
    if (region.sort) dispatch({ type: "SET_TABLE_SORT", id: region.id, sort: null });
    if (region.filter) dispatch({ type: "SET_TABLE_FILTER", id: region.id, filter: null });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: "6px 9px",
        borderRadius: "var(--radius-sm)",
        background: "var(--accent-tint)",
        border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
      }}
    >
      <span style={{ display: "inline-flex", color: "var(--accent)", flex: "0 0 auto" }}>
        <Icon name="eye" size={13} />
      </span>
      <span style={{ font: "11px/1.4 var(--font-sans)", color: "var(--text-primary)" }}>
        Read view:
        {region.sort && (
          <>
            {" "}sorted by <b>{colLabelText(region, region.sort.key)}</b> {region.sort.dir === "asc" ? "↑" : "↓"}
          </>
        )}
        {region.sort && region.filter && " ·"}
        {region.filter && (
          <>
            {" "}filtered <b>{colLabelText(region, region.filter.key)} {opGlyph(region.filter.op)} {String(region.filter.value)}</b>
          </>
        )}
      </span>
      {region.filter && (
        <span style={{ font: "11px/1.4 var(--font-mono)", color: "var(--text-muted)" }}>
          {shown} of {total} rows
        </span>
      )}
      <button
        type="button"
        onClick={clearAll}
        style={{
          marginLeft: "auto",
          border: "none",
          background: "none",
          color: "var(--accent)",
          font: "500 11px/1 var(--font-sans)",
          cursor: "pointer",
          padding: "2px 0",
        }}
      >
        Clear view
      </button>
    </div>
  );
}
