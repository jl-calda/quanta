"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Dispatch } from "react";
import { cellAddress, type TableCellResult, type TableResult } from "@/lib/calc";
import type { TableRegion } from "@/lib/worksheet/content";
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
                  <span style={{ font: "600 11.5px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>
                    {columnLabel(col)}
                  </span>
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
