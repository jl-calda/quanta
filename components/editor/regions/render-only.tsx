"use client";

import { useMemo } from "react";
import { evaluateTable, type TableSpec } from "@/lib/calc";
import type { RenderOnlyRegion, TableRegion } from "@/lib/worksheet/content";
import { Icon, type IconName } from "../icons";
import { TablePresent } from "./table-present";
import type { RegionRenderProps } from "./types";

/**
 * Render-only region types for this pass: tables, plots, images, controls,
 * includes, solve blocks. They render faithfully from their (open, non-lossy)
 * payloads; deep payload editing is a follow-up. A region with no payload yet
 * shows an intentional, labelled card rather than a blank gap.
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

export function PlotRegionView({ region }: RegionRenderProps<RenderOnlyRegion>) {
  const data = region as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title : null;
  return (
    <div style={{ ...cardStyle, maxWidth: 560 }}>
      {title && <div style={{ font: "600 12.5px/1.2 var(--font-sans)", marginBottom: 8 }}>{title}</div>}
      <svg width="100%" viewBox="0 0 470 200" style={{ display: "block" }} aria-label="Plot">
        <line x1="46" y1="166" x2="454" y2="166" stroke="var(--border-strong)" strokeWidth="1.2" />
        <line x1="46" y1="166" x2="46" y2="14" stroke="var(--border-strong)" strokeWidth="1.2" />
        {[40, 80, 120].map((y) => (
          <line key={y} x1="46" y1={y} x2="454" y2={y} stroke="var(--border-hairline)" strokeWidth="1" />
        ))}
        <path d="M46 150 L160 90 L260 60 L360 44 L454 40" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ font: "11.5px/1.3 var(--font-sans)", color: "var(--text-muted)", marginTop: 6 }}>
        Configure traces and axes in the inspector.
      </div>
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

export function ControlRegionView({ region }: RegionRenderProps<RenderOnlyRegion>) {
  const data = region as Record<string, unknown>;
  const kind = typeof data.kind === "string" ? data.kind : "control";
  const bind = typeof data.bind === "string" ? data.bind : "—";
  return (
    <div style={{ ...cardStyle, display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span style={{ color: "var(--text-muted)", display: "inline-flex" }}><Icon name="control" size={16} /></span>
      <span style={{ font: "12.5px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>
        {kind} → <span style={{ fontFamily: "var(--font-math)", fontStyle: "italic" }}>{bind}</span>
      </span>
    </div>
  );
}

export function GenericRegionView({ region }: RegionRenderProps<RenderOnlyRegion>) {
  const icon: IconName = region.type === "solve" ? "solve" : "link";
  const label = region.type === "solve" ? "Solve block" : "Included worksheet";
  return <Placeholder icon={icon} label={label} hint="Configure in the inspector." />;
}
