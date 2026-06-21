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
import { CalcEngineError, classifyThrow, makeError } from "./errors";
import type { CalcError, UnitSystem } from "./types";
import { boxStats, histogramBins, type Bin, type BoxStats } from "./plot-stats";

export type { Bin, BoxStats } from "./plot-stats";

/* ------------------------------------------------------------------ *
 * Input contract (structurally satisfied by lib/worksheet's PlotRegion,
 * so the engine stays decoupled from the content tree).
 * ------------------------------------------------------------------ */

export type PlotKind =
  | "xy"
  | "polar"
  | "contour"
  | "surface"
  | "histogram"
  | "boxplot"
  | "parametric"
  | "vector";
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

export interface PlotAxisSpec {
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
  log?: boolean;
}

export interface PlotTraceSpec {
  id: string;
  label?: string;
  /**
   * y expression sampled over `xVar` (sweep) or a vector expression (data);
   * for `parametric` this is y(t), and for histogram/boxplot the data vector.
   */
  expr: string;
  /** x(t) for a `parametric` trace, swept alongside `expr` over the parameter. */
  xExpr?: string;
  style?: PlotTraceStyle;
  color?: string;
  dash?: boolean;
  hidden?: boolean;
}

export interface PlotSpec {
  kind?: PlotKind;
  /** Independent variable swept across the x-axis (default "x"); θ for polar. */
  xVar?: string;
  /** Second grid variable for `vector` fields (default "y"). */
  yVar?: string;
  /** Explicit x data expression (a vector) — switches the plot to data mode. */
  xData?: string;
  x?: PlotAxisSpec;
  y?: PlotAxisSpec;
  traces?: PlotTraceSpec[];
  /** Sweep / parameter sample count; clamped to 2–400. */
  samples?: number;
  /** Histogram options — bin count (auto when omitted). */
  histogram?: { bins?: number };
  /** Vector-field components F(x, y) = (u, v); `normalize` draws unit arrows. */
  vector?: { u?: string; v?: string; normalize?: boolean };
  /** Grid resolution for the vector field (per axis; clamped 2–60). */
  grid?: { x?: number; y?: number };
  /** Parameter for a `parametric` plot — `var` swept over [min, max]. */
  param?: { var?: string; min?: number; max?: number };
}

/* ------------------------------------------------------------------ *
 * Output
 * ------------------------------------------------------------------ */

export interface PlotPoint {
  /** x-axis position (xy) or angle θ in radians (polar), in display units. */
  x: number;
  /** y-axis value (xy) or radius r (polar), in display units. */
  y: number;
}

/** One arrow of a vector field: a base point (x, y) and its (u, v) components. */
export interface VectorSample {
  x: number;
  y: number;
  u: number;
  v: number;
  /** √(u² + v²) — the field magnitude, for colour / scaling. */
  mag: number;
}

export interface TraceResult {
  id: string;
  label: string;
  style: PlotTraceStyle;
  color?: string;
  dash?: boolean;
  hidden: boolean;
  /** Sampled points in display units; empty on error or a blank expression. */
  points: PlotPoint[];
  /** Histogram bars (kind `histogram`). */
  bins?: Bin[];
  /** Box-and-whisker summary (kind `boxplot`). */
  box?: BoxStats;
  /** Field arrows (kind `vector`). */
  vectors?: VectorSample[];
  error?: CalcError;
  /** True when the trace has no expression yet. */
  empty: boolean;
}

export interface PlotBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface PlotResult {
  kind: PlotKind;
  traces: TraceResult[];
  bounds: PlotBounds;
  /** Unit label actually used on each axis (after conversion), or null. */
  xUnit: string | null;
  yUnit: string | null;
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
  const xUnit = realUnit(xAxis.unit);
  const yUnit = realUnit(yAxis.unit);

  // contour/surface are typed-but-inert this pass — the view shows a placeholder.
  if (kind === "contour" || kind === "surface") {
    return {
      kind,
      traces: [],
      bounds: defaultBounds(xAxis, yAxis),
      xUnit: xUnit ?? null,
      yUnit: yUnit ?? null,
      errorCount: 0,
      empty: true,
    };
  }

  // Data-driven + parametric + field kinds each have their own sampler; they reuse
  // the engine's value model / unit conversion but not the x sweep / data zip path.
  if (kind === "histogram") return evaluateHistogram(spec, xAxis, yAxis, xUnit, yUnit, externalScope, system);
  if (kind === "boxplot") return evaluateBoxplot(spec, xAxis, yAxis, yUnit, externalScope, system);
  if (kind === "parametric") return evaluateParametric(spec, xAxis, yAxis, xUnit, yUnit, externalScope, system);
  if (kind === "vector") return evaluateVector(spec, xAxis, yAxis, xUnit, yUnit, externalScope, system);

