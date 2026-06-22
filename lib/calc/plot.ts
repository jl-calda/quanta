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
 * Both 2D kinds sample a `z = f(x, y)` field over the (x, y) grid (pure, sync —
 * closed-form `node.evaluate` per cell, the same class of work as a sweep):
 * `contour` renders it as iso-bands (geometry in `./contour`), `surface` as a
 * projected wireframe. Their config round-trips through the content schema.
 */
import { math } from "./math";
import type { MathNode, Unit } from "./math";
import { toDisplayUnit, SI_SYSTEM, isUnit } from "./units";
import { resolveScale, niceLogBounds, type AxisScale } from "./plot-scale";
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
  /** Line weight in px (renderer default 2). */
  width?: number;
  /** Per-trace x override (a vector expression) — its own data source; falls back to the plot `xData`. */
  xData?: string;
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

/** z = f(x, y) field expression + scale, for contour/surface. */
export interface PlotZSpec {
  expr?: string;
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
}

/** Sampling grid resolution for contour/surface (each clamped to 2–200). */
export interface PlotGridSpec {
  x?: number;
  y?: number;
}

/** Display options for contour/surface. */
export interface PlotSurfaceSpec {
  /** Number of iso-bands (contour); clamped to 1–64. */
  levels?: number;
  /** Filled bands (default) vs. iso-lines only. */
  filled?: boolean;
  colormap?: string;
  wireframe?: boolean;
  showScale?: boolean;
}

export interface PlotSpec {
  kind?: PlotKind;
  /** Independent variable swept across the x-axis (default "x"); θ for polar. */
  xVar?: string;
  /** Second independent variable for contour/surface (z = f(x, y)) and `vector` grids (default "y"). */
  yVar?: string;
  /** Explicit x data expression (a vector) — switches the plot to data mode. */
  xData?: string;
  x?: PlotAxisSpec;
  y?: PlotAxisSpec;
  /** Optional secondary y-axis; traces with `axis: "y2"` map onto it. */
  y2?: PlotAxisSpec;
  /** z = f(x, y) expression + scale, sampled over the (x, y) grid (contour/surface). */
  z?: PlotZSpec;
  /** Sampling grid resolution (contour/surface). */
  grid?: PlotGridSpec;
  /** Display options (contour/surface). */
  surface?: PlotSurfaceSpec;
  traces?: PlotTraceSpec[];
  references?: PlotReferenceSpec[];
  annotations?: PlotAnnotationSpec[];
  /** Sweep / parameter sample count; clamped to 2–400. */
  samples?: number;
  /** Histogram options — bin count (auto when omitted). */
  histogram?: { bins?: number };
  /** Vector-field components F(x, y) = (u, v); `normalize` draws unit arrows. */
  vector?: { u?: string; v?: string; normalize?: boolean };
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
  /** ± error half-width in the trace's y-axis unit (sampled from `errorExpr`). */
  err?: number;
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
  /** Line weight in px (renderer default 2 when unset). */
  width?: number;
  hidden: boolean;
  /** Which y-axis this trace maps onto (primary "y" or secondary "y2"). */
  axis: PlotAxisId;
  /** How to draw `point.err`, when present. */
  errorMode?: PlotErrorMode;
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

/**
 * A sampled 2D field `z = f(x, y)` for a contour plot. `z[iy][ix]` is the value
 * at `(x[ix], y[iy])` in display units; `NaN` marks a gap (a non-finite result or
 * a per-point domain miss). `levels` are the ascending band boundaries the
 * renderer fills/strokes. Pure data — the iso-band geometry lives in `./contour`.
 */
export interface ContourResult {
  /** x sample positions (length nx), in display units. */
  x: number[];
  /** y sample positions (length ny), in display units. */
  y: number[];
  /** z[iy][ix] — row-major by y; NaN = gap. */
  z: number[][];
  /** Finite z extent across the grid (or the pinned z.min / z.max scale). */
  zMin: number;
  zMax: number;
  /** Ascending band boundaries (nBands + 1 values) spanning [zMin, zMax]. */
  levels: number[];
  /** z display unit, or null. */
  zUnit: string | null;
  /** z symbol/label for the colour scale. */
  zLabel: string;
  /** Set when the z expression fails everywhere (parse / undefined name). */
  error?: CalcError;
}

/**
 * A sampled `z = f(x, y)` grid for the projected-wireframe surface renderer. `z`
 * is row-major `[yi][xi]` in display units; `null` marks a gap (a non-finite or
 * throwing cell — same gap semantics as a swept trace).
 */
export interface PlotSurface {
  /** x sample positions in display units (length nx). */
  xs: number[];
  /** y sample positions in display units (length ny). */
  ys: number[];
  /** z grid in display units, indexed [yi][xi]; null = gap. */
  z: (number | null)[][];
  /** z extent across finite cells (or the pinned z.min/z.max). */
  zMin: number;
  zMax: number;
  /** Unit label used on the z axis (after conversion), or null. */
  zUnit: string | null;
  /** Render hint from the region (wireframe is the only mode this pass). */
  wireframe: boolean;
  /** True when no cell is finite (blank/structural) — the view stays a placeholder. */
  empty: boolean;
  /** A structural error (parse / undefined name / unit mismatch) — surfaced once. */
  error?: CalcError;
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
  /** Sampled 2D field for `kind === "contour"`; undefined otherwise. */
  contour?: ContourResult;
  /** Sampled grid for `kind === "surface"`; undefined otherwise. */
  surface?: PlotSurface;
}

const DEFAULT_SAMPLES = 80;
const DEFAULT_GRID = 24;
const DEFAULT_LEVELS = 8;
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

