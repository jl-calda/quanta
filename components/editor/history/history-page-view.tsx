"use client";

import { useMemo, type CSSProperties } from "react";
import type { Row, WorksheetContent } from "@/lib/worksheet/content";
import { SI_SYSTEM, evaluateSheet, registerUserUnits, type RegionResult } from "@/lib/calc";
import { flattenToRegionInputs, mapResults, walkRegions } from "@/lib/worksheet/flatten";
import { diffContents, type DiffStatus } from "@/lib/worksheet/diff";
import { DiffRegion, LeafRegion, RegionNode } from "./history-region";

/** Compute read-only engine results for a content snapshot (pure, synchronous).
 *  Custom units are registered so a snapshot that uses them still resolves; the
 *  history view renders in SI display. */
function resultsFor(content: WorksheetContent): Map<string, RegionResult> {
  registerUserUnits(content.units?.defs ?? []);
  return mapResults(evaluateSheet(flattenToRegionInputs(content), { unitSystem: SI_SYSTEM }));
}

/**
 * A worksheet snapshot rendered read-only as a page, diffed against a reference
 * (the older version). Regions present in the snapshot carry added/changed/same
 * chrome; when `showRemoved` is set, regions only in the reference are appended
 * with strikethrough.
 */
export function HistoryPageView({
  content,
  refContent,
  title,
  narrow = false,
  showRemoved = false,
}: {
  content: WorksheetContent;
  refContent: WorksheetContent | null;
  title: string;
  narrow?: boolean;
  showRemoved?: boolean;
}) {
  const results = useMemo(() => resultsFor(content), [content]);
  const diff = useMemo(
    () => (refContent ? diffContents(refContent, content) : null),
    [refContent, content],
  );

  const refResults = useMemo(() => (refContent ? resultsFor(refContent) : null), [refContent]);
  const removed = useMemo(() => {
    if (!showRemoved || !refContent || !diff) return [];
    // Skip areas to avoid double-listing their children (each region is yielded
    // separately by walkRegions).
    return [...walkRegions(refContent)].filter(
      (r) => r.type !== "area" && diff.get(r.id) === "removed",
    );
  }, [showRemoved, refContent, diff]);

  const empty = content.rows.every((row) => row.cells.every((c) => c.regions.length === 0));

  return (
    <article className={"vh-page" + (narrow ? " narrow" : "")}>
      <Band right={title} />
      <div className="q-grid" style={{ padding: "22px 30px 30px", display: "flex", flexDirection: "column", gap: 6 }}>
        {empty ? (
          <p style={{ font: "13px/1.5 var(--font-sans)", color: "var(--text-muted)", fontStyle: "italic" }}>
            No regions in this version.
          </p>
        ) : (
          content.rows.map((row) => <PageRow key={row.id} row={row} diff={diff} results={results} />)
        )}

        {removed.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                font: "600 11px/1 var(--font-sans)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--status-error)",
              }}
            >
              Removed in this version
            </div>
            {removed.map((region) => (
              <DiffRegion key={region.id} status="removed">
                <LeafRegion region={region} result={refResults?.get(region.id)} />
              </DiffRegion>
            ))}
          </div>
        )}
      </div>
      <Band footer />
    </article>
  );
}

function PageRow({
  row,
  diff,
  results,
}: {
  row: Row;
  diff: Map<string, DiffStatus> | null;
  results: Map<string, RegionResult>;
}) {
  if (row.columns === 1) {
    return (
      <div>
        {row.cells[0]?.regions.map((r) => (
          <RegionNode key={r.id} region={r} diff={diff} results={results} />
        ))}
      </div>
    );
  }

  const template =
    row.split && row.split.length === row.columns
      ? row.split.map((n) => `${n}fr`).join(" ")
      : `repeat(${row.columns}, 1fr)`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: template, marginTop: 2 }}>
      {row.cells.map((cell, ci) => (
        <div
          key={ci}
          style={{
            paddingLeft: ci ? 26 : 0,
            paddingRight: ci < row.columns - 1 ? 26 : 0,
            borderLeft: ci ? "1px dashed var(--border-strong)" : "none",
          }}
        >
          {cell.regions.map((r) => (
            <RegionNode key={r.id} region={r} diff={diff} results={results} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Band({ right, footer }: { right?: string; footer?: boolean }) {
  const style: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "7px 28px",
    [footer ? "borderTop" : "borderBottom"]: "1px solid var(--border-hairline)",
    font: "10px/1 var(--font-sans)",
    letterSpacing: footer ? undefined : "0.06em",
    textTransform: footer ? undefined : "uppercase",
    color: "var(--text-muted)",
  };
  return (
    <div style={style}>
      <span>Quanta</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>
        {footer ? "Page 1" : right}
      </span>
    </div>
  );
}
