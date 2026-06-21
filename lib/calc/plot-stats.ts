/**
 * Pure statistical helpers for data-driven plots (histograms, box plots).
 *
 * Light, synchronous, deterministic numeric work — same contract as the rest of
 * `/lib/calc` (client = worker = Node). No DOM, no async, no worker: binning and
 * quantiles over a sample vector are cheap, so they belong in the pure engine
 * alongside `plot.ts`. Heavier statistics (KDE, distribution fitting) would move
 * behind the worker backend, but the box/histogram primitives here never need it.
 */

/** A single histogram bar: the half-open span [x0, x1) and its sample count. */
export interface Bin {
  x0: number;
  x1: number;
  count: number;
}

/** Five-number summary + mean and Tukey outliers for a box-and-whisker plot. */
export interface BoxStats {
  /** Lower whisker — the smallest sample within 1.5·IQR of Q1. */
  min: number;
  q1: number;
  median: number;
  q3: number;
  /** Upper whisker — the largest sample within 1.5·IQR of Q3. */
  max: number;
  mean: number;
  /** Samples beyond the 1.5·IQR fences. */
  outliers: number[];
}

/** Drop non-finite values and return the data sorted ascending (a fresh array). */
function finiteSorted(data: readonly number[]): number[] {
  const out: number[] = [];
  for (const v of data) if (Number.isFinite(v)) out.push(v);
  out.sort((a, b) => a - b);
  return out;
}

/**
 * The p-quantile (0–1) of an already-sorted array, linearly interpolated
 * (the "type 7" / NumPy default). Empty ⇒ NaN; clamps p to [0, 1].
 */
export function quantile(sorted: readonly number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const pos = Math.min(1, Math.max(0, p)) * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const frac = pos - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

/**
 * Tukey box-plot statistics over a sample vector. Whiskers extend to the most
 * extreme samples within 1.5·IQR of the quartiles; anything past the fences is an
 * outlier. Returns null when there's no finite data to summarise.
 */
export function boxStats(data: readonly number[]): BoxStats | null {
  const s = finiteSorted(data);
  if (s.length === 0) return null;

  const q1 = quantile(s, 0.25);
  const median = quantile(s, 0.5);
  const q3 = quantile(s, 0.75);
  const iqr = q3 - q1;
  const loFence = q1 - 1.5 * iqr;
  const hiFence = q3 + 1.5 * iqr;

  let whiskerLo = Infinity;
  let whiskerHi = -Infinity;
  const outliers: number[] = [];
  for (const v of s) {
    if (v < loFence || v > hiFence) {
      outliers.push(v);
      continue;
    }
    if (v < whiskerLo) whiskerLo = v;
    if (v > whiskerHi) whiskerHi = v;
  }
  // No in-fence samples (all outliers, e.g. n=1 degenerate) ⇒ clamp to the quartiles.
  if (!Number.isFinite(whiskerLo) || !Number.isFinite(whiskerHi)) {
    whiskerLo = q1;
    whiskerHi = q3;
  }

  let sum = 0;
  for (const v of s) sum += v;

  return { min: whiskerLo, q1, median, q3, max: whiskerHi, mean: sum / s.length, outliers };
}

/**
 * Bin a sample vector into a histogram. `binCount` overrides the automatic choice
 * (Freedman–Diaconis bin width, falling back to Sturges when the IQR is zero or
 * the sample is tiny). The last bin is closed so the maximum sample is counted.
 * Returns an empty array when there's no finite data.
 */
export function histogramBins(data: readonly number[], binCount?: number): Bin[] {
  const s = finiteSorted(data);
  const n = s.length;
  if (n === 0) return [];

  const lo = s[0];
  const hi = s[n - 1];
  // Degenerate spread — one unit-wide bin centred on the value.
  if (hi === lo) {
    return [{ x0: lo - 0.5, x1: lo + 0.5, count: n }];
  }

  const k = clampInt(binCount ?? autoBinCount(s), 1, 200);
  const width = (hi - lo) / k;
  const bins: Bin[] = [];
  for (let i = 0; i < k; i += 1) {
    bins.push({ x0: lo + width * i, x1: lo + width * (i + 1), count: 0 });
  }
  for (const v of s) {
    // Map to a bin index; the final bin is closed on the right so `hi` lands in it.
    let idx = Math.floor((v - lo) / width);
    if (idx >= k) idx = k - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  }
  return bins;
}

/** Freedman–Diaconis bin count, with a Sturges fallback for zero-IQR / tiny samples. */
function autoBinCount(sorted: readonly number[]): number {
  const n = sorted.length;
  const lo = sorted[0];
  const hi = sorted[n - 1];
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const sturges = Math.ceil(Math.log2(n) + 1);
  if (iqr <= 0 || n < 4) return Math.max(1, sturges);
  const width = (2 * iqr) / Math.cbrt(n);
  if (!(width > 0)) return Math.max(1, sturges);
  return Math.max(1, Math.ceil((hi - lo) / width));
}

function clampInt(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(value)));
}
