"use client";

import type { Dispatch, ReactNode } from "react";
import { Badge, IconButton, Input, Select, Switch } from "@/components/ds";
import { findRegion } from "@/lib/worksheet/flatten";
import type {
  CellAlign,
  ControlKind,
  ControlOption,
  ControlRegion,
  ControlValueType,
  MathRegion,
  Notation,
  PlotAxis,
  PlotKind,
  PlotRegion,
  PlotTrace,
  ProgramRegion,
  Radix,
  Region,
  SolveAlgorithm,
  SolveGuess,
  SolveRegion,
  TableColumn,
  TableRegion,
  TextRegion,
  TraceStyle,
} from "@/lib/worksheet/content";
import { DEFAULT_DISPLAY } from "@/lib/worksheet/content";
import { parseProgramBody, programBodyToText } from "@/lib/worksheet/program-text";
import { useEditor } from "./state/editor-provider";
import type { EditorAction, RegionPatch, TableColumnPatch } from "./state/editor-reducer";
import { Icon } from "./icons";

/**
 * Inspector — two-way binds to the selected region's properties: result format,
 * target unit, show-steps display flags, conditional formatting, and region
 * chrome (border, tag). Read-only roles see the values but can't change them.
 */
export function Inspector() {
  const { state, dispatch, canEdit } = useEditor();
  const open = state.ui.rightOpen;
  const region = state.selectedId ? findRegion(state.content, state.selectedId) : undefined;

  if (!open) {
    return (
      <div style={{ width: 32, flex: "0 0 32px", borderLeft: "1px solid var(--border-hairline)", background: "var(--surface-chrome)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
        <IconButton label="Show inspector" onClick={() => dispatch({ type: "TOGGLE_RIGHT" })}>
          <Icon name="chevL" size={17} />
        </IconButton>
      </div>
    );
  }

  const set = (patch: RegionPatch) => region && dispatch({ type: "SET_REGION_PROP", id: region.id, patch });

  return (
    <aside style={{ width: 286, flex: "0 0 286px", borderLeft: "1px solid var(--border-hairline)", background: "var(--surface-chrome)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border-hairline)" }}>
        <span style={{ font: "600 13px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>Inspector</span>
        {region && <Badge tone="accent">{regionLabel(region.type)}</Badge>}
        <IconButton label="Hide inspector" size="sm" style={{ marginLeft: "auto" }} onClick={() => dispatch({ type: "TOGGLE_RIGHT" })}>
          <Icon name="chevR" size={16} />
        </IconButton>
      </div>

      {!region ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <span style={{ font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>Select a region to inspect its format, units, and display.</span>
        </div>
      ) : (
        <div className="scroll-y" style={{ flex: 1, minHeight: 0, pointerEvents: canEdit ? "auto" : "none", opacity: canEdit ? 1 : 0.7 }}>
          {region.type === "math" && <MathInspector region={region} set={set} />}
          {region.type === "text" && <TextInspector region={region} set={set} />}
          {region.type === "table" && <TableInspector region={region} set={set} dispatch={dispatch} />}
          {region.type === "plot" && <PlotInspector region={region} set={set} dispatch={dispatch} />}
          {region.type === "control" && <ControlInspector region={region} set={set} />}
          {region.type === "solve" && <SolveInspector region={region} set={set} />}
          {region.type === "program" && <ProgramInspector region={region} set={set} />}
          <Group eyebrow="Region">
            <Row label="Show border">
              <Switch checked={!!region.border} onChange={(e) => set({ border: e.target.checked })} />
            </Row>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>Tag / label</span>
              <Input mono defaultValue={region.tag ?? ""} prefix="#" onBlur={(e) => set({ tag: e.target.value || undefined })} />
            </div>
          </Group>
        </div>
      )}
    </aside>
  );
}

function MathInspector({ region, set }: { region: MathRegion; set: (p: RegionPatch) => void }) {
  const fmt = region.format ?? {};
  const display = { ...DEFAULT_DISPLAY, ...(region.display ?? {}) };
  const radix = (fmt.radix ?? "dec") as Radix;
  return (
    <>
      <Group eyebrow="Result format">
        <Row label="Decimal places">
          <Stepper value={fmt.decimals ?? 2} set={(v) => set({ format: { ...fmt, decimals: v } })} />
        </Row>
        <Row label="Significant figures">
          <div style={{ width: 96 }}>
            <Select
              value={fmt.sigfigs ? String(fmt.sigfigs) : "auto"}
              onChange={(e) => set({ format: { ...fmt, sigfigs: e.target.value === "auto" ? undefined : Number(e.target.value) } })}
              options={[{ value: "auto", label: "Auto" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" }]}
            />
          </div>
        </Row>
        <Row label="Notation">
          <div style={{ width: 120 }}>
            <Select
              value={fmt.notation ?? "auto"}
              onChange={(e) => set({ format: { ...fmt, notation: e.target.value as Notation } })}
              options={[{ value: "auto", label: "Auto" }, { value: "sci", label: "Scientific" }, { value: "eng", label: "Engineering" }]}
            />
          </div>
        </Row>
        <Row label="Radix">
          <Segmented options={["dec", "bin", "oct", "hex"]} value={radix} set={(v) => set({ format: { ...fmt, radix: v as Radix } })} />
        </Row>
      </Group>

      <Group eyebrow="Units">
        <Row label="Target unit">
          <div style={{ width: 110 }}>
            <Input mono defaultValue={region.unit ?? ""} placeholder="kN" onBlur={(e) => set({ unit: e.target.value || undefined })} />
          </div>
        </Row>
        <div style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>Auto-converts from base SI. Mismatches flag inline.</div>
      </Group>

      <Group eyebrow="Display — show steps">
        {(["name", "formula", "substituted", "result"] as const).map((flag) => (
          <Row key={flag} label={flag === "substituted" ? "Substituted values" : flag[0].toUpperCase() + flag.slice(1)}>
            <Switch checked={display[flag]} onChange={(e) => set({ display: { ...display, [flag]: e.target.checked } })} />
          </Row>
        ))}
      </Group>

      <Group eyebrow="Conditional format">
        {(region.conditional ?? []).map((rule, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)", background: "var(--surface-raised)" }}>
            <span style={{ font: "12px/1.3 var(--font-mono)", color: "var(--text-primary)", flex: 1 }}>if result {rule.op} {String(rule.value)} →</span>
            {rule.style.label && <span style={{ font: "11px/1 var(--font-sans)", color: rule.style.color ?? "var(--status-error)" }}>{rule.style.label}</span>}
            <IconButton label="Remove rule" size="sm" onClick={() => set({ conditional: (region.conditional ?? []).filter((_, j) => j !== i) })}>
              <Icon name="varsX" size={14} />
            </IconButton>
          </div>
        ))}
        <button
          onClick={() => set({ conditional: [...(region.conditional ?? []), { op: ">", value: 1, style: { color: "var(--status-error)", label: "FAIL" } }] })}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, alignSelf: "flex-start", border: "none", background: "none", color: "var(--accent)", font: "500 12px/1 var(--font-sans)", cursor: "pointer", padding: 0 }}
        >
          <Icon name="plusSm" size={13} /> Add rule
        </button>
      </Group>
    </>
  );
}

function TextInspector({ region, set }: { region: TextRegion; set: (p: RegionPatch) => void }) {
  return (
    <Group eyebrow="Text">
      <Row label="Style">
        <div style={{ width: 120 }}>
          <Select
            value={region.heading ? String(region.heading) : "body"}
            onChange={(e) => set({ heading: e.target.value === "body" ? undefined : (Number(e.target.value) as 1 | 2 | 3) })}
            options={[{ value: "body", label: "Body" }, { value: "1", label: "Heading 1" }, { value: "2", label: "Heading 2" }, { value: "3", label: "Heading 3" }]}
          />
        </div>
      </Row>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>Eyebrow</span>
        <Input defaultValue={region.eyebrow ?? ""} placeholder="Optional label" onBlur={(e) => set({ eyebrow: e.target.value || undefined })} />
      </div>
    </Group>
  );
}

function TableInspector({
  region,
  set,
  dispatch,
}: {
  region: TableRegion;
  set: (p: RegionPatch) => void;
  dispatch: Dispatch<EditorAction>;
}) {
  const setCol = (key: string, patch: TableColumnPatch) =>
    dispatch({ type: "SET_TABLE_COLUMN", id: region.id, key, patch });
  return (
    <>
      <Group eyebrow="Table">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>Named range</span>
          <Input mono defaultValue={region.name ?? ""} placeholder="anchor_schedule" onBlur={(e) => set({ name: e.target.value || undefined })} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>Read-mode title</span>
          <Input defaultValue={region.eyebrow ?? ""} placeholder={region.name ?? "Optional title"} onBlur={(e) => set({ eyebrow: e.target.value || undefined })} />
        </div>
        <div style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
          Cells hold values or <code style={{ fontFamily: "var(--font-mono)" }}>=formulas</code> with A1 (
          <code style={{ fontFamily: "var(--font-mono)" }}>A2</code>), named-range, and worksheet references.
        </div>
      </Group>

      <Group eyebrow="Columns">
        {region.columns.map((col) => (
          <ColumnEditor
            key={col.key}
            col={col}
            setCol={setCol}
            onDelete={() => dispatch({ type: "DELETE_TABLE_COLUMN", id: region.id, key: col.key })}
            canDelete={region.columns.length > 1}
          />
        ))}
        <button
          onClick={() => dispatch({ type: "ADD_TABLE_COLUMN", id: region.id })}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, alignSelf: "flex-start", border: "none", background: "none", color: "var(--accent)", font: "500 12px/1 var(--font-sans)", cursor: "pointer", padding: 0 }}
        >
          <Icon name="plusSm" size={13} /> Add column
        </button>
      </Group>
    </>
  );
}

const FAIL_RULE = { op: ">" as const, value: 1, style: { color: "var(--status-error)", fill: "var(--status-error-bg)", label: "FAIL" } };
const PASS_RULE = { op: "<=" as const, value: 1, style: { color: "var(--status-pass)", fill: "var(--status-pass-bg)", label: "OK" } };

function ColumnEditor({
  col,
  setCol,
  onDelete,
  canDelete,
}: {
  col: TableColumn;
  setCol: (key: string, patch: TableColumnPatch) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const fmt = col.format ?? {};
  const rules = col.conditional ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "9px 10px", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)", background: "var(--surface-raised)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Input defaultValue={col.label} placeholder="Label" onBlur={(e) => setCol(col.key, { label: e.target.value })} containerStyle={{ flex: 1 }} />
        <div style={{ width: 66 }}>
          <Input mono defaultValue={col.unit ?? ""} placeholder="unit" onBlur={(e) => setCol(col.key, { unit: e.target.value || undefined })} />
        </div>
        <IconButton label="Delete column" size="sm" disabled={!canDelete} onClick={onDelete}>
          <Icon name="x" size={14} />
        </IconButton>
      </div>
      <Row label="Align">
        <Segmented options={["left", "center", "right"]} value={col.align ?? ""} set={(v) => setCol(col.key, { align: v as CellAlign })} />
      </Row>
      <Row label="Decimals">
        <Stepper value={fmt.decimals ?? 2} set={(v) => setCol(col.key, { format: { ...fmt, decimals: v } })} />
      </Row>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rules.map((rule, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ font: "11.5px/1.3 var(--font-mono)", color: "var(--text-primary)", flex: 1 }}>
              if {rule.op} {String(rule.value)} → {rule.style.label}
            </span>
            <IconButton label="Remove rule" size="sm" onClick={() => setCol(col.key, { conditional: rules.filter((_, j) => j !== i) })}>
              <Icon name="varsX" size={14} />
            </IconButton>
          </div>
        ))}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => setCol(col.key, { conditional: [...rules, FAIL_RULE] })} style={ruleBtn}>
            <Icon name="plusSm" size={12} /> Fail &gt; rule
          </button>
          <button onClick={() => setCol(col.key, { conditional: [...rules, PASS_RULE] })} style={ruleBtn}>
            <Icon name="plusSm" size={12} /> Pass ≤ rule
          </button>
        </div>
      </div>
    </div>
  );
}

const ruleBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  border: "none",
  background: "none",
  color: "var(--accent)",
  font: "500 11.5px/1 var(--font-sans)",
  cursor: "pointer",
  padding: 0,
};

/* ------------------------------------------------------------------ *
 * Plot inspector — type, axes, traces, and (contour/3D) surface config
 * ------------------------------------------------------------------ */

const TRACE_STYLES: { value: TraceStyle; label: string }[] = [
  { value: "line", label: "Line" },
  { value: "scatter", label: "Scatter" },
  { value: "line-marker", label: "Line + markers" },
  { value: "column", label: "Column" },
  { value: "bar", label: "Bar" },
  { value: "stem", label: "Stem" },
  { value: "area", label: "Area" },
  { value: "error", label: "Error" },
  { value: "waterfall", label: "Waterfall" },
  { value: "box", label: "Box" },
];

function PlotInspector({
  region,
  set,
  dispatch,
}: {
  region: PlotRegion;
  set: (p: RegionPatch) => void;
  dispatch: Dispatch<EditorAction>;
}) {
  const setAxis = (axis: "x" | "y", patch: Partial<PlotAxis>) =>
    dispatch({ type: "SET_PLOT_AXIS", id: region.id, axis, patch });
  const setTrace = (traceId: string, patch: Partial<PlotTrace>) =>
    dispatch({ type: "SET_PLOT_TRACE", id: region.id, traceId, patch });
  const is2D = region.kind === "contour" || region.kind === "surface";

  return (
    <>
      <Group eyebrow="Plot type">
        <PlotTypeGrid value={region.kind} onChange={(kind) => set({ kind })} />
      </Group>

      <Group eyebrow="Independent variable">
        <Row label={region.kind === "polar" ? "Angle θ" : "x variable"}>
          <div style={{ width: 96 }}>
            <Input key={`${region.id}:xvar`} mono defaultValue={region.xVar} placeholder="x" onBlur={(e) => set({ xVar: e.target.value.trim() || "x" })} />
          </div>
        </Row>
        {is2D && (
          <Row label="y variable">
            <div style={{ width: 96 }}>
              <Input key={`${region.id}:yvar`} mono defaultValue={region.yVar} placeholder="y" onBlur={(e) => set({ yVar: e.target.value.trim() || "y" })} />
            </div>
          </Row>
        )}
        {!is2D && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>X data (optional)</span>
            <Input key={`${region.id}:xdata`} mono defaultValue={region.xData ?? ""} placeholder="e.g. anchor_dia" onBlur={(e) => set({ xData: e.target.value.trim() })} />
            <span style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
              Set to plot against a range / table column; leave blank to sweep the x range.
            </span>
          </div>
        )}
      </Group>

      <AxisInspector eyebrow={is2D ? "X axis" : "X axis (sweep)"} region={region} axisKey="x" axis={region.x} setAxis={setAxis} />
      <AxisInspector eyebrow="Y axis" region={region} axisKey="y" axis={region.y} setAxis={setAxis} />

      {is2D ? (
        <Group eyebrow="Surface — z = f(x, y)">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>z expression</span>
            <Input key={`${region.id}:zexpr`} mono defaultValue={region.z?.expr ?? ""} placeholder="sin(x)·cos(y)" onBlur={(e) => set({ z: { ...region.z, expr: e.target.value } })} />
          </div>
          <Row label="Grid resolution">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 54 }}>
                <Input key={`${region.id}:gx`} mono defaultValue={String(region.grid?.x ?? 24)} onBlur={(e) => set({ grid: { x: clampGrid(e.target.value, region.grid?.x ?? 24), y: region.grid?.y ?? 24 } })} />
              </div>
              <span style={{ color: "var(--text-muted)" }}>×</span>
              <div style={{ width: 54 }}>
                <Input key={`${region.id}:gy`} mono defaultValue={String(region.grid?.y ?? 24)} onBlur={(e) => set({ grid: { x: region.grid?.x ?? 24, y: clampGrid(e.target.value, region.grid?.y ?? 24) } })} />
              </div>
            </div>
          </Row>
          {region.kind === "contour" ? (
            <>
              <Row label="Levels">
                <div style={{ width: 64 }}>
                  <Input key={`${region.id}:levels`} mono defaultValue={region.surface?.levels != null ? String(region.surface.levels) : ""} placeholder="auto" onBlur={(e) => set({ surface: { ...region.surface, levels: e.target.value.trim() === "" ? undefined : clampGrid(e.target.value, 8) } })} />
                </div>
              </Row>
              <Row label="Filled bands">
                <Switch checked={!!region.surface?.filled} onChange={(e) => set({ surface: { ...region.surface, filled: e.target.checked } })} />
              </Row>
            </>
          ) : (
            <Row label="Wireframe">
              <Switch checked={region.surface?.wireframe ?? true} onChange={(e) => set({ surface: { ...region.surface, wireframe: e.target.checked } })} />
            </Row>
          )}
          <div style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
            Saved with the worksheet; the {region.kind === "surface" ? "3D" : "contour"} renderer ships next.
          </div>
        </Group>
      ) : (
        <>
          <Group eyebrow="Chart">
            <Row label="Samples">
              <SampleStepper value={region.samples ?? 80} set={(v) => set({ samples: v })} />
            </Row>
            <Row label="Legend">
              <Switch checked={region.legend} onChange={(e) => set({ legend: e.target.checked })} />
            </Row>
          </Group>

          <Group eyebrow="Traces">
            {region.traces.map((t) => (
              <TraceEditor
                key={t.id}
                trace={t}
                setTrace={setTrace}
                onToggle={() => dispatch({ type: "TOGGLE_PLOT_TRACE", id: region.id, traceId: t.id })}
                onDelete={() => dispatch({ type: "DELETE_PLOT_TRACE", id: region.id, traceId: t.id })}
              />
            ))}
            <button onClick={() => dispatch({ type: "ADD_PLOT_TRACE", id: region.id })} style={{ display: "inline-flex", alignItems: "center", gap: 5, alignSelf: "flex-start", border: "none", background: "none", color: "var(--accent)", font: "500 12px/1 var(--font-sans)", cursor: "pointer", padding: 0 }}>
              <Icon name="plusSm" size={13} /> Add trace
            </button>
          </Group>
        </>
      )}
    </>
  );
}

