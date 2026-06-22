"use client";

import { evaluateSweep, type SweepResult, type SweepSeries } from "@/lib/calc";
import type { SweepRegion } from "@/lib/worksheet/content";
import { useEditor } from "../state/editor-provider";
import { Icon } from "../icons";
import type { RegionRenderProps } from "./types";

/**
 * Parametric-sweep read view (Functional Brief §2 "sensitivity / parametric
 * study"). The bordered block shows the swept parameter + range and a compact
 * series table (parameter column + one column per output, units in the headers).
 * The pure `evaluateSweep` runs in the settle loop and reuses the plot sampler;
 * this view just reads the published `SweepResult`. Named outputs export a vector
 * into worksheet scope, so a downstream plot/table can consume them by name.
 * Editing (parameter, range, steps, outputs) lives in the inspector.
 */
export function SweepRegionView({ region }: RegionRenderProps<SweepRegion>) {
  const { sweepResults } = useEditor();
  return <SweepBlock region={region} result={sweepResults.get(region.id)} />;
}

/** Provider-free variant for read-only contexts (history snapshots). */
export function StaticSweepRegionView({ region }: RegionRenderProps<SweepRegion>) {
  return <SweepBlock region={region} result={evaluateSweep(region, {})} />;
}

const MAX_VISIBLE_ROWS = 12;

function SweepBlock({ region, result }: { region: SweepRegion; result: SweepResult | undefined }) {
  const status = result?.status ?? "empty";

  return (
    <div style={{ position: "relative", maxWidth: 560 }}>
      <div
        style={{
          border: "1px solid var(--border-strong)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: "var(--radius-sm)",
          background: "var(--surface-raised)",
          padding: "12px 16px 14px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ font: "600 12px/1 var(--font-sans)", color: "var(--text-primary)" }}>Parametric sweep</span>
          {region.name && (
            <span
              style={{
                font: "11px/1 var(--font-mono)",
                color: "var(--text-muted)",
                background: "var(--surface-chrome)",
                border: "1px solid var(--border-hairline)",
                borderRadius: 3,
                padding: "2px 5px",
              }}
            >
              {region.name}
            </span>
          )}
          <StatusBadge status={status} rows={result?.rows ?? 0} />
        </div>

        {/* range summary */}
        <div style={{ font: "11.5px/1.5 var(--font-mono)", color: "var(--text-muted)", marginBottom: 8 }}>
          {region.param || "x"} : {region.from || "0"} … {region.to || "10"}
          {region.stepSize ? ` · step ${region.stepSize}` : region.steps ? ` · ${region.steps} pts` : ""}
          {region.scale === "log" ? " · log" : ""}
        </div>

        <SweepBody result={result} status={status} />
      </div>
    </div>
  );
}

function SweepBody({ result, status }: { result: SweepResult | undefined; status: string }) {
  if (status === "empty" || !result) {
    return (
      <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
        Set a parameter, range, and at least one output expression in the inspector to produce a series.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          padding: "10px 12px",
          borderRadius: "var(--radius-sm)",
          background: "var(--status-error-bg)",
          border: "1px solid color-mix(in srgb, var(--status-error) 28%, transparent)",
        }}
      >
        <span style={{ display: "inline-flex", color: "var(--status-error)", flex: "0 0 auto", marginTop: 1 }}>
          <Icon name="alertCirc" size={16} />
        </span>
        <div>
          <div style={{ font: "600 12.5px/1.4 var(--font-sans)", color: "var(--status-error)" }}>
            {result.error?.message ?? "The sweep couldn't be computed."}
          </div>
          {result.error?.fixHint && (
            <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-primary)", marginTop: 2 }}>
              {result.error.fixHint}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <SeriesTable param={result.param} columns={result.columns} rows={result.rows} />;
}

function SeriesTable({ param, columns, rows }: { param: SweepSeries; columns: SweepSeries[]; rows: number }) {
  const indices = rowIndices(rows);
  const headers = [param, ...columns];

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-sm)" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", font: "12px/1.4 var(--font-mono)" }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: "right",
                  padding: "6px 10px",
                  borderBottom: "1px solid var(--border-strong)",
                  background: "var(--surface-chrome)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {h.label}
                {h.unit ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> ({h.unit})</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {indices.map((idx) =>
            idx === -1 ? (
              <tr key="gap">
                <td colSpan={headers.length} style={{ textAlign: "center", padding: "4px 10px", color: "var(--text-muted)" }}>
                  ⋮ {rows - MAX_VISIBLE_ROWS + 1} more
                </td>
              </tr>
            ) : (
              <tr key={idx}>
                {headers.map((h, c) => (
                  <td
                    key={c}
                    style={{
                      textAlign: "right",
                      padding: "4px 10px",
                      borderBottom: "1px solid var(--border-hairline)",
                      color: c === 0 ? "var(--text-muted)" : "var(--text-primary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmt(h.values[idx])}
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Visible row indices: all when small, else the first rows + a gap + the last row. */
function rowIndices(rows: number): number[] {
  if (rows <= MAX_VISIBLE_ROWS) return Array.from({ length: rows }, (_, i) => i);
  const head = Array.from({ length: MAX_VISIBLE_ROWS - 1 }, (_, i) => i);
  return [...head, -1, rows - 1];
}

function StatusBadge({ status, rows }: { status: string; rows: number }) {
  const map: Record<string, { color: string; icon: "check" | "alertCirc" | "dot"; text: string }> = {
    ok: { color: "var(--status-pass)", icon: "check", text: `${rows} pts` },
    error: { color: "var(--status-error)", icon: "alertCirc", text: "error" },
    empty: { color: "var(--text-muted)", icon: "dot", text: "set up" },
  };
  const m = map[status] ?? map.empty;
  return (
    <span
      style={{
        marginLeft: "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        font: "10px/1 var(--font-sans)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontWeight: 600,
        color: m.color,
      }}
    >
      <Icon name={m.icon} size={13} /> {m.text}
    </span>
  );
}

/** Compact numeric formatting for the series cells. */
function fmt(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1e6 || a < 1e-4) return n.toExponential(3);
  return Number(n.toPrecision(6)).toString();
}
