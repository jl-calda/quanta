"use client";

import type { TableCellResult, TableResult } from "@/lib/calc";
import type { TableColumn, TableRegion } from "@/lib/worksheet/content";

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

export function TablePresent({ region, result }: { region: TableRegion; result?: TableResult }) {
  const title = region.eyebrow || region.name;
  const cols = region.columns;
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
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ borderBottom: "1.5px solid var(--text-primary)" }}>
            {cols.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "5px 12px",
                  textAlign: colAlign(col),
                  font: "600 11px/1.3 var(--font-sans)",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                {columnLabel(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {region.rows.map((_, r) => (
            <tr
              key={r}
              style={{
                background: r % 2 ? "color-mix(in srgb, var(--surface-chrome) 40%, transparent)" : "transparent",
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
