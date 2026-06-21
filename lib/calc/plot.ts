/**
 * Plot sampling engine (Functional Brief §6.4, mockup `plot-region.html`).
 *
 * A worksheet plot binds traces to expressions / ranges / table columns; this
 * module turns that spec + the worksheet scope into sampled, unit-converted
 * series the renderer consumes. It is PURE and deterministic (client = worker =
 * Node): it reuses the engine's own value model, unit conversion, formatter, and
 * typed errors — never a parallel system — and never throws into the UI (every
 * trace is wrapped, a bad trace errors locally and the rest still plot).
 *
 * The engine core (`graph.ts`, `recalc.ts`) is intentionally untouched: a plot is
 * a read-only CONSUMER of worksheet names (passed in as `externalScope`), so it
 * stays reactive — the provider re-evaluates it whenever recalc changes scope.
 *
 * Two binding modes:
 *   • sweep (plot-by-formula): sample `xVar` across [x.min, x.max] and evaluate
 *     each trace's `expr` per sample — `y = f(x)`, and for polar `r = f(θ)`.
 *   • data: evaluate an `xData` expression to a vector and zip it with each
 *     trace's vector result (a scalar result broadcasts to a constant line).
 *
 * `contour`/`surface` need a 2D `z = f(x, y)` sampling + renderer that ship in a
 * follow-up; this pass returns them `empty` so the view shows a typed 'configure'
 * placeholder (their config still round-trips through the content schema).
 */
import { math } from "./math";
import type { MathNode, Unit } from "./math";
import { toDisplayUnit, SI_SYSTEM, isUnit } from "./units";
import { resolveScale, niceLogBounds, type AxisScale } from "./plot-scale";
import { CalcEngineError, classifyThrow, makeError } from "./errors";
import type { CalcError, UnitSystem } from "./types";

/* ------------------------------------------------------------------ *
 * Input contract (structurally satisfied by lib/worksheet's PlotRegion,
 * so the engine stays decoupled from the content tree).
 * ------------------------------------------------------------------ */

export type PlotKind = "xy" | "polar" | "contour" | "surface";
export type PlotTraceStyle =
  | "line"
  | "scatter"
  | "line-marker"
  | "column"
  | "bar"
  | "stem"
  | "area"
  | "error"
  | "waterfall"
  | "box";

export type PlotAxisId = "y" | "y2";
export type PlotErrorMode = "bar" | "band";

export interface PlotAxisSpec {
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
  /** Deprecated boolean kept for back-compat; `scale` wins when both are set. */
  log?: boolean;
  /** Axis scale — linear (default), log, or symlog. */
  scale?: AxisScale;
  /** Symlog linear-region half-width (defaults to 1). */
  linthresh?: number;
}

export interface PlotTraceSpec {
  id: string;
  label?: string;
  /** y expression sampled over `xVar` (sweep), or a vector expression (data). */
  expr: string;
  style?: PlotTraceStyle;
  color?: string;
  dash?: boolean;
  hidden?: boolean;
  /** Which y-axis this trace binds to (primary "y" or secondary "y2"). */
  axis?: PlotAxisId;
  /** Optional ± error expression, sampled like `expr`; renders as bars or a band. */
  errorExpr?: string;
  errorMode?: PlotErrorMode;
}

/** A reference (datum) line at a constant value on one axis. */
export interface PlotReferenceSpec {
  id: string;
  axis: "x" | "y" | "y2";
  /** Literal position; used when `expr` is absent. */
  value?: number;
  /** Expression evaluated in worksheet scope (unit-aware) — overrides `value`. */
  expr?: string;
  label?: string;
  color?: string;
  dash?: boolean;
}

/** A text callout at a data-space (x, y) on the primary axes. */
export interface PlotAnnotationSpec {
  id: string;
  x: number;
  y: number;
  text: string;
  color?: string;
}

export interface PlotSpec {
  kind?: PlotKind;
  /** Independent variable swept across the x-axis (default "x"); θ for polar. */
  xVar?: string;
  /** Explicit x data expression (a vector) — switches the plot to data mode. */
  xData?: string;
  x?: PlotAxisSpec;
  y?: PlotAxisSpec;
  /** Optional secondary y-axis; traces with `axis: "y2"` map onto it. */
  y2?: PlotAxisSpec;
  traces?: PlotTraceSpec[];
  references?: PlotReferenceSpec[];
  annotations?: PlotAnnotationSpec[];
  /** Sweep sample count; clamped to 2–400. */
  samples?: number;
}