  const polar = kind === "polar";
  const xVar = spec.xVar?.trim() || (polar ? "theta" : "x");
  const traces = spec.traces ?? [];
  const dataExpr = spec.xData?.trim();

  // Resolve the x sampling: data vector, or a linear sweep of [min, max].
  const sampling = resolveSampling(dataExpr, xAxis, polar, spec.samples, externalScope, system);

  const traceResults: TraceResult[] = traces.map((t) =>
    evaluateTrace(t, sampling, xVar, yUnit, system, externalScope),
  );

  const errorCount = traceResults.filter((t) => t.error).length;
  const drawable = traceResults.filter((t) => !t.hidden && t.points.length > 0);
  const empty = drawable.length === 0;

  return {
    kind,
    traces: traceResults,
    bounds: computeBounds(traceResults, xAxis, yAxis, sampling, polar),
    xUnit: xUnit ?? null,
    yUnit: yUnit ?? null,
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
  const display = linspace(lo, hi, n);
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

  // (xDisplay, rawY) pairs — one per sample. In data mode the whole expression
  // evaluates once to a vector (a scalar broadcasts to a constant line).
  let pairs: { x: number; raw: unknown }[];
  try {
    pairs = sampling.mode === "data"
      ? zipData(node, sampling.display, scope)
      : sweep(node, sampling, xVar, scope);
  } catch (error) {
    return { ...base, points: [], empty: false, error: classifyThrow(error) };
  }

  // Convert each raw y to a plain axis number; non-finite values are gaps.
  // A conversion that fails on EVERY point (e.g. a unit mismatch) errors the
  // trace; failing on SOME points (a domain gap) just drops those points.
  const points: PlotPoint[] = [];
  let firstError: unknown = null;
  for (const { x, raw } of pairs) {
    if (raw === undefined || !Number.isFinite(x)) continue;
    let y: number;
    try {
      y = toAxisNumber(raw, yUnit, system);
    } catch (error) {
      if (!firstError) firstError = error;
      continue;
    }
    if (Number.isFinite(y)) points.push({ x, y });
  }

  if (points.length === 0 && firstError) {
    return { ...base, points: [], empty: false, error: classifyThrow(firstError) };
  }
  return { ...base, points, empty: false };
}

/** Sweep mode: bind each x sample to `xVar` and evaluate. Per-sample throws are gaps. */
function sweep(
  node: MathNode,
  sampling: Sampling,
  xVar: string,
  scope: Record<string, unknown>,
): { x: number; raw: unknown }[] {
  const out: { x: number; raw: unknown }[] = [];
  let allThrew: unknown = null;
  let evaluated = 0;
  for (let i = 0; i < sampling.raw.length; i += 1) {
    try {
      const raw = node.evaluate({ ...scope, [xVar]: sampling.raw[i] });
      evaluated += 1;
      out.push({ x: sampling.display[i], raw });
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
  xDisplay: number[],
  scope: Record<string, unknown>,
): { x: number; raw: unknown }[] {
  const ys = flatten1D(node.evaluate({ ...scope }));
  const out: { x: number; raw: unknown }[] = [];
  for (let i = 0; i < xDisplay.length; i += 1) {
    const raw = ys.length === 1 ? ys[0] : ys[i];
    out.push({ x: xDisplay[i], raw });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Histogram / box plot / parametric / vector-field kinds
 * (light pure samplers; reuse the engine value model, never the sweep path)
 * ------------------------------------------------------------------ */

/** Shared display fields for a trace result (mirrors `evaluateTrace`'s base). */
function makeTraceBase(trace: PlotTraceSpec) {
  return {
    id: trace.id,
    label: trace.label?.trim() || trace.expr.trim() || "trace",
    style: trace.style ?? ("line" as PlotTraceStyle),
    color: trace.color,
    dash: trace.dash,
    hidden: !!trace.hidden,
  };
}

/** Evaluate an expression to a flat 1-D array of raw (possibly unit-bearing) values. */
function evalDataVector(expr: string, scope: Record<string, unknown>): unknown[] {
  return flatten1D(math.parse(expr).evaluate({ ...scope }));
}

/** Convert raw values to plain display numbers; tracks the first conversion error. */
function rawToNumbers(
  raw: unknown[],
  unit: string | undefined,
  system: UnitSystem,
): { values: number[]; firstError: unknown } {
  const values: number[] = [];
  let firstError: unknown = null;
  for (const r of raw) {
    try {
      const n = toAxisNumber(r, unit, system);
      if (Number.isFinite(n)) values.push(n);
    } catch (error) {
      if (!firstError) firstError = error;
    }
  }
  return { values, firstError };
}

/** Histogram: bin each trace's data vector along the x (value) axis; y is the count. */
function evaluateHistogram(
  spec: PlotSpec,
  xAxis: PlotAxisSpec,
  yAxis: PlotAxisSpec,
  xUnit: string | undefined,
  yUnit: string | undefined,
  scope: Record<string, unknown>,
  system: UnitSystem,
): PlotResult {
  const traces = spec.traces ?? [];
  const binCount = spec.histogram?.bins;
  let maxCount = 0;
  let xLo = Infinity;
  let xHi = -Infinity;

  const traceResults: TraceResult[] = traces.map((t) => {
    const base = makeTraceBase(t);
    if (base.hidden) return { ...base, points: [], empty: false };
    const expr = t.expr?.trim() ?? "";
    if (!expr) return { ...base, points: [], empty: true };
    let raw: unknown[];
    try {
      raw = evalDataVector(expr, scope);
    } catch (error) {
      return { ...base, points: [], empty: false, error: classifyThrow(error) };
    }
    const { values, firstError } = rawToNumbers(raw, xAxis.unit, system);
    if (values.length === 0) {
      return { ...base, points: [], empty: false, error: firstError ? classifyThrow(firstError) : undefined };
    }
    const bins = histogramBins(values, binCount);
    for (const b of bins) {
      if (b.count > maxCount) maxCount = b.count;
      if (b.x0 < xLo) xLo = b.x0;
      if (b.x1 > xHi) xHi = b.x1;
    }
    return { ...base, points: [], bins, empty: false };
  });

  const drawable = traceResults.filter((t) => !t.hidden && t.bins && t.bins.length > 0);
  const [, niceCount] = niceBounds(0, maxCount);
  return {
    kind: "histogram",
    traces: traceResults,
    bounds: {
      xMin: finiteOr(xAxis.min, Number.isFinite(xLo) ? xLo : 0),
      xMax: finiteOr(xAxis.max, Number.isFinite(xHi) ? xHi : 1),
      yMin: finiteOr(yAxis.min, 0),
      yMax: finiteOr(yAxis.max, niceCount),
    },
    xUnit: xUnit ?? null,
    yUnit: yUnit ?? null,
    errorCount: traceResults.filter((t) => t.error).length,
    empty: drawable.length === 0,
  };
}

/** Box plot: a five-number summary per trace's data vector; x is categorical. */
function evaluateBoxplot(
  spec: PlotSpec,
  xAxis: PlotAxisSpec,
  yAxis: PlotAxisSpec,
  yUnit: string | undefined,
  scope: Record<string, unknown>,
  system: UnitSystem,
): PlotResult {
  const traces = spec.traces ?? [];
  let yLo = Infinity;
  let yHi = -Infinity;

  const traceResults: TraceResult[] = traces.map((t) => {
    const base = makeTraceBase(t);
    if (base.hidden) return { ...base, points: [], empty: false };
    const expr = t.expr?.trim() ?? "";
    if (!expr) return { ...base, points: [], empty: true };
    let raw: unknown[];
    try {
      raw = evalDataVector(expr, scope);
    } catch (error) {
      return { ...base, points: [], empty: false, error: classifyThrow(error) };
    }
    const { values, firstError } = rawToNumbers(raw, yAxis.unit, system);
    if (values.length === 0) {
      return { ...base, points: [], empty: false, error: firstError ? classifyThrow(firstError) : undefined };
    }
    const box = boxStats(values);
    if (!box) return { ...base, points: [], empty: false };
    for (const v of [box.min, box.max, ...box.outliers]) {
      if (v < yLo) yLo = v;
      if (v > yHi) yHi = v;
    }
    return { ...base, points: [], box, empty: false };
  });

  const drawable = traceResults.filter((t) => !t.hidden && t.box);
  const [nlo, nhi] = niceBounds(Number.isFinite(yLo) ? yLo : 0, Number.isFinite(yHi) ? yHi : 1);
  return {
    kind: "boxplot",
    traces: traceResults,
    bounds: {
      xMin: 0,
      xMax: Math.max(1, drawable.length),
      yMin: finiteOr(yAxis.min, nlo),
      yMax: finiteOr(yAxis.max, nhi),
    },
    xUnit: null, // categorical — one box per trace
    yUnit: yUnit ?? null,
    errorCount: traceResults.filter((t) => t.error).length,
    empty: drawable.length === 0,
  };
}

/** Parametric: sweep a parameter `t` and trace (x(t), y(t)) — reuses the xy renderer. */
function evaluateParametric(
  spec: PlotSpec,
  xAxis: PlotAxisSpec,
  yAxis: PlotAxisSpec,
  xUnit: string | undefined,
  yUnit: string | undefined,
  scope: Record<string, unknown>,
  system: UnitSystem,
): PlotResult {
  const traces = spec.traces ?? [];
  const pvar = spec.param?.var?.trim() || "t";
  let lo = spec.param?.min;
  let hi = spec.param?.max;
  if (!Number.isFinite(lo as number) || !Number.isFinite(hi as number) || lo === hi) {
    lo = 0;
    hi = 1;
  }
  const n = clampInt(spec.samples ?? DEFAULT_SAMPLES, 2, 400);
  const tvals = linspace(lo as number, hi as number, n);

  const traceResults: TraceResult[] = traces.map((t) => {
    const base = makeTraceBase(t);
    if (base.hidden) return { ...base, points: [], empty: false };
    const yExpr = t.expr?.trim() ?? "";
    if (!yExpr) return { ...base, points: [], empty: true };
    let yNode: MathNode;
    let xNode: MathNode | null = null;
    try {
      yNode = math.parse(yExpr);
      if (t.xExpr?.trim()) xNode = math.parse(t.xExpr);
    } catch (error) {
      return { ...base, points: [], empty: false, error: classifyThrow(error) };
    }

    const points: PlotPoint[] = [];
    let firstError: unknown = null;
    let allThrew: unknown = null;
    let evaluated = 0;
    for (const tv of tvals) {
      try {
        const s = { ...scope, [pvar]: tv };
        const yRaw = yNode.evaluate(s);
        const xRaw = xNode ? xNode.evaluate(s) : null;
        evaluated += 1;
        let x: number;
        let y: number;
        try {
          // Blank x(t) ⇒ plot y(t) against the raw (dimensionless) parameter t —
          // don't force the parameter through the x-axis unit conversion.
          x = xRaw === null ? tv : toAxisNumber(xRaw, xAxis.unit, system);
          y = toAxisNumber(yRaw, yAxis.unit, system);
        } catch (error) {
          if (!firstError) firstError = error;
          continue;
        }
        if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
      } catch (error) {
        if (!allThrew) allThrew = error;
      }
    }
    if (evaluated === 0 && allThrew) return { ...base, points: [], empty: false, error: classifyThrow(allThrew) };
    if (points.length === 0 && firstError) return { ...base, points: [], empty: false, error: classifyThrow(firstError) };
    return { ...base, points, empty: false };
  });

  const pts = traceResults.filter((t) => !t.hidden).flatMap((t) => t.points);
  const [xlo, xhi] = extent(pts.map((p) => p.x));
  const [ylo, yhi] = extent(pts.map((p) => p.y));
  const [nxlo, nxhi] = niceBounds(xlo, xhi);
  const [nylo, nyhi] = niceBounds(ylo, yhi);
  return {
    kind: "parametric",
    traces: traceResults,
    bounds: {
      xMin: finiteOr(xAxis.min, nxlo),
      xMax: finiteOr(xAxis.max, nxhi),
      yMin: finiteOr(yAxis.min, nylo),
      yMax: finiteOr(yAxis.max, nyhi),
    },
    xUnit: xUnit ?? null,
    yUnit: yUnit ?? null,
    errorCount: traceResults.filter((t) => t.error).length,
    empty: traceResults.filter((t) => !t.hidden && t.points.length > 0).length === 0,
  };
}

/** Vector field: sample F(x, y) = (u, v) on an x/y grid into one synthetic trace. */
function evaluateVector(
  spec: PlotSpec,
  xAxis: PlotAxisSpec,
  yAxis: PlotAxisSpec,
  xUnit: string | undefined,
  yUnit: string | undefined,
  scope: Record<string, unknown>,
  system: UnitSystem,
): PlotResult {
  const uExpr = spec.vector?.u?.trim() ?? "";
  const vExpr = spec.vector?.v?.trim() ?? "";
  const xVar = spec.xVar?.trim() || "x";
  const yVar = spec.yVar?.trim() || "y";
  const gx = clampInt(spec.grid?.x ?? 12, 2, 60);
  const gy = clampInt(spec.grid?.y ?? 12, 2, 60);
  const x0 = finiteOr(xAxis.min, 0);
  const x1 = finiteOr(xAxis.max, 1);
  const y0 = finiteOr(yAxis.min, 0);
  const y1 = finiteOr(yAxis.max, 1);
  const bounds: PlotBounds = { xMin: x0, xMax: x1, yMin: y0, yMax: y1 };
  const base = {
    id: "field",
    label: "F(x, y)",
    style: "line" as PlotTraceStyle,
    color: spec.traces?.[0]?.color,
    dash: false,
    hidden: false,
  };

  if (!uExpr || !vExpr) {
    return {
      kind: "vector",
      traces: [{ ...base, points: [], vectors: [], empty: true }],
      bounds,
      xUnit: xUnit ?? null,
      yUnit: yUnit ?? null,
      errorCount: 0,
      empty: true,
    };
  }

  let uNode: MathNode;
  let vNode: MathNode;
  try {
    uNode = math.parse(uExpr);
    vNode = math.parse(vExpr);
  } catch (error) {
    return {
      kind: "vector",
      traces: [{ ...base, points: [], vectors: [], empty: false, error: classifyThrow(error) }],
      bounds,
      xUnit: xUnit ?? null,
      yUnit: yUnit ?? null,
      errorCount: 1,
      empty: true,
    };
  }

  const xs = linspace(x0, x1, gx);
  const ys = linspace(y0, y1, gy);
  const vectors: VectorSample[] = [];
  let firstError: unknown = null;
  let allThrew: unknown = null;
  let evaluated = 0;
  for (const yj of ys) {
    for (const xi of xs) {
      try {
        const s = { ...scope, [xVar]: attachUnit(xi, xAxis.unit), [yVar]: attachUnit(yj, yAxis.unit) };
        const uRaw = uNode.evaluate(s);
        const vRaw = vNode.evaluate(s);
        evaluated += 1;
        let u: number;
        let v: number;
        try {
          u = toAxisNumber(uRaw, undefined, system);
          v = toAxisNumber(vRaw, undefined, system);
        } catch (error) {
          if (!firstError) firstError = error;
          continue;
        }
        if (Number.isFinite(u) && Number.isFinite(v)) {
          const mag = Math.hypot(u, v);
          let uu = u;
          let vv = v;
          if (spec.vector?.normalize && mag > 0) {
            uu = u / mag;
            vv = v / mag;
          }
          vectors.push({ x: xi, y: yj, u: uu, v: vv, mag });
        }
      } catch (error) {
        if (!allThrew) allThrew = error;
      }
    }
  }

  let error: CalcError | undefined;
  if (evaluated === 0 && allThrew) error = classifyThrow(allThrew);
  else if (vectors.length === 0 && firstError) error = classifyThrow(firstError);
  return {
    kind: "vector",
    traces: [{ ...base, points: [], vectors, empty: vectors.length === 0 && !error, error }],
    bounds,
    xUnit: xUnit ?? null,
    yUnit: yUnit ?? null,
    errorCount: error ? 1 : 0,
    empty: vectors.length === 0,
  };
}

/* ------------------------------------------------------------------ *
 * Axis bounds
 * ------------------------------------------------------------------ */

function computeBounds(
  traces: TraceResult[],
  xAxis: PlotAxisSpec,
  yAxis: PlotAxisSpec,
  sampling: Sampling,
  polar: boolean,
): PlotBounds {
  const pts = traces.filter((t) => !t.hidden).flatMap((t) => t.points);

  // x bounds: pinned, else the sweep span, else the data extent.
  let xMin = xAxis.min;
  let xMax = xAxis.max;
  if (xMin == null || xMax == null) {
    if (sampling.span) {
      xMin = xMin ?? sampling.span.lo;
      xMax = xMax ?? sampling.span.hi;
    } else {
      const [lo, hi] = extent(pts.map((p) => p.x));
      xMin = xMin ?? lo;
      xMax = xMax ?? hi;
    }
  }

  // y bounds: pinned, else the data extent (padded + rounded). Polar pins yMin=0
  // so the radius scales from the centre.
  let yMin = yAxis.min;
  let yMax = yAxis.max;
  if (yMin == null || yMax == null) {
    const [lo, hi] = extent(pts.map((p) => p.y));
    const [nlo, nhi] = niceBounds(polar ? Math.min(0, lo) : lo, hi);
    yMin = yMin ?? (polar ? 0 : nlo);
    yMax = yMax ?? nhi;
  }

  return {
    xMin: finiteOr(xMin, 0),
    xMax: finiteOr(xMax, polar ? TAU : 1),
    yMin: finiteOr(yMin, 0),
    yMax: finiteOr(yMax, 1),
  };
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