function AxisInspector({
  eyebrow,
  region,
  axisKey,
  axis,
  setAxis,
}: {
  eyebrow: string;
  region: PlotRegion;
  axisKey: "x" | "y";
  axis: PlotAxis;
  setAxis: (axis: "x" | "y", patch: Partial<PlotAxis>) => void;
}) {
  const num = (raw: string): number | undefined => {
    const t = raw.trim();
    if (t === "") return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };
  return (
    <Group eyebrow={eyebrow}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>Label</span>
          <Input key={`${region.id}:${axisKey}:label`} defaultValue={axis.label ?? ""} placeholder={axisKey} onBlur={(e) => setAxis(axisKey, { label: e.target.value.trim() || undefined })} />
        </div>
        <div style={{ width: 70, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>Unit</span>
          <Input key={`${region.id}:${axisKey}:unit`} mono defaultValue={axis.unit ?? ""} placeholder="—" onBlur={(e) => setAxis(axisKey, { unit: e.target.value.trim() || undefined })} />
        </div>
      </div>
      <Row label="Range">
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 60 }}>
            <Input key={`${region.id}:${axisKey}:min`} mono defaultValue={axis.min != null ? String(axis.min) : ""} placeholder="auto" onBlur={(e) => setAxis(axisKey, { min: num(e.target.value) })} />
          </div>
          <span style={{ color: "var(--text-muted)" }}>–</span>
          <div style={{ width: 60 }}>
            <Input key={`${region.id}:${axisKey}:max`} mono defaultValue={axis.max != null ? String(axis.max) : ""} placeholder="auto" onBlur={(e) => setAxis(axisKey, { max: num(e.target.value) })} />
          </div>
        </div>
      </Row>
      <Row label="Log scale">
        <Switch checked={!!axis.log} onChange={(e) => setAxis(axisKey, { log: e.target.checked || undefined })} />
      </Row>
    </Group>
  );
}

