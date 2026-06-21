"use client";

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Dispatch } from "react";
import type { PlotResult } from "@/lib/calc";
import type { PlotAxis, PlotRegion } from "@/lib/worksheet/content";
import { useEditor } from "../state/editor-provider";
import type { EditorAction } from "../state/editor-reducer";
import { IconButton } from "@/components/ds";
import { Icon } from "../icons";
import {
  ContourEmptyState,
  ContourFigure,
  PlotEmptyState,
  PlotFigure,
  PlotLegend,
  PlotPlaceholder,
} from "./plot-present";
import type { RegionRenderProps } from "./types";

/**
 * Plot region (Functional Brief §6.4, mockup `plot-region.html`). Binds traces
 * to expressions / ranges / table columns, sampled by the pure `evaluatePlot`
 * engine (read from the provider so it stays reactive on recalc) and drawn by the
 * shared `PlotFigure`. This view owns the editing chrome: an inline-editable
 * title, editable + draggable axis ranges, a hover read-out, and legend toggles.
 * contour/3D are selectable now but render the typed 'configure' placeholder.
 */
export function PlotRegionView({ region, canEdit, dispatch }: RegionRenderProps<PlotRegion>) {
  const { plotResults } = useEditor();
  const result = plotResults.get(region.id);

  // 3D surface stays a typed 'configure' placeholder this pass.
  if (region.kind === "surface") return <PlotPlaceholder region={region} />;
  // Contour: real iso-bands once z = f(x, y) + an x/y range are set, else a hint.
  if (region.kind === "contour") {
    if (!result?.contour) return <ContourEmptyState region={region} />;
    return <ContourEditor region={region} result={result} canEdit={canEdit} dispatch={dispatch} />;
  }
  // No traces yet ⇒ the "pick variables" empty state (mockup (c)).
  if (region.traces.length === 0) return <PlotEmptyState />;
  if (!result) return <PlotEmptyState />;

  return <PlotEditor region={region} result={result} canEdit={canEdit} dispatch={dispatch} />;
}

/**
 * Contour editing chrome — an inline-editable title, x/y range controls, and the
 * shared `ContourFigure` (iso-bands). No trace legend / hover read-out: the field
 * is a z = f(x, y) surface, so the figure carries its own colour scale.
 */
function ContourEditor({
  region,
  result,
  canEdit,
  dispatch,
}: {
  region: PlotRegion;
  result: PlotResult;
  canEdit: boolean;
  dispatch: Dispatch<EditorAction>;
}) {
  const { state, dispatch: rawDispatch } = useEditor();

  const setAxis = (axis: "x" | "y", patch: Partial<PlotAxis>) =>
    dispatch({ type: "SET_PLOT_AXIS", id: region.id, axis, patch });

  const openInspector = () => {
    dispatch({ type: "SELECT", id: region.id });
    if (!state.ui.rightOpen) rawDispatch({ type: "TOGGLE_RIGHT" });
  };

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
      {/* title row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <TitleInput
          key={region.id}
          value={region.title ?? ""}
          canEdit={canEdit}
          onCommit={(title) => dispatch({ type: "SET_REGION_PROP", id: region.id, patch: { title: title || undefined } })}
        />
        {canEdit && <span style={{ display: "inline-flex", color: "var(--text-muted)", flex: "0 0 auto" }}><Icon name="sketch" size={13} /></span>}
        <IconButton label="Plot settings" size="sm" onClick={openInspector}>
          <Icon name="gear" size={16} />
        </IconButton>
        <IconButton label="More" size="sm" onClick={() => dispatch({ type: "SELECT", id: region.id })}>
          <Icon name="kebab" size={16} />
        </IconButton>
      </div>

      {/* axis range controls */}
      {canEdit && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6, padding: "0 2px", flexWrap: "wrap" }}>
          <AxisRange label="x range" axis={region.x} onMin={(v) => setAxis("x", { min: v })} onMax={(v) => setAxis("x", { max: v })} />
          <AxisRange label="y range" axis={region.y} onMin={(v) => setAxis("y", { min: v })} onMax={(v) => setAxis("y", { max: v })} />
        </div>
      )}

      {/* the contour */}
      <div style={{ border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-sm)", padding: "8px 8px 2px", background: "var(--surface-paper)" }}>
        <ContourFigure result={result} region={region} />
      </div>
    </div>
  );
}