/* ------------------------------------------------------------------ *
 * Output
 * ------------------------------------------------------------------ */

export interface PlotPoint {
  /** x-axis position (xy) or angle θ in radians (polar), in display units. */
  x: number;
  /** y-axis value (xy) or radius r (polar), in display units. */
  y: number;
  /** ± error half-width in the trace's y-axis unit (sampled from `errorExpr`). */
  err?: number;
}

export interface TraceResult {
  id: string;
  label: string;
  style: PlotTraceStyle;
  color?: string;
  dash?: boolean;
  hidden: boolean;
  /** Which y-axis this trace maps onto (primary "y" or secondary "y2"). */
  axis: PlotAxisId;
  /** How to draw `point.err`, when present. */
  errorMode?: PlotErrorMode;
  /** Sampled points in display units; empty on error or a blank expression. */
  points: PlotPoint[];
  error?: CalcError;
  /** True when the trace has no expression yet. */
  empty: boolean;
}

export interface PlotBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Secondary-axis bounds — present only when a trace binds to "y2". */
  y2Min?: number;
  y2Max?: number;
}

/** A reference line resolved to a concrete axis value. */
export interface ResolvedReference {
  id: string;
  axis: "x" | "y" | "y2";
  value: number;
  label?: string;
  color?: string;
  dash?: boolean;
}

export interface ResolvedAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  color?: string;
}

export interface PlotResult {
  kind: PlotKind;
  traces: TraceResult[];
  bounds: PlotBounds;
  /** Unit label actually used on each axis (after conversion), or null. */
  xUnit: string | null;
  yUnit: string | null;
  /** Secondary-axis unit (null when no secondary axis is in use). */
  y2Unit: string | null;
  references: ResolvedReference[];
  annotations: ResolvedAnnotation[];
  errorCount: number;
  /** True when nothing is plottable yet (no usable trace / no x binding). */
  empty: boolean;
}

const DEFAULT_SAMPLES = 80;
const TAU = 2 * Math.PI;

/* ------------------------------------------------------------------ *
 * Public entry
 * ------------------------------------------------------------------ */

export function evaluatePlot(
  spec: PlotSpec,
  externalScope: Record<string, unknown> = {},
  system: UnitSystem = SI_SYSTEM,
): PlotResult {
  const kind = spec.kind ?? "xy";
  const xAxis = spec.x ?? {};
  const yAxis = spec.y ?? {};
  const y2Axis = spec.y2;
  const xUnit = realUnit(xAxis.unit);
  const yUnit = realUnit(yAxis.unit);
  const y2Unit = realUnit(y2Axis?.unit);

  // contour/surface are typed-but-inert this pass — the view shows a placeholder.
  if (kind === "contour" || kind === "surface") {
    return {
      kind,
      traces: [],
      bounds: defaultBounds(xAxis, yAxis),
      xUnit: xUnit ?? null,
      yUnit: yUnit ?? null,
      y2Unit: null,
      references: [],
      annotations: [],
      errorCount: 0,
      empty: true,
    };
  }

  const polar = kind === "polar";
  const xVar = spec.xVar?.trim() || (polar ? "theta" : "x");
  const traces = spec.traces ?? [];
  const dataExpr = spec.xData?.trim();

  const xScale = resolveScale(xAxis);
  const yScale = resolveScale(yAxis);
  const y2Scale = resolveScale(y2Axis);

  // Resolve the x sampling: data vector, or a sweep of [min, max] (log-spaced on a log x).
  const sampling = resolveSampling(dataExpr, xAxis, xScale, polar, spec.samples, externalScope, system);

  const traceResults: TraceResult[] = traces.map((t) => {
    const onY2 = t.axis === "y2";
    return evaluateTrace(
      t,
      sampling,
      xVar,
      onY2 ? y2Unit : yUnit,
      onY2 ? y2Scale : yScale,
      xScale,
      system,
      externalScope,
    );
  });

  const errorCount = traceResults.filter((t) => t.error).length;
  const drawable = traceResults.filter((t) => !t.hidden && t.points.length > 0);
  const empty = drawable.length === 0;

  return {
    kind,
    traces: traceResults,
    bounds: computeBounds(traceResults, xAxis, yAxis, y2Axis, sampling, polar),
    xUnit: xUnit ?? null,
    yUnit: yUnit ?? null,
    y2Unit: y2Unit ?? null,
    references: resolveReferences(spec.references ?? [], xAxis, yAxis, y2Axis, system, externalScope),
    annotations: resolveAnnotations(spec.annotations ?? []),
    errorCount,
    empty,
  };
}

