/**
 * Axis scale transforms — pure, deterministic (client = worker = Node).
 *
 * The plot engine returns trace values in DISPLAY UNITS (untransformed); these
 * helpers apply a scale only where it's needed: the renderer uses {@link scaleForward}
 * to position points/ticks in pixels, and the engine uses {@link resolveScale} +
 * {@link niceLogBounds} to pick clean auto bounds. Keeping the transform in one pure
 * module means the engine and renderer agree on log/symlog positioning without a
 * parallel implementation — and the hover read-out / legend / export still see the
 * real values, never `log10(y)`.
 */

export type AxisScale = "linear" | "log" | "symlog";

/** Minimal axis shape needed to resolve a scale (back-compat with the legacy `log` flag). */
export interface ScaleAxis {
  scale?: AxisScale;
  /** Deprecated boolean kept for back-compat; `scale` wins when both are set. */
  log?: boolean;
  /** Symlog linear-region half-width (the threshold around 0); defaults to 1. */
  linthresh?: number;
}

const DEFAULT_LINTHRESH = 1;

/** Effective scale: an explicit `scale` wins; a legacy `log: true` maps to "log". */
export function resolveScale(axis: ScaleAxis | undefined): AxisScale {
  if (!axis) return "linear";
  if (axis.scale) return axis.scale;
  return axis.log ? "log" : "linear";
}

/** The symlog linear threshold for an axis (positive, finite; defaults to 1). */
export function linthreshOf(axis: ScaleAxis | undefined): number {
  const l = axis?.linthresh;
  return l != null && Number.isFinite(l) && l > 0 ? l : DEFAULT_LINTHRESH;
}

/**
 * Map a data value into a monotonic transformed space used for pixel positioning.
 *  • linear — identity.
 *  • log — log10(v); a non-positive `v` is clamped to a tiny positive so the result
 *    is far below any real bound (callers drop non-positive data upstream / clamp pixels).
 *  • symlog — linear within ±linthresh, logarithmic beyond (matplotlib-style),
 *    continuous and monotonic across 0.
 */
export function scaleForward(scale: AxisScale, linthresh: number, v: number): number {
  if (scale === "log") return Math.log10(v > 0 ? v : Number.MIN_VALUE);
  if (scale === "symlog") {
    const L = linthresh > 0 ? linthresh : DEFAULT_LINTHRESH;
    const a = Math.abs(v);
    if (a <= L) return v / L;
    return Math.sign(v) * (1 + Math.log10(a / L));
  }
  return v;
}

/** Inverse of {@link scaleForward}. */
export function scaleInverse(scale: AxisScale, linthresh: number, t: number): number {
  if (scale === "log") return 10 ** t;
  if (scale === "symlog") {
    const L = linthresh > 0 ? linthresh : DEFAULT_LINTHRESH;
    const a = Math.abs(t);
    if (a <= 1) return t * L;
    return Math.sign(t) * L * 10 ** (a - 1);
  }
  return t;
}

/** Decade ticks (…, 1, 10, 100, …) within a positive [min, max], thinned to ≤ ~`maxCount`. */
export function logTicks(min: number, max: number, maxCount = 6): number[] {
  if (!(max > 0)) return [1];
  const lo = min > 0 ? min : max / 1000;
  const e0 = Math.floor(Math.log10(lo) + 1e-9);
  const e1 = Math.ceil(Math.log10(max) - 1e-9);
  const decades: number[] = [];
  for (let e = e0; e <= e1; e += 1) {
    const v = 10 ** e;
    if (v >= lo * (1 - 1e-9) && v <= max * (1 + 1e-9)) decades.push(v);
  }
  if (decades.length === 0) return [10 ** e0];
  const step = Math.ceil(decades.length / maxCount);
  return step <= 1 ? decades : decades.filter((_, i) => i % step === 0);
}

/** Ticks for a symlog axis: 0, ±linthresh, and decade ticks ±L·10ᵏ out to the bounds. */
export function symlogTicks(min: number, max: number, linthresh: number, maxCount = 7): number[] {
  const L = linthresh > 0 ? linthresh : DEFAULT_LINTHRESH;
  const set = new Set<number>([0]);
  if (max >= L) {
    const e1 = Math.ceil(Math.log10(max / L) - 1e-9);
    for (let e = 0; e <= e1; e += 1) set.add(L * 10 ** e);
  }
  if (min <= -L) {
    const e1 = Math.ceil(Math.log10(Math.abs(min) / L) - 1e-9);
    for (let e = 0; e <= e1; e += 1) set.add(-L * 10 ** e);
  }
  const ticks = [...set].filter((v) => v >= min - 1e-9 && v <= max + 1e-9).sort((a, b) => a - b);
  if (ticks.length <= maxCount) return ticks;
  const step = Math.ceil(ticks.length / maxCount);
  return ticks.filter((_, i) => i % step === 0);
}

/**
 * Snap a data extent out to clean power-of-10 bounds for a log axis. Guards against
 * non-positive input (which has no log): a non-positive `max` falls back to [1, 10],
 * and a non-positive `min` is clamped to ~max/1000 so the lower bound stays positive.
 */
export function niceLogBounds(min: number, max: number): [number, number] {
  if (!Number.isFinite(max) || max <= 0) return [1, 10];
  const hi = 10 ** Math.ceil(Math.log10(max) - 1e-9);
  const loData = min > 0 && Number.isFinite(min) ? min : max / 1000;
  let lo = 10 ** Math.floor(Math.log10(loData) + 1e-9);
  if (!(lo > 0) || lo >= hi) lo = hi / 10;
  return [lo, hi];
}