function TraceEditor({
  trace,
  setTrace,
  onToggle,
  onDelete,
}: {
  trace: PlotTrace;
  setTrace: (traceId: string, patch: Partial<PlotTrace>) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "9px 10px", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)", background: "var(--surface-raised)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ font: "11px/1 var(--font-mono)", color: "var(--accent)" }}>y =</span>
        <Input key={`${trace.id}:expr`} mono defaultValue={trace.expr} placeholder="2·x^2" onBlur={(e) => setTrace(trace.id, { expr: e.target.value })} containerStyle={{ flex: 1 }} />
        <IconButton label={trace.hidden ? "Show series" : "Hide series"} size="sm" onClick={onToggle}>
          <Icon name="eye" size={14} />
        </IconButton>
        <IconButton label="Delete trace" size="sm" onClick={onDelete}>
          <Icon name="x" size={14} />
        </IconButton>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Select value={trace.style} onChange={(e) => setTrace(trace.id, { style: e.target.value as TraceStyle })} options={TRACE_STYLES} />
        </div>
        <Input key={`${trace.id}:label`} defaultValue={trace.label ?? ""} placeholder="Label" onBlur={(e) => setTrace(trace.id, { label: e.target.value.trim() || undefined })} containerStyle={{ width: 96 }} />
      </div>
    </div>
  );
}

/** 2×2 plot-type picker — ported from the mockup's (b) type thumbnails. */
function PlotTypeGrid({ value, onChange }: { value: PlotKind; onChange: (kind: PlotKind) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <TypeTile label="XY" active={value === "xy"} onClick={() => onChange("xy")}>
        <ThumbXY />
      </TypeTile>
      <TypeTile label="Polar" active={value === "polar"} onClick={() => onChange("polar")}>
        <ThumbPolar />
      </TypeTile>
      <TypeTile label="Contour" active={value === "contour"} onClick={() => onChange("contour")}>
        <ThumbContour />
      </TypeTile>
      <TypeTile label="3D surface" active={value === "surface"} onClick={() => onChange("surface")}>
        <Thumb3D />
      </TypeTile>
    </div>
  );
}

function TypeTile({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid " + (active ? "var(--accent)" : "var(--border-hairline)"),
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--accent-tint)" : "var(--surface-raised)",
        cursor: "pointer",
        overflow: "hidden",
        padding: 0,
      }}
    >
      <div style={{ padding: "6px 8px 2px", background: "var(--surface-paper)" }}>{children}</div>
      <div style={{ font: "10.5px/1 var(--font-sans)", color: active ? "var(--accent)" : "var(--text-muted)", fontWeight: active ? 600 : 500, padding: "6px 8px", borderTop: "1px solid var(--border-hairline)", textAlign: "left" }}>{label}</div>
    </button>
  );
}