/* ------------------------------------------------------------------ *
 * x sampling
 * ------------------------------------------------------------------ */

interface Sampling {
  /** Mode flag — data zips a precomputed x vector; sweep binds `xVar` per point. */
  mode: "data" | "sweep";
  /** x-axis display position of each sample. */
  display: number[];
  /** Raw value bound to `xVar` per sample (sweep only; unit-attached). */
  raw: unknown[];
  /** The sweep span actually used (for axis bounds), or null in data mode. */
  span: { lo: number; hi: number } | null;
  /** A vector-resolution error (bad `xData`), surfaced on every trace. */
  error?: CalcError;
}

function resolveSampling(
  dataExpr: string | undefined,
  xAxis: PlotAxisSpec,
  xScale: AxisScale,
  polar: boolean,
  samples: number | undefined,
  scope: Record<string, unknown>,
  system: UnitSystem,
): Sampling {
  const n = clampInt(samples ?? DEFAULT_SAMPLES, 2, 400);

  if (dataExpr) {
    try {
      const raw = flatten1D(math.parse(dataExpr).evaluate({ ...scope }));
      const display: number[] = [];
      for (const v of raw) display.push(toAxisNumber(v, xAxis.unit, system));
      return { mode: "data", display, raw, span: null };
    } catch (error) {
      return { mode: "data", display: [], raw: [], span: null, error: classifyThrow(error) };
    }
  }

  // Sweep: polar defaults θ to a full turn when the range is unset.
  const lo = xAxis.min ?? (polar ? 0 : NaN);
  const hi = xAxis.max ?? (polar ? TAU : NaN);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) {
    return { mode: "sweep", display: [], raw: [], span: null };
  }
  // A log x-axis samples geometrically (even spacing on the log scale) when the
  // range is strictly positive; otherwise fall back to a linear sweep.
  const display = xScale === "log" && lo > 0 && hi > 0 ? logspace(lo, hi, n) : linspace(lo, hi, n);
  // Bind the sample to `xVar` carrying the x-axis unit, so `f(x)` is unit-aware.
  const raw = display.map((v) => attachUnit(v, xAxis.unit));
  return { mode: "sweep", display, raw, span: { lo, hi } };
}

/* ------------------------------------------------------------------ *
 * Per-trace evaluation
 * ------------------------------------------------------------------ */

