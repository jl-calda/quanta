"use client";

import "katex/dist/katex.min.css";
import "./editor.css";
import { useMemo } from "react";
import type { Row, WorksheetContent } from "@/lib/worksheet/content";
import type { RegionResult } from "@/lib/calc";
import { snapshotResults } from "@/lib/worksheet/flatten";
import { RegionNode } from "./history/history-region";

export interface ContentSnapshotInnerProps {
  /** Parsed content tree (the wrapper validates + gates emptiness before mounting). */
  content: WorksheetContent;
  /** Downscale applied to the page-scale render (cards ~0.6, dashboard mini ~0.42). */
  scale?: number;
  /** Inner padding in px (at scale 1). */
  padding?: number;
  /** Cap on rendered rows — a top crop that bounds DOM/typeset cost per card. */
  maxRows?: number;
}

/**
 * The heavy half of {@link ContentSnapshot}: evaluate the tree with the pure
 * engine and render its regions read-only (reusing the history viewer's
 * provider-free `RegionNode` — math typeset via KaTeX with result chips), scaled
 * and clipped into the card. Loaded lazily (it pulls in mathjs + KaTeX) so those
 * deps never enter the gallery / files / dashboard initial bundles. Opaque paper
 * background, so once mounted it covers the procedural fallback beneath it.
 */
export function ContentSnapshotInner({
  content,
  scale = 0.6,
  padding = 14,
  maxRows = 8,
}: ContentSnapshotInnerProps) {
  const results = useMemo(() => snapshotResults(content), [content]);
  const rows = content.rows.slice(0, maxRows);

  return (
    <div
      className="q-grid-mini"
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--surface-paper)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${100 / scale}%`,
          padding,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          // Inert: a thumbnail never receives interaction.
          pointerEvents: "none",
        }}
      >
        {rows.map((row) => (
          <SnapshotRow key={row.id} row={row} results={results} />
        ))}
      </div>
    </div>
  );
}

/** A row of the snapshot — 1 column, or N columns with the page's split ratios
 *  (mirrors `history-page-view.PageRow`, read-only). */
function SnapshotRow({ row, results }: { row: Row; results: Map<string, RegionResult> }) {
  if (row.columns === 1) {
    return (
      <div>
        {row.cells[0]?.regions.map((r) => (
          <RegionNode key={r.id} region={r} diff={null} results={results} />
        ))}
      </div>
    );
  }

  const template =
    row.split && row.split.length === row.columns
      ? row.split.map((n) => `${n}fr`).join(" ")
      : `repeat(${row.columns}, 1fr)`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: template, columnGap: 20 }}>
      {row.cells.map((cell, ci) => (
        <div
          key={ci}
          style={{
            paddingLeft: ci ? 16 : 0,
            borderLeft: ci ? "1px dashed var(--border-strong)" : "none",
          }}
        >
          {cell.regions.map((r) => (
            <RegionNode key={r.id} region={r} diff={null} results={results} />
          ))}
        </div>
      ))}
    </div>
  );
}