function ThumbXY() {
  return (
    <svg width="100%" viewBox="0 0 120 80" style={{ display: "block" }}>
      <line x1="16" y1="64" x2="112" y2="64" stroke="var(--border-strong)" strokeWidth="1" />
      <line x1="16" y1="12" x2="16" y2="64" stroke="var(--border-strong)" strokeWidth="1" />
      <path d="M16 60 L40 48 L64 34 L88 22 L112 14" fill="none" stroke="#1F5FBF" strokeWidth="1.75" />
      {[[40, 48], [64, 34], [88, 22]].map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill="var(--surface-paper)" stroke="#1F5FBF" strokeWidth="1.3" />
      ))}
    </svg>
  );
}

function ThumbPolar() {
  const cx = 60;
  const cy = 40;
  const r = 28;
  const pts: string[] = [];
  for (let a = 0; a <= 360; a += 12) {
    const rr = r * (0.55 + 0.45 * Math.cos((2 * a * Math.PI) / 180) ** 2);
    const x = cx + rr * Math.cos((a * Math.PI) / 180);
    const y = cy + rr * Math.sin((a * Math.PI) / 180);
    pts.push((a ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1));
  }
  return (
    <svg width="100%" viewBox="0 0 120 80" style={{ display: "block" }}>
      {[10, 19, 28].map((rr, i) => (
        <circle key={i} cx={cx} cy={cy} r={rr} fill="none" stroke="var(--border-hairline)" strokeWidth="1" />
      ))}
      <line x1={cx - 30} y1={cy} x2={cx + 30} y2={cy} stroke="var(--border-hairline)" strokeWidth="1" />
      <line x1={cx} y1={cy - 30} x2={cx} y2={cy + 30} stroke="var(--border-hairline)" strokeWidth="1" />
      <path d={pts.join(" ") + " Z"} fill="none" stroke="#1F5FBF" strokeWidth="1.5" />
    </svg>
  );
}

function ThumbContour() {
  return (
    <svg width="100%" viewBox="0 0 120 80" style={{ display: "block" }}>
      <rect x="16" y="12" width="96" height="52" fill="none" stroke="var(--border-strong)" strokeWidth="1" />
      {([["#E8F0FC", 30], ["#C7DCF6", 22], ["#9FC0EE", 14], ["#1F5FBF", 7]] as [string, number][]).map(([c, r], i) => (
        <ellipse key={i} cx="64" cy="38" rx={r + 14} ry={r + 4} fill="none" stroke={c} strokeWidth="1.6" />
      ))}
    </svg>
  );
}