function evaluateTrace(
  trace: PlotTraceSpec,
  sampling: Sampling,
  xVar: string,
  yUnit: string | undefined,
  yScale: AxisScale,
  xScale: AxisScale,
  system: UnitSystem,
  scope: Record<string, unknown>,
): TraceResult {
  const base = {
    id: trace.id,
    label: trace.label?.trim() || trace.expr.trim() || "trace",
    style: trace.style ?? "line",
    color: trace.color,
    dash: trace.dash,
    hidden: !!trace.hidden,
    axis: trace.axis === "y2" ? ("y2" as const) : ("y" as const),
    errorMode: trace.errorMode,
  };

  // Hidden traces aren't drawn — skip sampling (toggling visibility re-runs the engine).
  if (base.hidden) return { ...base, points: [], empty: false };

  const expr = trace.expr?.trim() ?? "";
  if (!expr) return { ...base, points: [], empty: true };
  if (sampling.error) return { ...base, points: [], empty: false, error: sampling.error };

  let node: MathNode;
  try {
    node = math.parse(expr);
  } catch (error) {
    return { ...base, points: [], empty: false, error: classifyThrow(error) };
  }

  // Optional ± error expression — a bad/blank error expr simply omits the bars,
  // it never errors the trace.
  const errSrc = trace.errorExpr?.trim();
  let errNode: MathNode | undefined;
  if (errSrc) {
    try {
      errNode = math.parse(errSrc);
    } catch {
      errNode = undefined;
    }
  }

  // (xDisplay, rawY, rawErr) triples — one per sample. In data mode the whole
  // expression evaluates once to a vector (a scalar broadcasts to a constant line).
  let pairs: SamplePair[];
  try {
    pairs = sampling.mode === "data"
      ? zipData(node, errNode, sampling.display, scope)
      : sweep(node, errNode, sampling, xVar, scope);
  } catch (error) {
    return { ...base, points: [], empty: false, error: classifyThrow(error) };
  }

  // Convert each raw y to a plain axis number; non-finite values are gaps. A
  // conversion that fails on EVERY point (e.g. a unit mismatch) errors the trace;
  // failing on SOME points (a domain gap) just drops those points. Non-positive
  // values are dropped on a log axis (no log of ≤ 0) — a gap, not an error.
  const points: PlotPoint[] = [];
  let firstError: unknown = null;
  for (const { x, raw, errRaw } of pairs) {
    if (raw === undefined || !Number.isFinite(x)) continue;
    if (xScale === "log" && x <= 0) continue;
    let y: number;
    try {
      y = toAxisNumber(raw, yUnit, system);
    } catch (error) {
      if (!firstError) firstError = error;
      continue;
    }
    if (!Number.isFinite(y)) continue;
    if (yScale === "log" && y <= 0) continue;
    let err: number | undefined;
    if (errRaw !== undefined) {
      try {
        const e = toAxisNumber(errRaw, yUnit, system);
        if (Number.isFinite(e)) err = Math.abs(e);
      } catch {
        /* a bad error sample just drops the bar for this point */
      }
    }
    points.push(err != null ? { x, y, err } : { x, y });
  }

  if (points.length === 0 && firstError) {
    return { ...base, points: [], empty: false, error: classifyThrow(firstError) };
  }
  return { ...base, points, empty: false };
}

interface SamplePair {
  x: number;
  raw: unknown;
  errRaw?: unknown;
}

/** Evaluate a node, swallowing throws (an optional error expression must not sink a point). */
function evalOpt(node: MathNode, scope: Record<string, unknown>): unknown {
  try {
    return node.evaluate(scope);
  } catch {
    return undefined;
  }
}

/** Sweep mode: bind each x sample to `xVar` and evaluate. Per-sample throws are gaps. */
function sweep(
  node: MathNode,
  errNode: MathNode | undefined,
  sampling: Sampling,
  xVar: string,
  scope: Record<string, unknown>,
): SamplePair[] {
  const out: SamplePair[] = [];
  let allThrew: unknown = null;
  let evaluated = 0;
  for (let i = 0; i < sampling.raw.length; i += 1) {
    const local = { ...scope, [xVar]: sampling.raw[i] };
    try {
      const raw = node.evaluate(local);
      evaluated += 1;
      out.push({ x: sampling.display[i], raw, errRaw: errNode ? evalOpt(errNode, local) : undefined });
    } catch (error) {
      if (!allThrew) allThrew = error;
    }
  }
  // Threw on every sample ⇒ a structural error (e.g. an undefined name); surface it.
  if (evaluated === 0 && allThrew) throw allThrew;
  return out;
}