  // Both 2D kinds sample a real z = f(x, y) field over the grid: contour renders it
  // as iso-bands (./contour), surface as a projected wireframe (./regions/plot-present).
  if (kind === "contour") {
    return sampleGrid(spec, xAxis, yAxis, xUnit ?? null, yUnit ?? null, externalScope, system);
  }
  if (kind === "surface") {
    return sampleSurface(spec, xAxis, yAxis, xUnit ?? null, yUnit ?? null, externalScope, system);
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

  const xScale = resolveScale(xAxis);
  const yScale = resolveScale(yAxis);
  const y2Scale = resolveScale(y2Axis);

  // Resolve the plot-level x sampling: data vector, or a sweep of [min, max] (log-spaced on a log x).
  const sampling = resolveSampling(dataExpr, xAxis, xScale, polar, spec.samples, externalScope, system);

  // A trace may carry its OWN x (multiple data sources): resolve a per-trace sampling
  // for it, else fall back to the shared plot sampling. `anyTraceXData` tells the
  // bounds pass to span the union of points rather than the plot sweep span.
  let anyTraceXData = false;
  const traceResults: TraceResult[] = traces.map((t) => {
    const onY2 = t.axis === "y2";
    const own = t.xData?.trim();
    let traceSampling = sampling;
    if (own) {
      anyTraceXData = true;
      traceSampling = resolveSampling(own, xAxis, xScale, polar, spec.samples, externalScope, system);
    }
    return evaluateTrace(
      t,
      traceSampling,
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
    bounds: computeBounds(traceResults, xAxis, yAxis, y2Axis, sampling, polar, anyTraceXData),
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

export interface Sampling {
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

export function resolveSampling(
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
 * 2D grid sampling (contour) — z = f(x, y) over the (x, y) ranges
 * ------------------------------------------------------------------ */

type ContourBase = {
  kind: "contour";
  traces: TraceResult[];
  bounds: PlotBounds;
  xUnit: string | null;
  yUnit: string | null;
  y2Unit: null;
  references: ResolvedReference[];
  annotations: ResolvedAnnotation[];
};

/**
 * Sample a contour's `z = f(x, y)` over a regular grid spanning the x/y ranges,
 * unit-aware and reusing the same value model as the 1D sweep: `xVar`/`yVar` are
 * bound carrying their axis units and each z is converted to the z display unit.
 * Pure and synchronous — a default 24×24 grid is the same evaluation order as a
 * sweep, so no worker is needed. Per-point throws / non-finite results are NaN
 * gaps; a z expression that fails to PARSE, or throws at EVERY point (e.g. an
 * undefined name), or whose conversion fails at every point (a unit mismatch),
 * surfaces a single typed error — exactly mirroring the 1D trace error model.
 */
function sampleGrid(
  spec: PlotSpec,
  xAxis: PlotAxisSpec,
  yAxis: PlotAxisSpec,
  xUnit: string | null,
  yUnit: string | null,
  scope: Record<string, unknown>,
  system: UnitSystem,
): PlotResult {
  const zUnit = realUnit(spec.z?.unit) ?? null;
  const zLabel = spec.z?.label?.trim() || "z";
  const base: ContourBase = {
    kind: "contour",
    traces: [],
    bounds: defaultBounds(xAxis, yAxis),
    xUnit,
    yUnit,
    y2Unit: null,
    references: [],
    annotations: [],
  };

  const expr = spec.z?.expr?.trim() ?? "";
  const xVar = spec.xVar?.trim() || "x";
  const yVar = spec.yVar?.trim() || "y";

  // A contour needs a z expression AND finite, non-degenerate x and y ranges.
  const xLo = xAxis.min;
  const xHi = xAxis.max;
  const yLo = yAxis.min;
  const yHi = yAxis.max;
  const ranged =
    xLo != null && xHi != null && yLo != null && yHi != null &&
    Number.isFinite(xLo) && Number.isFinite(xHi) && Number.isFinite(yLo) && Number.isFinite(yHi) &&
    xLo !== xHi && yLo !== yHi;
  if (!expr || !ranged) return { ...base, errorCount: 0, empty: true };

  let node: MathNode;
  try {
    node = math.parse(expr);
  } catch (error) {
    return contourError(base, zUnit, zLabel, classifyThrow(error));
  }

  const nx = clampInt(spec.grid?.x ?? DEFAULT_GRID, 2, 200);
  const ny = clampInt(spec.grid?.y ?? DEFAULT_GRID, 2, 200);
  const xs = linspace(xLo!, xHi!, nx);
  const ys = linspace(yLo!, yHi!, ny);
  const xRaw = xs.map((v) => attachUnit(v, xAxis.unit));
  const yRaw = ys.map((v) => attachUnit(v, yAxis.unit));

  const z: number[][] = [];
  let zMin = Infinity;
  let zMax = -Infinity;
  let nodeOk = 0;
  let finiteCount = 0;
  let firstNodeThrow: unknown = null;
  let firstConvError: unknown = null;

  for (let iy = 0; iy < ny; iy += 1) {
    const row = new Array<number>(nx).fill(NaN);
    for (let ix = 0; ix < nx; ix += 1) {
      let raw: unknown;
      try {
        raw = node.evaluate({ ...scope, [xVar]: xRaw[ix], [yVar]: yRaw[iy] });
      } catch (error) {
        if (!firstNodeThrow) firstNodeThrow = error;
        continue; // row[ix] stays NaN (gap)
      }
      nodeOk += 1;
      try {
        const n = toAxisNumber(raw, spec.z?.unit, system);
        if (Number.isFinite(n)) {
          row[ix] = n;
          finiteCount += 1;
          if (n < zMin) zMin = n;
          if (n > zMax) zMax = n;
        }
      } catch (error) {
        if (!firstConvError) firstConvError = error;
      }
    }
    z.push(row);
  }

  // Threw on every point ⇒ a structural error (undefined name, bad expression).
  if (nodeOk === 0 && firstNodeThrow) return contourError(base, zUnit, zLabel, classifyThrow(firstNodeThrow));
  // Converted nowhere: a unit mismatch surfaces; otherwise the whole field is a gap.
  if (finiteCount === 0) {
    if (firstConvError) return contourError(base, zUnit, zLabel, classifyThrow(firstConvError));
    return { ...base, errorCount: 0, empty: true };
  }

  // Colour / level scale: pinned z.min/z.max win, else a nice rounding of the data extent.
  let scaleLo = spec.z?.min ?? null;
  let scaleHi = spec.z?.max ?? null;
  if (scaleLo == null || scaleHi == null) {
    const [nlo, nhi] = niceBounds(zMin, zMax);
    scaleLo = scaleLo ?? nlo;
    scaleHi = scaleHi ?? nhi;
  }
  if (scaleHi <= scaleLo) scaleHi = scaleLo + 1;
  const nBands = clampInt(spec.surface?.levels ?? DEFAULT_LEVELS, 1, 64);
  const levels = linspace(scaleLo, scaleHi, nBands + 1);

  return {
    ...base,
    errorCount: 0,
    empty: false,
    contour: { x: xs, y: ys, z, zMin: scaleLo, zMax: scaleHi, levels, zUnit, zLabel },
  };
}

function contourError(base: ContourBase, zUnit: string | null, zLabel: string, error: CalcError): PlotResult {
  return {
    ...base,
    errorCount: 1,
    empty: true,
    contour: { x: [], y: [], z: [], zMin: 0, zMax: 1, levels: [], zUnit, zLabel, error },
  };
}

/* ------------------------------------------------------------------ *
 * 2D grid sampling (surface) — z = f(x, y) for the projected wireframe
 * ------------------------------------------------------------------ */

type SurfaceBase = {
  kind: "surface";
  traces: TraceResult[];
  bounds: PlotBounds;
  xUnit: string | null;
  yUnit: string | null;
  y2Unit: null;
  references: ResolvedReference[];
  annotations: ResolvedAnnotation[];
};

/**
 * Sample a surface's `z = f(x, y)` over the (x, y) grid into a `[yi][xi]` grid in
 * display units for the projected-wireframe renderer. Same pure, synchronous value
 * model and error/gap semantics as the contour `sampleGrid`: a per-cell throw or
 * non-finite value is a `null` gap, while a parse failure, a throw at every cell
 * (undefined name), or a conversion that fails everywhere (unit mismatch) surfaces a
 * single typed error. An unconfigured surface (blank z / unset range) returns no
 * `surface`, so the view falls back to the 'configure' placeholder.
 */
function sampleSurface(
  spec: PlotSpec,
  xAxis: PlotAxisSpec,
  yAxis: PlotAxisSpec,
  xUnit: string | null,
  yUnit: string | null,
  scope: Record<string, unknown>,
  system: UnitSystem,
): PlotResult {
  const base: SurfaceBase = {
    kind: "surface",
    traces: [],
    bounds: defaultBounds(xAxis, yAxis),
    xUnit,
    yUnit,
    y2Unit: null,
    references: [],
    annotations: [],
  };
  const zUnit = realUnit(spec.z?.unit) ?? null;
  const wireframe = spec.surface?.wireframe ?? true;

  const expr = spec.z?.expr?.trim() ?? "";
  const xVar = spec.xVar?.trim() || "x";
  const yVar = spec.yVar?.trim() || "y";

  // A surface needs a z expression AND finite, non-degenerate x and y ranges.
  const xLo = xAxis.min;
  const xHi = xAxis.max;
  const yLo = yAxis.min;
  const yHi = yAxis.max;
  const ranged =
    xLo != null && xHi != null && yLo != null && yHi != null &&
    Number.isFinite(xLo) && Number.isFinite(xHi) && Number.isFinite(yLo) && Number.isFinite(yHi) &&
    xLo !== xHi && yLo !== yHi;
  if (!expr || !ranged) return { ...base, errorCount: 0, empty: true }; // ⇒ placeholder

  let node: MathNode;
  try {
    node = math.parse(expr);
  } catch (error) {
    return surfaceError(base, zUnit, wireframe, classifyThrow(error));
  }

  const nx = clampInt(spec.grid?.x ?? DEFAULT_GRID, 2, 200);
  const ny = clampInt(spec.grid?.y ?? DEFAULT_GRID, 2, 200);
  const xs = linspace(xLo!, xHi!, nx);
  const ys = linspace(yLo!, yHi!, ny);
  const xRaw = xs.map((v) => attachUnit(v, xAxis.unit));
  const yRaw = ys.map((v) => attachUnit(v, yAxis.unit));

  const z: (number | null)[][] = [];
  let zLo = Infinity;
  let zHi = -Infinity;
  let nodeOk = 0;
  let finiteCount = 0;
  let firstNodeThrow: unknown = null;
  let firstConvError: unknown = null;

  for (let iy = 0; iy < ny; iy += 1) {
    const row: (number | null)[] = new Array<number | null>(nx).fill(null);
    for (let ix = 0; ix < nx; ix += 1) {
      let raw: unknown;
      try {
        raw = node.evaluate({ ...scope, [xVar]: xRaw[ix], [yVar]: yRaw[iy] });
      } catch (error) {
        if (!firstNodeThrow) firstNodeThrow = error;
        continue; // row[ix] stays null (gap)
      }
      nodeOk += 1;
      try {
        const n = toAxisNumber(raw, spec.z?.unit, system);
        if (Number.isFinite(n)) {
          row[ix] = n;
          finiteCount += 1;
          if (n < zLo) zLo = n;
          if (n > zHi) zHi = n;
        }
      } catch (error) {
        if (!firstConvError) firstConvError = error;
      }
    }
    z.push(row);
  }

  // Threw on every cell ⇒ a structural error (undefined name, bad expression).
  if (nodeOk === 0 && firstNodeThrow) return surfaceError(base, zUnit, wireframe, classifyThrow(firstNodeThrow));
  // Converted nowhere: a unit mismatch surfaces; otherwise the whole field is a gap.
  if (finiteCount === 0) {
    if (firstConvError) return surfaceError(base, zUnit, wireframe, classifyThrow(firstConvError));
    return { ...base, errorCount: 0, empty: true };
  }

  // Height scale: honor pinned z.min/z.max when set, else the finite-cell extent.
  const zMin = spec.z?.min ?? zLo;
  const zMax = spec.z?.max ?? zHi;

  return {
    ...base,
    errorCount: 0,
    empty: false,
    surface: { xs, ys, z, zMin, zMax, zUnit, wireframe, empty: false },
  };
}

function surfaceError(base: SurfaceBase, zUnit: string | null, wireframe: boolean, error: CalcError): PlotResult {
  return {
    ...base,
    errorCount: 1,
    empty: true,
    surface: { xs: [], ys: [], z: [], zMin: 0, zMax: 1, zUnit, wireframe, empty: true, error },
  };
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
    width: trace.width,
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
export function sweep(
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
    axis: (trace.axis ?? "y") as PlotAxisId,
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
    y2Unit: null,
    references: [],
    annotations: [],
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
    y2Unit: null,
    references: [],
    annotations: [],
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
    y2Unit: null,
    references: [],
    annotations: [],
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
    axis: "y" as PlotAxisId,
  };

  if (!uExpr || !vExpr) {
    return {
      kind: "vector",
      traces: [{ ...base, points: [], vectors: [], empty: true }],
      bounds,
      xUnit: xUnit ?? null,
      yUnit: yUnit ?? null,
      y2Unit: null,
      references: [],
      annotations: [],
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
      y2Unit: null,
      references: [],
      annotations: [],
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
    y2Unit: null,
    references: [],
    annotations: [],
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
  y2Axis: PlotAxisSpec | undefined,
  sampling: Sampling,
  polar: boolean,
  anyTraceXData = false,
): PlotBounds {
  const visible = traces.filter((t) => !t.hidden);
  const yPts = visible.filter((t) => t.axis !== "y2").flatMap((t) => t.points);
  const y2Pts = visible.filter((t) => t.axis === "y2").flatMap((t) => t.points);
  const allPts = [...yPts, ...y2Pts];

  // x bounds: pinned always wins; else the sweep span — but when a trace overrides x
  // with its own data source the span only covers the plot-level x, so fall back to the
  // union point extent so an override trace is never clipped.
  let xMin = xAxis.min;
  let xMax = xAxis.max;
  if (xMin == null || xMax == null) {
    if (sampling.span && !anyTraceXData) {
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
export function toAxisNumber(value: unknown, unit: string | undefined, system: UnitSystem): number {
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