function Thumb3D() {
  return (
    <svg width="100%" viewBox="0 0 120 80" style={{ display: "block" }}>
      {[0, 1, 2, 3, 4].map((r) => (
        <path
          key={r}
          d={[0, 1, 2, 3, 4, 5].map((c, i) => {
            const x = 24 + c * 14 + r * 6;
            const y = 56 - r * 7 - Math.sin((c + r) * 0.7) * 7;
            return (i ? "L" : "M") + x + " " + y.toFixed(1);
          }).join(" ")}
          fill="none"
          stroke={r === 2 ? "#1F5FBF" : "var(--border-strong)"}
          strokeWidth="1.2"
        />
      ))}
      {[0, 1, 2, 3, 4, 5].map((c) => (
        <path
          key={"v" + c}
          d={[0, 1, 2, 3, 4].map((r, i) => {
            const x = 24 + c * 14 + r * 6;
            const y = 56 - r * 7 - Math.sin((c + r) * 0.7) * 7;
            return (i ? "L" : "M") + x + " " + y.toFixed(1);
          }).join(" ")}
          fill="none"
          stroke="var(--border-hairline)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

/** Samples stepper (10–400, step 10) — distinct range from the decimals Stepper. */
function SampleStepper({ value, set }: { value: number; set: (v: number) => void }) {
  const clamp = (v: number) => Math.max(10, Math.min(400, v));
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", overflow: "hidden", height: 28 }}>
      <button onClick={() => set(clamp(value - 10))} style={{ width: 26, height: "100%", border: "none", background: "var(--surface-raised)", cursor: "pointer", color: "var(--text-primary)", fontSize: 14 }}>−</button>
      <span style={{ width: 36, textAlign: "center", font: "13px var(--font-mono)" }}>{value}</span>
      <button onClick={() => set(clamp(value + 10))} style={{ width: 26, height: "100%", border: "none", borderLeft: "1px solid var(--border-hairline)", background: "var(--surface-raised)", cursor: "pointer", color: "var(--text-primary)", fontSize: 14 }}>+</button>
    </div>
  );
}

function clampGrid(raw: string, fallback: number): number {
  const n = Number(raw.trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.max(2, Math.min(200, Math.round(n)));
}

/* ---- inspector primitives ---- */

/* ------------------------------------------------------------------ *
 * Control inspector (Mockup §6.7) — configure the bound variable and the
 * kind-specific options that shape the `bind := value` definition.
 * ------------------------------------------------------------------ */
const CONTROL_KINDS: ControlKind[] = ["slider", "dropdown", "combo", "radio", "checkbox", "button", "textbox", "listbox"];
const OPTION_KINDS = new Set<ControlKind>(["dropdown", "combo", "radio", "listbox"]);

function ControlInspector({ region, set }: { region: ControlRegion; set: (p: RegionPatch) => void }) {
  const kind = region.kind;
  const numberLike = kind === "slider" || ((kind === "textbox" || OPTION_KINDS.has(kind)) && (region.valueType ?? "number") === "number");
  return (
    <>
      <Group eyebrow="Control">
        <Row label="Type">
          <div style={{ width: 130 }}>
            <Select
              value={kind}
              onChange={(e) => set({ kind: e.target.value as ControlKind })}
              options={CONTROL_KINDS.map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }))}
            />
          </div>
        </Row>
        <Row label="Bound variable">
          <div style={{ width: 110 }}>
            <Input mono defaultValue={region.bind} placeholder="L" onBlur={(e) => set({ bind: e.target.value.trim() })} />
          </div>
        </Row>
        {kind !== "checkbox" && (
          <Row label="Label">
            <div style={{ width: 130 }}>
              <Input defaultValue={region.label ?? ""} placeholder="Caption" onBlur={(e) => set({ label: e.target.value || "" })} />
            </div>
          </Row>
        )}
        {(kind === "textbox" || OPTION_KINDS.has(kind)) && (
          <Row label="Value type">
            <Segmented
              options={["text", "number", "expr"]}
              value={region.valueType ?? "number"}
              set={(v) => set({ valueType: v as ControlValueType })}
            />
          </Row>
        )}
        {numberLike && (
          <Row label="Unit">
            <div style={{ width: 90 }}>
              <Input mono defaultValue={region.unit ?? ""} placeholder="m" onBlur={(e) => set({ unit: e.target.value || "" })} />
            </div>
          </Row>
        )}
      </Group>

      {kind === "slider" && (
        <Group eyebrow="Slider">
          <Row label="Minimum">
            <NumberField value={region.min ?? 0} onCommit={(v) => set({ min: v })} />
          </Row>
          <Row label="Maximum">
            <NumberField value={region.max ?? 10} onCommit={(v) => set({ max: v })} />
          </Row>
          <Row label="Step">
            <NumberField value={region.step ?? 1} onCommit={(v) => set({ step: v })} />
          </Row>
          <Row label="Invert">
            <Switch checked={!!region.invert} onChange={(e) => set({ invert: e.target.checked })} />
          </Row>
        </Group>
      )}

      {kind === "checkbox" && (
        <Group eyebrow="Checkbox">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>Label</span>
            <Input defaultValue={region.label ?? ""} placeholder="Allow redistribution" onBlur={(e) => set({ label: e.target.value || "" })} />
          </div>
          <Row label="Checked by default">
            <Switch checked={region.value === true} onChange={(e) => set({ value: e.target.checked })} />
          </Row>
        </Group>
      )}

      {OPTION_KINDS.has(kind) && <OptionsEditor region={region} set={set} />}
    </>
  );
}

/** Number input that commits a finite value on blur (min/max/step). */
function NumberField({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  return (
    <div style={{ width: 90 }}>
      <Input
        mono
        defaultValue={String(value)}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onCommit(v);
        }}
      />
    </div>
  );
}

/** One-option-per-line editor (supports paste-multiple) + default-selection. */
function OptionsEditor({ region, set }: { region: ControlRegion; set: (p: RegionPatch) => void }) {
  const options = region.options ?? [];
  const commit = (text: string) => {
    const parsed = text
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((value): ControlOption => ({ value }));
    const value = parsed.some((o) => o.value === String(region.value)) ? region.value : parsed[0]?.value;
    set({ options: parsed, value });
  };
  return (
    <Group eyebrow="Options">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>One per line — paste a list to fill</span>
        <textarea
          defaultValue={options.map((o) => o.value).join("\n")}
          onBlur={(e) => commit(e.target.value)}
          rows={Math.min(8, Math.max(3, options.length + 1))}
          spellCheck={false}
          style={{
            width: "100%",
            resize: "vertical",
            padding: "6px 8px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-strong)",
            background: "var(--surface-raised)",
            font: "12.5px/1.5 var(--font-mono)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
      </div>
      {options.length > 0 && (
        <Row label="Selected">
          <div style={{ width: 130 }}>
            <Select
              value={region.value === undefined ? "" : String(region.value)}
              onChange={(e) => set({ value: e.target.value })}
              options={options.map((o) => ({ value: o.value, label: o.label ?? o.value }))}
            />
          </div>
        </Row>
      )}
    </Group>
  );
}

/* ------------------------------------------------------------------ *
 * Solve-block inspector (Functional Brief §6.5) — guesses, constraints,
 * algorithm + tolerances, and the deferred ODE/PDE config. Whole-array commits
 * via SET_REGION_PROP, like the control options / plot z editors.
 * ------------------------------------------------------------------ */

const SOLVE_ALGOS: { value: SolveAlgorithm; label: string }[] = [
  { value: "find", label: "find — solve equations" },
  { value: "minimize", label: "minimize objective" },
  { value: "maximize", label: "maximize objective" },
  { value: "minerr", label: "minerr — least error" },
  { value: "odesolve", label: "odesolve — ODE (ships next)" },
  { value: "pdesolve", label: "pdesolve — PDE (ships next)" },
  { value: "numol", label: "numol — method of lines (ships next)" },
];
const ODE_ALGOS = new Set<SolveAlgorithm>(["odesolve", "pdesolve", "numol"]);

const fieldLabel: React.CSSProperties = { font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" };
const addBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  alignSelf: "flex-start",
  border: "none",
  background: "none",
  color: "var(--accent)",
  font: "500 12px/1 var(--font-sans)",
  cursor: "pointer",
  padding: 0,
};
const textareaStyle: React.CSSProperties = {
  width: "100%",
  resize: "vertical",
  padding: "6px 8px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border-strong)",
  background: "var(--surface-raised)",
  font: "12.5px/1.5 var(--font-mono)",
  color: "var(--text-primary)",
  outline: "none",
};

const numOrUndef = (raw: string): number | undefined => {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};
const intOrUndef = (raw: string): number | undefined => {
  const n = numOrUndef(raw);
  return n === undefined ? undefined : Math.round(n);
};
const lines = (text: string): string[] => text.split(/\n+/).map((s) => s.trim()).filter(Boolean);

function SolveInspector({ region, set }: { region: SolveRegion; set: (p: RegionPatch) => void }) {
  const isOde = ODE_ALGOS.has(region.algorithm);
  const isOpt = region.algorithm === "minimize" || region.algorithm === "maximize";

  const updateGuess = (i: number, patch: Partial<SolveGuess>) =>
    set({ guesses: region.guesses.map((g, j) => (j === i ? { ...g, ...patch } : g)) });

  return (
    <>
      <Group eyebrow="Solver">
        <Row label="Algorithm">
          <div style={{ width: 160 }}>
            <Select
              value={region.algorithm}
              onChange={(e) => set({ algorithm: e.target.value as SolveAlgorithm })}
              options={SOLVE_ALGOS}
            />
          </div>
        </Row>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={fieldLabel}>Name</span>
          <Input defaultValue={region.name ?? ""} placeholder="plate thickness" onBlur={(e) => set({ name: e.target.value || undefined })} />
        </div>
      </Group>

      {!isOde && (
        <>
          <Group eyebrow="Guesses">
            {region.guesses.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 56 }}>
                  <Input mono defaultValue={g.var} placeholder="x" onBlur={(e) => updateGuess(i, { var: e.target.value.trim() })} />
                </div>
                <span style={{ font: "12px/1 var(--font-mono)", color: "var(--text-muted)" }}>:=</span>
                <Input mono defaultValue={g.value} placeholder="0" onBlur={(e) => updateGuess(i, { value: e.target.value })} containerStyle={{ flex: 1 }} />
                <div style={{ width: 52 }}>
                  <Input mono defaultValue={g.unit ?? ""} placeholder="unit" onBlur={(e) => updateGuess(i, { unit: e.target.value.trim() || undefined })} />
                </div>
                <IconButton label="Remove guess" size="sm" onClick={() => set({ guesses: region.guesses.filter((_, j) => j !== i) })}>
                  <Icon name="x" size={14} />
                </IconButton>
              </div>
            ))}
            <button onClick={() => set({ guesses: [...region.guesses, { var: "", value: "0" }] })} style={addBtnStyle}>
              <Icon name="plusSm" size={13} /> Add guess
            </button>
          </Group>

          <Group eyebrow={isOpt ? "Constraints (bounds)" : "Constraints"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={fieldLabel}>One equation / inequality per line</span>
              <textarea
                key={`${region.id}:constraints`}
                defaultValue={region.constraints.join("\n")}
                onBlur={(e) => set({ constraints: lines(e.target.value) })}
                rows={Math.min(8, Math.max(3, region.constraints.length + 1))}
                spellCheck={false}
                placeholder={"x^2 = 9\nx >= 0"}
                style={textareaStyle}
              />
              <span style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
                Use <code style={{ fontFamily: "var(--font-mono)" }}>=</code> for equations and{" "}
                <code style={{ fontFamily: "var(--font-mono)" }}>{"<= >= < >"}</code> for inequalities.
              </span>
            </div>
          </Group>

          {isOpt && (
            <Group eyebrow="Objective">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={fieldLabel}>Expression to {region.algorithm}</span>
                <Input key={`${region.id}:objective`} mono defaultValue={region.objective ?? ""} placeholder="(x-3)^2" onBlur={(e) => set({ objective: e.target.value || undefined })} />
              </div>
            </Group>
          )}

          <Group eyebrow="Tolerances">
            <Row label="Constraint tol (CTOL)">
              <div style={{ width: 96 }}>
                <Input mono defaultValue={region.ctol != null ? String(region.ctol) : ""} placeholder="1e-9" onBlur={(e) => set({ ctol: numOrUndef(e.target.value) })} />
              </div>
            </Row>
            <Row label="Scaling">
              <div style={{ width: 96 }}>
                <Input mono defaultValue={region.scaling != null ? String(region.scaling) : ""} placeholder="1" onBlur={(e) => set({ scaling: numOrUndef(e.target.value) })} />
              </div>
            </Row>
            <Row label="Max iterations">
              <div style={{ width: 96 }}>
                <Input mono defaultValue={region.maxIter != null ? String(region.maxIter) : ""} placeholder="auto" onBlur={(e) => set({ maxIter: intOrUndef(e.target.value) })} />
              </div>
            </Row>
            <Row label="On non-convergence">
              <Segmented options={["error", "last"]} value={region.onNonConverge ?? "error"} set={(v) => set({ onNonConverge: v as "error" | "last" })} />
            </Row>
          </Group>
        </>
      )}

      {isOde && <OdeInspector region={region} set={set} />}
    </>
  );
}

