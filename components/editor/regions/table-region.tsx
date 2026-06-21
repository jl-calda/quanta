"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Dispatch } from "react";
import { cellAddress, tableViewOrder, type TableCellResult, type TableResult } from "@/lib/calc";
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
  columnLabel,
  numericColumn,
} from "./table-present";
import type { RegionRenderProps } from "./types";

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
  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const clamp = (r: number, c: number) => ({
    r: Math.max(0, Math.min(nRows - 1, r)),
    c: Math.max(0, Math.min(nCols - 1, c)),
  });
  const rawAt = (r: number, c: number) => region.rows[r]?.[c] ?? "";
  const errorCount = result?.errorCount ?? 0;

  const select = (r: number, c: number) => {
    setSel(clamp(r, c));
    dispatch({ type: "SELECT", id: region.id });
    gridRef.current?.focus();
  };

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => clamp(s.r - 1, s.c)); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => clamp(s.r + 1, s.c)); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setSel((s) => clamp(s.r, s.c - 1)); }
    else if (e.key === "ArrowRight" || e.key === "Tab") { e.preventDefault(); setSel((s) => clamp(s.r, s.c + 1)); }
  };

  const commitCell = (source: string) => {
    if (source !== rawAt(sel.r, sel.c)) {
      dispatch({ type: "EDIT_TABLE_CELL", id: region.id, r: sel.r, c: sel.c, source });
    }
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
        <FormulaBar
          key={`${region.id}:${sel.r}:${sel.c}`}
          source={rawAt(sel.r, sel.c)}
          disabled={nRows === 0 || nCols === 0}
          onCommit={commitCell}
          onCommitNext={(source) => {
            commitCell(source);
            setSel((s) => clamp(s.r + 1, s.c));
            gridRef.current?.focus();
          }}
        />
      </div>

      {/* the grid */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={onGridKey}
        style={{
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          background: "var(--surface-raised)",
          outline: "none",
        }}
      >
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th
                style={{
                  width: 26,
                  background: "var(--surface-chrome)",
                  borderRight: "1px solid var(--border-hairline)",
                  borderBottom: "1px solid var(--border-strong)",
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
                  const isSel = sel.r === r && sel.c === c;
                  const cell = cellOf(result, r, c);
                  const style = cell?.style;
                  return (
                    <td
                      key={col.key}
                      className="cell"
                      onClick={() => select(r, c)}
                      style={{
                        position: "relative",
                        padding: "5px 10px",
                        textAlign: colAlign(col),
                        font: `${numericColumn(col) ? "" : "600 "}12px/1.3 ${colFontFamily(col)}`,
                        color: cell?.error ? "var(--status-error)" : style?.color ?? "var(--text-primary)",
                        background: isSel ? "transparent" : style?.fill ?? "transparent",
                        borderRight: c < nCols - 1 ? "1px solid var(--border-hairline)" : "none",
                        borderTop: r ? "1px solid var(--border-hairline)" : "none",
                        cursor: "cell",
                        outline: isSel ? "2px solid var(--accent)" : "none",
                        outlineOffset: -2,
                        boxShadow: isSel ? "inset 0 0 0 2px color-mix(in srgb, var(--accent) 12%, transparent)" : "none",
                        whiteSpace: "nowrap",
                        transition: "background var(--dur-fast) var(--ease-out)",
                      }}
                    >
                      <EditCellContent region={region} cell={cell} r={r} c={c} />
                      {!isSel && style?.label && (
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
  onCommit,
  onCommitNext,
}: {
  source: string;
  disabled: boolean;
  onCommit: (source: string) => void;
  onCommitNext: (source: string) => void;
}) {
  const [draft, setDraft] = useState(source);
  const ref = useRef<HTMLInputElement>(null);

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
