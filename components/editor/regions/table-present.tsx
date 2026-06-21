"use client";

import type { CSSProperties } from "react";
import { tableViewOrder, type TableCellResult, type TableResult } from "@/lib/calc";
import type {
  TableCellBorder,
  TableCellStyle,
  TableColumn,
  TableMerge,
  TableRegion,
} from "@/lib/worksheet/content";

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

/* ------------------------------------------------------------------ *
 * Per-cell formatting overlay + cell merge (shared by edit + read modes)
 * ------------------------------------------------------------------ */

/** The per-cell style override for `(r, c)`, if any. */
export function cellStyleOf(region: TableRegion, r: number, c: number): TableCellStyle | undefined {
  return region.cellStyles?.[`${r},${c}`];
}

/** Cell alignment: the per-cell override, else the column default. */
export function cellAlignFor(
  region: TableRegion,
  col: TableColumn,
  r: number,
  c: number,
): "left" | "center" | "right" {
  return cellStyleOf(region, r, c)?.align ?? colAlign(col);
}

/** Explicit per-edge cell borders → CSS (an ink hairline on the set edges). */
export function cellBorderCss(border: TableCellBorder | undefined): CSSProperties {
  if (!border) return {};
  const line = "1px solid var(--border-strong)";
  return {
    ...(border.top ? { borderTop: line } : null),
    ...(border.right ? { borderRight: line } : null),
    ...(border.bottom ? { borderBottom: line } : null),
    ...(border.left ? { borderLeft: line } : null),
  };
}

export interface MergeLayout {
  /** `"r,c"` of cells hidden under a merge (everything but the anchor). */
  covered: Set<string>;
  /** Anchor `"r,c"` → its merge rectangle (carries the row/col span). */
  anchor: Map<string, TableMerge>;
}

/** Resolve a region's merges into a covered-set + anchor lookup for rendering. */
export function mergeLayout(region: TableRegion): MergeLayout {
  const covered = new Set<string>();
  const anchor = new Map<string, TableMerge>();
  for (const m of region.merges ?? []) {
    anchor.set(`${m.r},${m.c}`, m);
    for (let r = m.r; r < m.r + m.rowSpan; r += 1) {
      for (let c = m.c; c < m.c + m.colSpan; c += 1) {
        if (r !== m.r || c !== m.c) covered.add(`${r},${c}`);
      }
    }
  }
  return { covered, anchor };
}

/** Read/print chrome for a whole-table style preset. `default` keeps today's look. */
interface TableChrome {
  banded: boolean;
  rowRule: boolean;
  gridlines: boolean;
  headerRule: string;
  outer: boolean;
}
export function tableChrome(style: TableRegion["tableStyle"]): TableChrome {
  switch (style) {
    case "plain":
      return { banded: false, rowRule: false, gridlines: false, headerRule: "1px solid var(--border-strong)", outer: false };
    case "minimal":
      return { banded: false, rowRule: false, gridlines: false, headerRule: "none", outer: false };
    case "grid":
      return { banded: false, rowRule: true, gridlines: true, headerRule: "1.5px solid var(--text-primary)", outer: true };
    case "bordered":
      return { banded: false, rowRule: true, gridlines: false, headerRule: "1.5px solid var(--text-primary)", outer: true };
    default:
      return { banded: true, rowRule: true, gridlines: false, headerRule: "1.5px solid var(--text-primary)", outer: false };
  }
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
  const chrome = tableChrome(region.tableStyle);
  // Merges are rectangles in data order; they only make sense when rows aren't
  // reordered, so skip them under an active sort/filter view.
  const merging = !region.sort && !region.filter;
  const { covered, anchor } = mergeLayout(region);
  const hairline = "1px solid var(--border-hairline)";
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
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          border: chrome.outer ? "1px solid var(--border-strong)" : undefined,
        }}
      >
        <thead>
          <tr style={{ borderBottom: chrome.headerRule }}>
            {cols.map((col, c) => (
              <th
                key={col.key}
                style={{
                  padding: "5px 12px",
                  textAlign: colAlign(col),
                  font: "600 11px/1.3 var(--font-sans)",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  borderRight: chrome.gridlines && c < cols.length - 1 ? hairline : undefined,
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
                background: chrome.banded && i % 2 ? "color-mix(in srgb, var(--surface-chrome) 40%, transparent)" : "transparent",
                borderBottom: chrome.rowRule ? hairline : undefined,
              }}
            >
              {cols.map((col, c) => {
                if (merging && covered.has(`${r},${c}`)) return null;
                const span = merging ? anchor.get(`${r},${c}`) : undefined;
                const cell = cellOf(result, r, c);
                const cs = cellStyleOf(region, r, c);
                return (
                  <td
                    key={col.key}
                    rowSpan={span?.rowSpan}
                    colSpan={span?.colSpan}
                    style={{
                      padding: "5px 12px",
                      textAlign: cellAlignFor(region, col, r, c),
                      font: `${numericColumn(col) ? "" : "600 "}12px/1.4 ${colFontFamily(col)}`,
                      fontWeight: cs?.bold ? 700 : cell?.style ? 600 : numericColumn(col) ? 400 : 600,
                      fontStyle: cs?.italic ? "italic" : undefined,
                      color: cs?.color ?? cell?.style?.color ?? "var(--text-primary)",
                      background: cs?.fill ?? undefined,
                      whiteSpace: "nowrap",
                      borderRight: chrome.gridlines && c < cols.length - 1 ? hairline : undefined,
                      ...cellBorderCss(cs?.border),
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