function OdeInspector({ region, set }: { region: SolveRegion; set: (p: RegionPatch) => void }) {
  const ode = region.ode ?? { system: [], indepVar: "x", range: {}, conditions: [] };
  const setOde = (patch: Partial<NonNullable<SolveRegion["ode"]>>) => set({ ode: { ...ode, ...patch } });
  return (
    <>
      <Group eyebrow="Differential system">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={fieldLabel}>Equations (one per line)</span>
          <textarea
            key={`${region.id}:ode-system`}
            defaultValue={(ode.system ?? []).join("\n")}
            onBlur={(e) => setOde({ system: lines(e.target.value) })}
            rows={3}
            spellCheck={false}
            placeholder={"y'' + y = 0"}
            style={textareaStyle}
          />
        </div>
        <Row label="Independent variable">
          <div style={{ width: 96 }}>
            <Input key={`${region.id}:ode-var`} mono defaultValue={ode.indepVar ?? "x"} placeholder="x" onBlur={(e) => setOde({ indepVar: e.target.value.trim() || "x" })} />
          </div>
        </Row>
        <Row label="Range">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 60 }}>
              <Input key={`${region.id}:ode-min`} mono defaultValue={ode.range?.min != null ? String(ode.range.min) : ""} placeholder="min" onBlur={(e) => setOde({ range: { ...ode.range, min: numOrUndef(e.target.value) } })} />
            </div>
            <span style={{ color: "var(--text-muted)" }}>–</span>
            <div style={{ width: 60 }}>
              <Input key={`${region.id}:ode-max`} mono defaultValue={ode.range?.max != null ? String(ode.range.max) : ""} placeholder="max" onBlur={(e) => setOde({ range: { ...ode.range, max: numOrUndef(e.target.value) } })} />
            </div>
          </div>
        </Row>
      </Group>
      <Group eyebrow="Initial / boundary conditions">
        <textarea
          key={`${region.id}:ode-cond`}
          defaultValue={(ode.conditions ?? []).join("\n")}
          onBlur={(e) => setOde({ conditions: lines(e.target.value) })}
          rows={3}
          spellCheck={false}
          placeholder={"y(0) = 1\ny'(0) = 0"}
          style={textareaStyle}
        />
      </Group>
      <Group eyebrow="Discretization">
        <Row label="Step (ODE)">
          <div style={{ width: 96 }}>
            <Input key={`${region.id}:ode-step`} mono defaultValue={ode.step != null ? String(ode.step) : ""} placeholder="auto" onBlur={(e) => setOde({ step: numOrUndef(e.target.value) })} />
          </div>
        </Row>
        <Row label="Mesh points (PDE)">
          <div style={{ width: 96 }}>
            <Input key={`${region.id}:ode-mesh`} mono defaultValue={ode.mesh != null ? String(ode.mesh) : ""} placeholder="auto" onBlur={(e) => setOde({ mesh: intOrUndef(e.target.value) })} />
          </div>
        </Row>
        <div style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
          Saved with the worksheet; the differential-equation integrator ships with the SciPy engine.
        </div>
      </Group>
    </>
  );
}

