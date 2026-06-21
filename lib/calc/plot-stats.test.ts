import { describe, expect, it } from "vitest";
import { boxStats, histogramBins, quantile } from "./plot-stats";

describe("quantile", () => {
  it("interpolates linearly (type 7 / NumPy default)", () => {
    const s = [1, 2, 3, 4]; // already sorted
    expect(quantile(s, 0)).toBe(1);
    expect(quantile(s, 1)).toBe(4);
    expect(quantile(s, 0.5)).toBeCloseTo(2.5, 10);
    expect(quantile(s, 0.25)).toBeCloseTo(1.75, 10);
    expect(quantile(s, 0.75)).toBeCloseTo(3.25, 10);
  });

  it("handles single-element and empty arrays", () => {
    expect(quantile([7], 0.3)).toBe(7);
    expect(Number.isNaN(quantile([], 0.5))).toBe(true);
  });
});

describe("boxStats", () => {
  it("computes the five-number summary and mean", () => {
    const b = boxStats([1, 2, 3, 4, 5])!;
    expect(b.median).toBe(3);
    expect(b.q1).toBeCloseTo(2, 10);
    expect(b.q3).toBeCloseTo(4, 10);
    expect(b.mean).toBe(3);
    expect(b.outliers).toEqual([]);
    expect(b.min).toBe(1);
    expect(b.max).toBe(5);
  });

  it("flags points beyond the 1.5·IQR fences as outliers and clamps whiskers", () => {
    const b = boxStats([10, 11, 12, 13, 14, 100])!;
    expect(b.outliers).toContain(100);
    // The upper whisker is the largest in-fence sample, not the outlier.
    expect(b.max).toBeLessThan(100);
  });

  it("returns null for all-non-finite / empty data", () => {
    expect(boxStats([])).toBeNull();
    expect(boxStats([NaN, Infinity])).toBeNull();
  });
});

describe("histogramBins", () => {
  it("bins across the data range and counts every finite sample", () => {
    const bins = histogramBins([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect(bins).toHaveLength(5);
    const total = bins.reduce((a, b) => a + b.count, 0);
    expect(total).toBe(11);
    // First edge at the min, last edge at the max.
    expect(bins[0].x0).toBe(0);
    expect(bins[bins.length - 1].x1).toBe(10);
  });

  it("closes the final bin so the maximum sample is counted", () => {
    const bins = histogramBins([0, 5, 10], 2);
    const total = bins.reduce((a, b) => a + b.count, 0);
    expect(total).toBe(3);
  });

  it("chooses a bin count automatically when none is given", () => {
    const bins = histogramBins([1, 2, 2, 3, 3, 3, 4, 4, 5]);
    expect(bins.length).toBeGreaterThanOrEqual(1);
    const total = bins.reduce((a, b) => a + b.count, 0);
    expect(total).toBe(9);
  });

  it("handles a degenerate (zero-spread) sample with one bin", () => {
    const bins = histogramBins([4, 4, 4]);
    expect(bins).toHaveLength(1);
    expect(bins[0].count).toBe(3);
  });

  it("returns no bins for empty data", () => {
    expect(histogramBins([])).toEqual([]);
  });
});
