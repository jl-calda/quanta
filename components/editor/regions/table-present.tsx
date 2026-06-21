"use client";

import { tableViewOrder, type TableCellResult, type TableResult } from "@/lib/calc";
import type { TableColumn, TableRegion } from "@/lib/worksheet/content";
import { freezeStyle } from "./table-frozen";
import { TableGroupSummary } from "./table-group-summary";

/**
 * Clean banded read mode for a table region (mockup `table-region.html`,
 * PresentTable) — what prints and what a checker sees: eyebrow title, a 1.5px ink
 * top rule, banded rows, hairline row rules, no gridlines, and per-column
 * conditional formatting (text colour + OK/FAIL tag). Pure and provider-free, so
 * it is shared by the editor and the read-only history/snapshot renderer.
 */

/** A column carries a real unit (excludes the ratio dash), for value attach/align. */
export function hasUnit(unit: string | undefined): boolean {
  if (!unit) return false;
  const t = unit.trim();
  return t !== "" && t !== "—" && t !== "-" && t !== "–";
}

/** Numeric columns (a unit or an explicit format) render mono + right by default. */
export function numericColumn(col: TableColumn): boolean {
  return Boolean(col.unit) || Boolean(col.format);
}

export function colAlign(col: TableColumn): "left" | "center" | "right" {
  return col.align ?? (numericColumn(col) ? "right" : "left");
}

export function colFontFamily(col: TableColumn): string {
  return numericColumn(col) ? "var(--font-mono)" : "var(--font-sans)";
}

export function columnLabel(col: TableColumn) {
  if (!col.unit) return col.label;
  return (
    <>
      {col.label} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>[{col.unit}]</span>
    </>
  );
}

export function cellOf(result: TableResult | undefined, r: number, c: number): TableCellResult | undefined {
  return result?.cells?.[r]?.[c];
}

/* Frozen-pane geometry — fixed widths/heights make sticky offsets deterministic
 * (see `table-frozen` + DECISIONS.md). Shared by present and edit modes. */
export const FROZEN_COL_WIDTH = 128;
export const FROZEN_ROW_HEIGHT = 30;
export const FROZEN_HEADER_HEIGHT = 30;

export function colWidthsOf(cols: TableColumn[]): number[] {
  return cols.map((c) => c.width ?? FROZEN_COL_WIDTH);
}

/** True when a freeze config actually pins at least one row or column. */
export function isFrozen(region: TableRegion): boolean {
  const f = region.freeze;
  return Boolean(f && (f.frozenRows > 0 || f.frozenCols > 0));
}

export function TablePresent({ region, result }: { region: TableRegion; result?: TableResult }) {
  const title = region.eyebrow || region.name;
  const cols = region.columns;
  // Sort/filter are a display-only view over the data-order grid; `order` holds the
  // original row indices to render (engine results and lookups stay in data order).
  const order = tableViewOrder({
    rows: region.rows,
    columns: cols,
    cells: result?.cells,
    sort: region.sort,
    filter: region.filter,
  });

  const frozen = isFrozen(region);
  const freeze = region.freeze;
  const colWidths = colWidthsOf(cols);
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  // Pin row index `i` (display order) / data column `c`. Opaque paper bg keeps the
  // scrolled grid from bleeding through sticky cells.
  const fz = (i: number, c: number, isHeader = false) =>
    frozen && freeze
      ? freezeStyle({
          row: i,
          col: c,
          frozenRows: freeze.frozenRows,
          frozenCols: freeze.frozenCols,
          colWidths,
          rowHeight: FROZEN_ROW_HEIGHT,
          headerHeight: FROZEN_HEADER_HEIGHT,
          isHeader,
          surface: "var(--surface-paper)",
          headerSurface: "var(--surface-paper)",
        })
      : {};

  return (
    <div>
      {title && (
        <div
          style={{
            font: "600 10px/1 var(--font-sans)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 7,
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          overflow: frozen ? "auto" : undefined,
          maxHeight: frozen && freeze && freeze.frozenRows > 0 ? 360 : undefined,
          maxWidth: "100%",
          border: frozen ? "1px solid var(--border-hairline)" : undefined,
          borderRadius: frozen ? "var(--radius-sm)" : undefined,
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: frozen ? totalWidth : "100%",
            tableLayout: frozen ? "fixed" : "auto",
          }}
        >
          {frozen && (
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
          )}
          <thead>
            <tr style={{ borderBottom: "1.5px solid var(--text-primary)" }}>
              {cols.map((col, c) => (
                <th
                  key={col.key}
                  style={{
                    padding: "5px 12px",
                    textAlign: colAlign(col),
                    font: "600 11px/1.3 var(--font-sans)",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    height: frozen ? FROZEN_HEADER_HEIGHT : undefined,
                    ...fz(0, c, true),
                  }}
                >
                  {columnLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.map((r, i) => (
              <tr
                key={r}
                style={{
                  background: i % 2 ? "color-mix(in srgb, var(--surface-chrome) 40%, transparent)" : "transparent",
                  borderBottom: "1px solid var(--border-hairline)",
                }}
              >
                {cols.map((col, c) => {
                  const cell = cellOf(result, r, c);
                  return (
                    <td
                      key={col.key}
                      style={{
                        padding: "5px 12px",
                        textAlign: colAlign(col),
                        font: `${numericColumn(col) ? "" : "600 "}12px/1.4 ${colFontFamily(col)}`,
                        fontWeight: cell?.style ? 600 : numericColumn(col) ? 400 : 600,
                        color: cell?.style?.color ?? "var(--text-primary)",
                        whiteSpace: "nowrap",
                        height: frozen ? FROZEN_ROW_HEIGHT : undefined,
                        ...fz(i, c),
                      }}
                    >
                      <PresentCellContent region={region} cell={cell} r={r} c={c} />
                      {cell?.style?.label && (
                        <span style={{ font: "8.5px/1 var(--font-sans)", fontWeight: 600, marginLeft: 5 }}>
                          {cell.style.label}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {region.group && <TableGroupSummary region={region} result={result} />}
    </div>
  );
}

function PresentCellContent({
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
    return (
      <span
        style={{ color: "var(--status-error)" }}
        title={`${cell.error.message}${cell.error.fixHint ? " " + cell.error.fixHint : ""}`}
      >
        #error
      </span>
    );
  }
  if (cell && cell.kind !== "empty") return <>{cell.formatted}</>;
  const raw = region.rows[r]?.[c] ?? "";
  return <>{raw.startsWith("=") ? "" : raw}</>;
}