function ProgramInspector({ region, set }: { region: ProgramRegion; set: (p: RegionPatch) => void }) {
  const params = region.params ?? [];
  const isFunction = !!region.name?.trim() && params.some((p) => p.trim());
  return (
    <>
      <Group eyebrow="Definition">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={fieldLabel}>Name</span>
          <Input mono defaultValue={region.name ?? ""} placeholder="factorial" onBlur={(e) => set({ name: e.target.value.trim() || undefined })} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={fieldLabel}>Parameters</span>
          <Input
            mono
            key={`${region.id}:params`}
            defaultValue={params.join(", ")}
            placeholder="n  (comma-separated)"
            onBlur={(e) => set({ params: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
          <span style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
            {isFunction
              ? "Defines a callable function — reference it as name(args) in any region below."
              : "Leave empty to define a value (the program runs and shows its result)."}
          </span>
        </div>
      </Group>

      <Group eyebrow="Program">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={fieldLabel}>One statement per line; indent for blocks</span>
          <textarea
            key={`${region.id}:body`}
            defaultValue={programBodyToText(region.body ?? [])}
            onBlur={(e) => set({ body: parseProgramBody(e.target.value) })}
            rows={Math.min(16, Math.max(5, programBodyToText(region.body ?? []).split("\n").length + 1))}
            spellCheck={false}
            placeholder={"result := 1\nif n > 1\n  for i in 2..n\n    result := result * i\nreturn result"}
            style={{ ...textareaStyle, minHeight: 120, whiteSpace: "pre", overflowWrap: "normal" }}
          />
          <span style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
            Use <code style={{ fontFamily: "var(--font-mono)" }}>:=</code> for locals,{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>if / else if / otherwise</code>,{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>for i in a..b</code>,{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>while</code>, and{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>return</code>.
          </span>
        </div>
      </Group>

      {!isFunction && (
        <Group eyebrow="Units">
          <Row label="Result unit">
            <div style={{ width: 110 }}>
              <Input mono defaultValue={region.unit ?? ""} placeholder="kN" onBlur={(e) => set({ unit: e.target.value.trim() || undefined })} />
            </div>
          </Row>
        </Group>
      )}
    </>
  );
}

function Group({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div style={{ padding: "13px 14px", borderBottom: "1px solid var(--border-hairline)" }}>
      <div style={{ font: "600 11px/1 var(--font-sans)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--text-muted)" }}>{eyebrow}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 11 }}>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ font: "12.5px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>{label}</span>
      {children}
    </div>
  );
}

function Stepper({ value, set }: { value: number; set: (v: number) => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", overflow: "hidden", height: 28 }}>
      <button onClick={() => set(Math.max(0, value - 1))} style={{ width: 26, height: "100%", border: "none", background: "var(--surface-raised)", cursor: "pointer", color: "var(--text-primary)", fontSize: 14 }}>−</button>
      <span style={{ width: 30, textAlign: "center", font: "13px var(--font-mono)" }}>{value}</span>
      <button onClick={() => set(Math.min(6, value + 1))} style={{ width: 26, height: "100%", border: "none", borderLeft: "1px solid var(--border-hairline)", background: "var(--surface-raised)", cursor: "pointer", color: "var(--text-primary)", fontSize: 14 }}>+</button>
    </div>
  );
}

function Segmented({ options, value, set }: { options: string[]; value: string; set: (v: string) => void }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", overflow: "hidden", height: 26 }}>
      {options.map((o, i) => {
        const on = value === o;
        return (
          <button
            key={o}
            onClick={() => set(o)}
            style={{ padding: "0 9px", height: "100%", border: "none", borderLeft: i ? "1px solid var(--border-hairline)" : "none", cursor: "pointer", background: on ? "var(--accent-tint)" : "var(--surface-raised)", color: on ? "var(--accent)" : "var(--text-muted)", font: (on ? "600" : "500") + " 11.5px/1 var(--font-mono)", textTransform: "capitalize" }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function regionLabel(type: Region["type"]): string {
  const map: Record<Region["type"], string> = {
    math: "Math region", text: "Text region", table: "Table", plot: "Plot",
    image: "Image", control: "Control", area: "Area", include: "Include", solve: "Solve block",
    program: "Program",
  };
  return map[type] ?? "Region";
}
