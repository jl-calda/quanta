"use client";

import { evaluateTableGroup, type GroupAgg, type TableResult } from "@/lib/calc";
import type { TableRegion } from "@/lib/worksheet/content";

/**
 * Grouping summary — a compact, display-only table rendered below the grid. It
 * groups rows by a column and summarises another (count/sum/mean/min/max) via the
 * pure `evaluateTableGroup`, reading the live evaluated grid. Shared by the edit
 * and read (print/checker) modes.
 */

const AGG_LABEL: Record<GroupAgg, string> = {
  count: "Count",
  sum: "Sum",
  mean: "Mean",
  min: "Min",
  max: "Max",
};

export function TableGroupSummary({ region, result }: { region: TableRegion; result?: TableResult }) {
  const group = region.group;
  if (!group) return null;

  const summary = evaluateTableGroup({
    rows: region.rows,
    columns: region.columns,
    cells: result?.cells,
    group,
  });
  const showCount = summary.agg !== "count";
  const valueHead =
    summary.agg === "count"
      ? "Count"
      : `${AGG_LABEL[summary.agg]}${summary.valueLabel ? ` · ${summary.valueLabel}` : ""}`;

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          font: "600 10px/1 var(--font-sans)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 7,
        }}
      >
        Summary · grouped by {summary.byLabel}
      </div>
      {summary.rows.length === 0 ? (
        <div style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
          No groups to summarise.
        </div>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid var(--text-primary)" }}>
              <th style={headStyle("left")}>{summary.byLabel}</th>
              {showCount && <th style={headStyle("right")}>Rows</th>}
              <th style={headStyle("right")}>{valueHead}</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.key} style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                <td style={cellStyle("left", "var(--font-sans)")}>{row.key}</td>
                {showCount && <td style={cellStyle("right", "var(--font-mono)")}>{row.count}</td>}
                <td
                  style={{
                    ...cellStyle("right", "var(--font-mono)"),
                    color: row.error ? "var(--status-warning)" : "var(--text-primary)",
                  }}
                  title={row.error}
                >
                  {row.formatted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function headStyle(align: "left" | "right"): React.CSSProperties {
  return {
    padding: "5px 12px",
    textAlign: align,
    font: "600 11px/1.3 var(--font-sans)",
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
  };
}

function cellStyle(align: "left" | "right", family: string): React.CSSProperties {
  return {
    padding: "5px 12px",
    textAlign: align,
    font: `12px/1.4 ${family}`,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
  };
}
