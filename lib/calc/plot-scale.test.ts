import { describe, expect, it } from "vitest";
import {
  resolveScale,
  linthreshOf,
  scaleForward,
  scaleInverse,
  logTicks,
  symlogTicks,
  niceLogBounds,
} from "./plot-scale";

describe("resolveScale", () => {
  it("prefers an explicit scale over the legacy log flag", () => {
    expect(resolveScale({ scale: "symlog", log: true })).toBe("symlog");
    expect(resolveScale({ scale: "linear" })).toBe("linear");
  });

  it("maps a legacy log:true to a log scale", () => {
    expect(resolveScale({ log: true })).toBe("log");
  });

  it("defaults to linear (including for an absent axis)", () => {
    expect(resolveScale({})).toBe("linear");
    expect(resolveScale(undefined)).toBe("linear");
  });
});

describe("linthreshOf", () => {
  it("defaults to 1 and rejects non-positive / non-finite values", () => {
    expect(linthreshOf(undefined)).toBe(1);
    expect(linthreshOf({ linthresh: 0 })).toBe(1);
    expect(linthreshOf({ linthresh: -5 })).toBe(1);
    expect(linthreshOf({ linthresh: 10 })).toBe(10);
  });
});

describe("scaleForward / scaleInverse", () => {
  it("is identity for a linear scale", () => {
    expect(scaleForward("linear", 1, 42)).toBe(42);
    expect(scaleInverse("linear", 1, 42)).toBe(42);
  });

  it("uses base-10 logs and round-trips on a log scale", () => {
    expect(scaleForward("log", 1, 100)).toBeCloseTo(2);
    for (const v of [0.1, 1, 7, 250, 9999]) {
      expect(scaleInverse("log", 1, scaleForward("log", 1, v))).toBeCloseTo(v);
    }
  });

  it("is continuous and monotonic across 0 on a symlog scale", () => {
    const L = 2;
    // linear within ±L
    expect(scaleForward("symlog", L, L)).toBeCloseTo(1);
    expect(scaleForward("symlog", L, -L)).toBeCloseTo(-1);
    expect(scaleForward("symlog", L, 0)).toBe(0);
    // one decade beyond L
    expect(scaleForward("symlog", L, L * 10)).toBeCloseTo(2);
    // strictly increasing
    const xs = [-1000, -10, -1, 0, 1, 10, 1000];
    const ts = xs.map((x) => scaleForward("symlog", L, x));
    for (let i = 1; i < ts.length; i += 1) expect(ts[i]).toBeGreaterThan(ts[i - 1]);
  });

  it("round-trips a symlog value across both regions", () => {
    for (const v of [-500, -3, -0.5, 0, 0.5, 3, 500]) {
      expect(scaleInverse("symlog", 2, scaleForward("symlog", 2, v))).toBeCloseTo(v);
    }
  });
});

describe("logTicks", () => {
  it("emits decade ticks within the bounds", () => {
    expect(logTicks(1, 1000, 6)).toEqual([1, 10, 100, 1000]);
  });

  it("guards a non-positive max", () => {
    expect(logTicks(-5, 0)).toEqual([1]);
  });
});

describe("symlogTicks", () => {
  it("includes 0, ±linthresh, and decades out to the bounds", () => {
    const ticks = symlogTicks(-100, 100, 1, 12);
    expect(ticks).toContain(0);
    expect(ticks).toContain(1);
    expect(ticks).toContain(-1);
    expect(ticks).toContain(100);
    expect(ticks).toContain(-100);
    // sorted ascending
    for (let i = 1; i < ticks.length; i += 1) expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
  });
});

describe("niceLogBounds", () => {
  it("snaps a positive extent out to powers of 10", () => {
    expect(niceLogBounds(2, 720)).toEqual([1, 1000]);
    expect(niceLogBounds(1, 100)).toEqual([1, 100]);
  });

  it("falls back safely when the data has no positive values", () => {
    expect(niceLogBounds(-10, 0)).toEqual([1, 10]);
  });

  it("clamps a non-positive min to a positive lower bound", () => {
    const [lo, hi] = niceLogBounds(0, 1000);
    expect(lo).toBeGreaterThan(0);
    expect(hi).toBe(1000);
  });
});
