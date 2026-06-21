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
  /** y expression sampled over `xVar` (sweep), or a vector expression (data). */
  expr: string;
  style?: PlotTraceStyle;
  color?: string;
  dash?: boolean;
  hidden?: boolean;
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
  /** Second independent variable for contour/surface (z = f(x, y); default "y"). */
  yVar?: string;
  /** Explicit x data expression (a vector) — switches the plot to data mode. */
  xData?: string;
  x?: PlotAxisSpec;
  y?: PlotAxisSpec;
  /** z = f(x, y) expression + scale, sampled over the (x, y) grid (contour/surface). */
  z?: PlotZSpec;
  /** Sampling grid resolution (contour/surface). */
  grid?: PlotGridSpec;
  /** Display options (contour/surface). */
  surface?: PlotSurfaceSpec;
  traces?: PlotTraceSpec[];
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
  /** Sampled 2D field for `kind === "contour"`; undefined otherwise. */
  contour?: ContourResult;
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
  const xUnit = realUnit(xAxis.unit);
  const yUnit = realUnit(yAxis.unit);

  // contour samples a real 2D z = f(x, y) field (rendered as iso-bands by ./contour);
  // 3D surface stays typed-but-inert this pass — the view shows a 'configure' placeholder.
  if (kind === "contour") {
    return sampleGrid(spec, xAxis, yAxis, xUnit ?? null, yUnit ?? null, externalScope, system);
  }
  if (kind === "surface") {
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
 * 2D grid sampling (contour) — z = f(x, y) over the (x, y) ranges
 * ------------------------------------------------------------------ */

type ContourBase = {
  kind: "contour";
  traces: TraceResult[];
  bounds: PlotBounds;
  xUnit: string | null;
  yUnit: string | null;
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