/** Data mode: evaluate once to a vector and zip with the x data (scalar broadcasts). */
function zipData(
  node: MathNode,
  errNode: MathNode | undefined,
  xDisplay: number[],
  scope: Record<string, unknown>,
): SamplePair[] {
  const ys = flatten1D(node.evaluate({ ...scope }));
  const errs = errNode ? flatten1D(evalOpt(errNode, { ...scope }) ?? []) : [];
  const out: SamplePair[] = [];
  for (let i = 0; i < xDisplay.length; i += 1) {
    const raw = ys.length === 1 ? ys[0] : ys[i];
    const errRaw = errNode ? (errs.length === 1 ? errs[0] : errs[i]) : undefined;
    out.push({ x: xDisplay[i], raw, errRaw });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Axis bounds
 * ------------------------------------------------------------------ */

function computeBounds(
  traces: TraceResult[],
  xAxis: PlotAxisSpec,
  yAxis: PlotAxisSpec,
  y2Axis: PlotAxisSpec | undefined,
  sampling: Sampling,
  polar: boolean,
): PlotBounds {
  const visible = traces.filter((t) => !t.hidden);
  const yPts = visible.filter((t) => t.axis !== "y2").flatMap((t) => t.points);
  const y2Pts = visible.filter((t) => t.axis === "y2").flatMap((t) => t.points);
  const allPts = [...yPts, ...y2Pts];

  // x bounds: pinned, else the sweep span, else the data extent.
  let xMin = xAxis.min;
  let xMax = xAxis.max;
  if (xMin == null || xMax == null) {
    if (sampling.span) {
      xMin = xMin ?? sampling.span.lo;
      xMax = xMax ?? sampling.span.hi;
    } else {
      const [lo, hi] = extent(allPts.map((p) => p.x));
      xMin = xMin ?? lo;
      xMax = xMax ?? hi;
    }
  }

  const [yMin, yMax] = axisBounds(yAxis, yPts, polar);
  const bounds: PlotBounds = {
    xMin: finiteOr(xMin, 0),
    xMax: finiteOr(xMax, polar ? TAU : 1),
    yMin: finiteOr(yMin, 0),
    yMax: finiteOr(yMax, 1),
  };

  // Only materialise the secondary axis when a trace actually binds to it — an
  // empty point set would otherwise yield a dead [0,1] axis.
  if (y2Axis && y2Pts.length > 0) {
    const [a, b] = axisBounds(y2Axis, y2Pts, false);
    bounds.y2Min = finiteOr(a, 0);
    bounds.y2Max = finiteOr(b, 1);
  }
  return bounds;
}

/**
 * Bounds for one y-axis: pinned values are honoured exactly; otherwise the data
 * extent (including any ± error whiskers, so they aren't clipped) is rounded to
 * clean bounds — power-of-10 on a log axis, Heckbert "nice numbers" otherwise.
 */
function axisBounds(
  axis: PlotAxisSpec,
  pts: PlotPoint[],
  polar: boolean,
): [number | undefined, number | undefined] {
  const lo = axis.min;
  const hi = axis.max;
  if (lo != null && hi != null) return [lo, hi];

  const ys: number[] = [];
  for (const p of pts) {
    ys.push(p.y);
    if (p.err != null) {
      ys.push(p.y + p.err);
      ys.push(p.y - p.err);
    }
  }

  if (resolveScale(axis) === "log") {
    const positives = ys.filter((v) => v > 0);
    const [dlo, dhi] = extent(positives.length ? positives : [1, 10]);
    const [nlo, nhi] = niceLogBounds(dlo, dhi);
    return [lo ?? nlo, hi ?? nhi];
  }

  const [dlo, dhi] = extent(ys);
  const [nlo, nhi] = niceBounds(polar ? Math.min(0, dlo) : dlo, dhi);
  return [lo ?? (polar ? 0 : nlo), hi ?? nhi];
}

/* ------------------------------------------------------------------ *
 * Reference lines + annotations
 * ------------------------------------------------------------------ */

function resolveReferences(
  specs: PlotReferenceSpec[],
  xAxis: PlotAxisSpec,
  yAxis: PlotAxisSpec,
  y2Axis: PlotAxisSpec | undefined,
  system: UnitSystem,
  scope: Record<string, unknown>,
): ResolvedReference[] {
  const out: ResolvedReference[] = [];
  for (const ref of specs) {
    const axis = ref.axis === "x" ? "x" : ref.axis === "y2" ? "y2" : "y";
    const unit = axis === "x" ? xAxis.unit : axis === "y2" ? y2Axis?.unit : yAxis.unit;
    let value: number | undefined;
    const expr = ref.expr?.trim();
    if (expr) {
      try {
        value = toAxisNumber(math.parse(expr).evaluate({ ...scope }), unit, system);
      } catch {
        value = undefined;
      }
    } else if (ref.value != null && Number.isFinite(ref.value)) {
      value = ref.value;
    }
    if (value == null || !Number.isFinite(value)) continue;
    out.push({ id: ref.id, axis, value, label: ref.label, color: ref.color, dash: ref.dash });
  }
  return out;
}

function resolveAnnotations(specs: PlotAnnotationSpec[]): ResolvedAnnotation[] {
  const out: ResolvedAnnotation[] = [];
  for (const a of specs) {
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) continue;
    out.push({ id: a.id, x: a.x, y: a.y, text: String(a.text ?? ""), color: a.color });
  }
  return out;
}

function defaultBounds(xAxis: PlotAxisSpec, yAxis: PlotAxisSpec): PlotBounds {
  return {
    xMin: finiteOr(xAxis.min, 0),
    xMax: finiteOr(xAxis.max, 1),
    yMin: finiteOr(yAxis.min, 0),
    yMax: finiteOr(yAxis.max, 1),
  };
}

/* ------------------------------------------------------------------ *
 * Value helpers (shared model with the rest of the engine)
 * ------------------------------------------------------------------ */

/** A real unit string, or undefined for blank / dash placeholders. */
function realUnit(unit: string | undefined): string | undefined {
  if (!unit) return undefined;
  const t = unit.trim();
  if (t === "" || t === "—" || t === "-" || t === "–") return undefined;
  return t;
}

/** Attach a unit to a bare number for binding into the eval scope. */
function attachUnit(value: number, unit: string | undefined): unknown {
  const u = realUnit(unit);
  if (!u) return value;
  try {
    return math.unit(value, u);
  } catch {
    return value;
  }
}

/**
 * Convert an evaluated value to a plain axis number in the target display unit,
 * reusing the engine's `toDisplayUnit` so a plotted value behaves exactly like a
 * region result. Throws a typed error for anything non-numeric.
 */
function toAxisNumber(value: unknown, unit: string | undefined, system: UnitSystem): number {
  const display = toDisplayUnit(value, realUnit(unit), system);
  if (isUnit(display)) {
    const u = display as Unit;
    return u.toNumber(u.formatUnits());
  }
  if (typeof display === "number") return display;
  if (typeof display === "boolean") return display ? 1 : 0;
  const n = Number(display);
  if (Number.isFinite(n)) return n;
  throw new CalcEngineError(
    makeError(
      "domain",
      "This value can't be plotted as a number.",
      "Plot a numeric expression, or one that reduces to a number.",
    ),
  );
}

/** Flatten a mathjs value (matrix / nested array / scalar) to a 1-D array. */
function flatten1D(value: unknown): unknown[] {
  let v = value;
  if (math.isMatrix(v)) v = (v as { toArray(): unknown[] }).toArray();
  if (Array.isArray(v)) {
    const out: unknown[] = [];
    for (const el of v) {
      if (Array.isArray(el)) out.push(...el);
      else out.push(el);
    }
    return out;
  }
  return [v];
}

/* ------------------------------------------------------------------ *
 * Numeric helpers
 * ------------------------------------------------------------------ */

function linspace(lo: number, hi: number, n: number): number[] {
  if (n <= 1) return [lo];
  const out = new Array<number>(n);
  const step = (hi - lo) / (n - 1);
  for (let i = 0; i < n; i += 1) out[i] = lo + step * i;
  return out;
}

/** Geometric (log-evenly-spaced) samples across a strictly-positive [lo, hi]. */
function logspace(lo: number, hi: number, n: number): number[] {
  if (n <= 1) return [lo];
  const a = Math.log10(lo);
  const b = Math.log10(hi);
  const step = (b - a) / (n - 1);
  const out = new Array<number>(n);
  for (let i = 0; i < n; i += 1) out[i] = 10 ** (a + step * i);
  return out;
}

function clampInt(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(value)));
}

function finiteOr(value: number | undefined, fallback: number): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

function extent(values: number[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1];
  return [lo, hi];
}

/**
 * Round a data extent out to clean axis bounds (Heckbert "nice numbers"), with a
 * little headroom so the trace never touches the frame. Degenerate spans pad by 1.
 */
export function niceBounds(min: number, max: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  const range = niceNum(max - min, false);
  const step = niceNum(range / 4, true);
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

/** Nearest "nice" number (1/2/5 × 10ⁿ) to `value`, rounding or taking the ceiling. */
export function niceNum(value: number, round: boolean): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const f = value / 10 ** exp;
  let nf: number;
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
}