function PlotEditor({
  region,
  result,
  canEdit,
  dispatch,
}: {
  region: PlotRegion;
  result: PlotResult;
  canEdit: boolean;
  dispatch: Dispatch<EditorAction>;
}) {
  const { state, dispatch: rawDispatch } = useEditor();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const setAxis = (axis: "x" | "y", patch: Partial<PlotAxis>) =>
    dispatch({ type: "SET_PLOT_AXIS", id: region.id, axis, patch });

  // Drag-pan: pin the current (auto-or-fixed) range, then shift both ends.
  const pan = (axis: "x" | "y", delta: number) => {
    const cur = region[axis];
    const lo = cur.min ?? result.bounds[axis === "x" ? "xMin" : "yMin"];
    const hi = cur.max ?? result.bounds[axis === "x" ? "xMax" : "yMax"];
    setAxis(axis, { min: round(lo + delta), max: round(hi + delta) });
  };

  const openInspector = () => {
    dispatch({ type: "SELECT", id: region.id });
    if (!state.ui.rightOpen) rawDispatch({ type: "TOGGLE_RIGHT" });
  };

  const sweepNoRange = !region.xData && (region.x.min == null || region.x.max == null) && region.kind !== "polar";
  const boundLabel = region.traces[0]?.expr ? prettyExpr(region.traces[0].expr) : null;

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
      {/* title row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <TitleInput
          key={region.id}
          value={region.title ?? ""}
          canEdit={canEdit}
          onCommit={(title) => dispatch({ type: "SET_REGION_PROP", id: region.id, patch: { title: title || undefined } })}
        />
        {canEdit && <span style={{ display: "inline-flex", color: "var(--text-muted)", flex: "0 0 auto" }}><Icon name="sketch" size={13} /></span>}
        <IconButton label="Plot settings" size="sm" onClick={openInspector}>
          <Icon name="gear" size={16} />
        </IconButton>
        <IconButton label="More" size="sm" onClick={() => dispatch({ type: "SELECT", id: region.id })}>
          <Icon name="kebab" size={16} />
        </IconButton>
      </div>

      {/* axis range controls */}
      {canEdit && region.kind !== "polar" && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6, padding: "0 2px", flexWrap: "wrap" }}>
          <AxisRange label="x range" axis={region.x} onMin={(v) => setAxis("x", { min: v })} onMax={(v) => setAxis("x", { max: v })} />
          <AxisRange label="y range" axis={region.y} onMin={(v) => setAxis("y", { min: v })} onMax={(v) => setAxis("y", { max: v })} />
        </div>
      )}

      {/* the plot */}
      <div style={{ border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-sm)", padding: "8px 8px 2px", background: "var(--surface-paper)" }}>
        <PlotFigure
          result={result}
          region={region}
          hoverIndex={canEdit ? hoverIndex : null}
          onHoverIndex={canEdit ? setHoverIndex : undefined}
          onPan={canEdit ? pan : undefined}
        />
        {sweepNoRange && (
          <div style={{ font: "10.5px/1.4 var(--font-sans)", color: "var(--text-muted)", textAlign: "center", padding: "4px 0 6px" }}>
            Set an x range to plot <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{region.xVar}</span>.
          </div>
        )}
      </div>

      {/* legend */}
      <PlotLegend
        traces={result.traces}
        boundLabel={boundLabel}
        onToggle={canEdit ? (id) => dispatch({ type: "TOGGLE_PLOT_TRACE", id: region.id, traceId: id }) : undefined}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Inline title (commit on blur / Enter)
 * ------------------------------------------------------------------ */

function TitleInput({ value, canEdit, onCommit }: { value: string; canEdit: boolean; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  if (!canEdit) {
    return (
      <span style={{ flex: 1, minWidth: 0, font: "600 13px/1.3 var(--font-sans)", color: "var(--text-primary)", padding: "3px 6px" }}>
        {value || "Untitled plot"}
      </span>
    );
  }
  return (
    <input
      value={draft}
      placeholder="Untitled plot"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      style={{
        flex: 1,
        minWidth: 0,
        border: "1px solid transparent",
        borderRadius: "var(--radius-sm)",
        background: "transparent",
        font: "600 13px/1.3 var(--font-sans)",
        color: "var(--text-primary)",
        padding: "3px 6px",
        outline: "none",
      }}
      onFocus={(e) => {
        e.currentTarget.style.background = "var(--surface-paper)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onBlurCapture={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Axis range control (min – max [unit])
 * ------------------------------------------------------------------ */

function AxisRange({
  label,
  axis,
  onMin,
  onMax,
}: {
  label: string;
  axis: PlotAxis;
  onMin: (v: number | undefined) => void;
  onMax: (v: number | undefined) => void;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "10.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
      {label} <RangeInput value={axis.min} onCommit={onMin} /> <span>–</span> <RangeInput value={axis.max} onCommit={onMax} />
      {axis.unit ? <span style={{ fontFamily: "var(--font-mono)" }}>{axis.unit}</span> : null}
    </span>
  );
}

function RangeInput({ value, onCommit }: { value: number | undefined; onCommit: (v: number | undefined) => void }) {
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  useEffect(() => setDraft(value != null ? String(value) : ""), [value]);

  const commit = () => {
    const t = draft.trim();
    if (t === "") return onCommit(undefined);
    const n = Number(t);
    if (Number.isFinite(n)) onCommit(n);
    else setDraft(value != null ? String(value) : "");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      setDraft(value != null ? String(value) : "");
      e.currentTarget.blur();
    }
  };
  return <input className="rng-input" style={rngStyle} value={draft} placeholder="auto" onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={onKey} />;
}

const rngStyle: CSSProperties = {
  width: 46,
  height: 22,
  padding: "0 5px",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-sm)",
  background: "var(--surface-raised)",
  font: "11px/1 var(--font-mono)",
  color: "var(--text-primary)",
  outline: "none",
  textAlign: "right",
};

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

function round(v: number): number {
  return Number(v.toPrecision(6));
}

/** Light prettify for the legend's "bound to" label (`2*x^2` → `2·x²`). */
function prettyExpr(expr: string): string {
  return expr
    .replace(/\*/g, "·")
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³");
}
