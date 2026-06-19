"use client";

import { useMemo } from "react";
import { evaluatePlot, evaluateTable, type PlotSpec, type TableSpec } from "@/lib/calc";
import type { PlotRegion, RenderOnlyRegion, TableRegion } from "@/lib/worksheet/content";
import { Icon, type IconName } from "../icons";
import { TablePresent } from "./table-present";
import { PlotEmptyState, PlotFigure, PlotLegend, PlotPlaceholder } from "./plot-present";
import type { RegionRenderProps } from "./types";

/**
 * Render-only region types for this pass: tables, plots, images, includes,
 * solve blocks. They render faithfully from their (open, non-lossy) payloads;
 * deep payload editing is a follow-up. A region with no payload yet shows an
 * intentional, labelled card rather than a blank gap. (Input controls are now a
 * typed, interactive region — see `control-region.tsx`.)
 */

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--border-hairline)",
  borderRadius: "var(--radius-md)",
  background: "var(--surface-raised)",
  padding: "10px 12px",
};

function Placeholder({ icon, label, hint }: { icon: IconName; label: string; hint: string }) {
  return (
    <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 10, maxWidth: 460 }}>
      <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>
        <Icon name={icon} size={18} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ font: "600 12.5px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>{label}</span>
        <span style={{ font: "11.5px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>{hint}</span>
      </div>
    </div>
  );
}

/**
 * Read-only table for snapshots/history (no EditorProvider). Evaluates the typed
 * table with the pure engine and renders the shared clean read mode. Worksheet
 * cross-references aren't resolved here (no live scope), so such cells show their
 * inline error — acceptable for a static snapshot; the live editor binds scope.
 */
export function TableRegionView({ region }: RegionRenderProps<TableRegion>) {
  const result = useMemo(() => evaluateTable(region as TableSpec, {}), [region]);
  if (region.columns.length === 0) {
    return <Placeholder icon="table" label="Table" hint="Add columns and rows from the inspector." />;
  }
  return <TablePresent region={region} result={result} />;
}

/**
 * Static (provider-free) plot for read-only contexts — history snapshots and any
 * non-editor render. Samples through the same pure `evaluatePlot`; with no live
 * worksheet scope here, plot-by-formula traces (`2·x²`) still draw, while traces
 * bound to worksheet names show their inline error (acceptable for a snapshot).
 */
export function PlotRegionView({ region }: RegionRenderProps<PlotRegion>) {
  const result = useMemo(() => evaluatePlot(region as PlotSpec, {}), [region]);
  if (region.kind === "contour" || region.kind === "surface") return <PlotPlaceholder region={region} />;
  if (region.traces.length === 0) return <PlotEmptyState />;
  return (
    <div style={{ maxWidth: 560 }}>
      {region.title && <div style={{ font: "600 13px/1.3 var(--font-sans)", color: "var(--text-primary)", marginBottom: 8 }}>{region.title}</div>}
      <div style={{ border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-sm)", padding: "8px 8px 2px", background: "var(--surface-paper)" }}>
        <PlotFigure result={result} region={region} />
      </div>
      <PlotLegend traces={result.traces} boundLabel={region.traces[0]?.expr ?? null} />
    </div>
  );
}

export function ImageRegionView({ region }: RegionRenderProps<RenderOnlyRegion>) {
  const data = region as Record<string, unknown>;
  const src = typeof data.src === "string" ? data.src : null;
  if (!src) return <Placeholder icon="image" label="Image" hint="Add an image from the inspector." />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={typeof data.alt === "string" ? data.alt : ""} style={{ maxWidth: 560, borderRadius: "var(--radius-md)", border: "1px solid var(--border-hairline)" }} />;
}

export function GenericRegionView({ region }: RegionRenderProps<RenderOnlyRegion>) {
  const icon: IconName = region.type === "solve" ? "solve" : "link";
  const label = region.type === "solve" ? "Solve block" : "Included worksheet";
  return <Placeholder icon={icon} label={label} hint="Configure in the inspector." />;
}
