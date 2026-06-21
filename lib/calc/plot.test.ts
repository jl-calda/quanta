import { describe, expect, it } from "vitest";
import { evaluatePlot, niceBounds, niceNum, type PlotSpec } from "./plot";
import { math } from "./math";

/** A minimal XY sweep spec with sensible defaults; override per test. */
function xy(over: Partial<PlotSpec> = {}): PlotSpec {
  return { kind: "xy", xVar: "x", x: { min: 0, max: 6 }, y: {}, samples: 7, traces: [], ...over };
}

describe("evaluatePlot — sweep (plot-by-formula)", () => {
  it("samples y = f(x) across the x range", () => {
    const res = evaluatePlot(xy({ traces: [{ id: "t", expr: "2*x^2" }] }));
    const t = res.traces[0];
    expect(t.error).toBeUndefined();
    expect(t.points).toHaveLength(7); // 0,1,2,3,4,5,6
    expect(t.points[0]).toEqual({ x: 0, y: 0 });
    expect(t.points.find((p) => p.x === 3)?.y).toBe(18); // 2·3²
    expect(t.points.at(-1)).toEqual({ x: 6, y: 72 });
    expect(res.empty).toBe(false);
    expect(res.errorCount).toBe(0);
  });

  it("attaches the x-axis unit and converts y to the y-axis unit", () => {
    const res = evaluatePlot(
      xy({ x: { min: 0, max: 4, unit: "m" }, y: { unit: "m^2" }, traces: [{ id: "t", expr: "x^2" }], samples: 5 }),
    );
    const t = res.traces[0];
    expect(t.error).toBeUndefined();
    expect(t.points.find((p) => p.x === 2)?.y).toBe(4); // (2 m)² = 4 m²
    expect(res.yUnit).toBe("m^2");
    expect(res.xUnit).toBe("m");
  });

  it("renders a constant expression as a flat line (the mockup's capacity series)", () => {
    const res = evaluatePlot(xy({ traces: [{ id: "c", expr: "45" }] }));
    const t = res.traces[0];
    expect(t.points).toHaveLength(7);
    expect(t.points.every((p) => p.y === 45)).toBe(true);
  });

  it("drops non-finite samples as gaps without erroring the trace", () => {
    const res = evaluatePlot(xy({ x: { min: -2, max: 2 }, traces: [{ id: "t", expr: "1/x" }], samples: 5 }));
    const t = res.traces[0];
    expect(t.error).toBeUndefined();
    expect(t.points.some((p) => p.x === 0)).toBe(false); // x=0 → ∞ → gap
    expect(t.points).toHaveLength(4);
  });
});

describe("evaluatePlot — data mode (ranges / table columns)", () => {
  it("zips an x-data vector with each trace vector", () => {
    const res = evaluatePlot(
      { kind: "xy", x: {}, y: {}, xData: "ids", traces: [{ id: "t", expr: "forces" }] },
      { ids: [1, 2, 3], forces: [10, 20, 30] },
    );
    expect(res.traces[0].points).toEqual([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ]);
  });

  it("broadcasts a scalar trace result across the x data (a constant line)", () => {
    const res = evaluatePlot(
      { kind: "xy", x: {}, y: {}, xData: "ids", traces: [{ id: "t", expr: "5" }] },
      { ids: [1, 2, 3] },
    );
    expect(res.traces[0].points.map((p) => p.y)).toEqual([5, 5, 5]);
  });

  it("converts unit-carrying column vectors to the axis unit", () => {
    const forces = [math.unit("10 kN"), math.unit("20 kN"), math.unit("30 kN")];
    const res = evaluatePlot(
      { kind: "xy", x: {}, y: { unit: "kN" }, xData: "ids", traces: [{ id: "t", expr: "forces" }] },
      { ids: [1, 2, 3], forces },
    );
    expect(res.traces[0].points.map((p) => p.y)).toEqual([10, 20, 30]);
  });
});

describe("evaluatePlot — bounds", () => {
  it("honors pinned axis bounds exactly", () => {
    const res = evaluatePlot(xy({ y: { min: 0, max: 100 }, traces: [{ id: "t", expr: "x" }] }));
    expect(res.bounds.yMin).toBe(0);
    expect(res.bounds.yMax).toBe(100);
    expect(res.bounds.xMin).toBe(0);
    expect(res.bounds.xMax).toBe(6);
  });

  it("derives clean auto bounds from the data extent", () => {
    const res = evaluatePlot(xy({ x: { min: 0, max: 10 }, traces: [{ id: "t", expr: "x" }], samples: 11 }));
    // data y-extent is 0..10 → rounded out to a nice number ≥ 10.
    expect(res.bounds.yMax).toBeGreaterThanOrEqual(10);
    expect(res.bounds.yMin).toBeLessThanOrEqual(0);
  });
});

describe("evaluatePlot — errors (one bad trace never sinks the rest)", () => {
  it("reports a unit mismatch as a typed trace error while siblings still plot", () => {
    const res = evaluatePlot(
      xy({ x: { min: 0, max: 4, unit: "m" }, traces: [{ id: "bad", expr: "x + 1 kN" }, { id: "ok", expr: "x" }] }),
    );
    expect(res.traces[0].error?.kind).toBe("unit-mismatch");
    expect(res.traces[0].points).toHaveLength(0);
    expect(res.traces[1].error).toBeUndefined();
    expect(res.traces[1].points.length).toBeGreaterThan(0);
    expect(res.errorCount).toBe(1);
  });

  it("reports a non-numeric expression as a domain error", () => {
    const res = evaluatePlot(xy({ traces: [{ id: "t", expr: '"hello"' }] }));
    expect(res.traces[0].error?.kind).toBe("domain");
  });

  it("surfaces an undefined name (every sample fails) as a parse/undefined error", () => {
    const res = evaluatePlot(xy({ traces: [{ id: "t", expr: "k * x" }] }));
    expect(res.traces[0].error).toBeDefined();
    expect(res.traces[0].points).toHaveLength(0);
  });
});

describe("evaluatePlot — empty + hidden", () => {
  it("is empty with no traces", () => {
    expect(evaluatePlot(xy()).empty).toBe(true);
  });

  it("is empty when a trace has no expression", () => {
    expect(evaluatePlot(xy({ traces: [{ id: "t", expr: "" }] })).empty).toBe(true);
  });

  it("is empty in sweep mode with no x range", () => {
    expect(evaluatePlot(xy({ x: {}, traces: [{ id: "t", expr: "2*x" }] })).empty).toBe(true);
  });

  it("skips hidden traces when deciding emptiness", () => {
    const res = evaluatePlot(xy({ traces: [{ id: "t", expr: "x", hidden: true }] }));
    expect(res.traces[0].hidden).toBe(true);
    expect(res.traces[0].points).toHaveLength(0);
    expect(res.empty).toBe(true);
  });
});

describe("evaluatePlot — log scale", () => {
  it("drops non-positive y as gaps (no log of ≤ 0) without erroring the trace", () => {
    const res = evaluatePlot(xy({ x: { min: -3, max: 3 }, y: { scale: "log" }, traces: [{ id: "t", expr: "x" }], samples: 7 }));
    const t = res.traces[0];
    expect(t.error).toBeUndefined();
    // x = -3..-1, 0 are dropped; only 1,2,3 remain.
    expect(t.points.every((p) => p.y > 0)).toBe(true);
    expect(t.points.map((p) => p.x)).toEqual([1, 2, 3]);
  });

  it("snaps auto y-bounds to powers of 10 on a log axis", () => {
    const res = evaluatePlot(xy({ x: { min: 1, max: 5 }, y: { scale: "log" }, traces: [{ id: "t", expr: "x^3" }], samples: 5 }));
    // y-extent is 1..125 → [1, 1000].
    expect(res.bounds.yMin).toBe(1);
    expect(res.bounds.yMax).toBe(1000);
  });

  it("honours a legacy log:true flag", () => {
    const res = evaluatePlot(xy({ x: { min: -2, max: 2 }, y: { log: true }, traces: [{ id: "t", expr: "x" }], samples: 5 }));
    expect(res.traces[0].points.every((p) => p.y > 0)).toBe(true);
  });
});

describe("evaluatePlot — secondary y-axis", () => {
  it("converts a y2-bound trace to the y2 unit and computes separate bounds", () => {
    const res = evaluatePlot(
      xy({
        x: { min: 0, max: 4 },
        y: { unit: "kN" },
        y2: { unit: "MPa" },
        traces: [
          { id: "a", expr: "x", axis: "y" },
          { id: "b", expr: "100*x", axis: "y2" },
        ],
        samples: 5,
      }),
    );
    expect(res.traces[0].axis).toBe("y");
    expect(res.traces[1].axis).toBe("y2");
    expect(res.y2Unit).toBe("MPa");
    // y2 data is 0..400, far above the primary axis' 0..4 — proves a separate scale.
    expect(res.bounds.y2Max).toBeGreaterThanOrEqual(400);
    expect(res.bounds.yMax).toBeLessThan(50);
  });

  it("omits y2 bounds when no trace binds to the secondary axis", () => {
    const res = evaluatePlot(xy({ y2: { unit: "MPa" }, traces: [{ id: "a", expr: "x" }] }));
    expect(res.bounds.y2Min).toBeUndefined();
    expect(res.bounds.y2Max).toBeUndefined();
  });
});

describe("evaluatePlot — reference lines", () => {
  it("passes through a literal value in the target axis unit", () => {
    const res = evaluatePlot(xy({ references: [{ id: "r", axis: "y", value: 45 }], traces: [{ id: "t", expr: "x" }] }));
    expect(res.references).toHaveLength(1);
    expect(res.references[0]).toMatchObject({ axis: "y", value: 45 });
  });

  it("resolves an expression against worksheet scope, unit-aware", () => {
    const res = evaluatePlot(
      { kind: "xy", x: { min: 0, max: 4 }, y: { unit: "kN" }, references: [{ id: "r", axis: "y", expr: "phi*Rn" }], traces: [{ id: "t", expr: "x" }], samples: 3 },
      { phi: 0.9, Rn: math.unit("100 kN") },
    );
    expect(res.references[0].value).toBeCloseTo(90); // 0.9 · 100 kN → 90 kN
  });

  it("drops an unresolvable reference rather than sinking the plot", () => {
    const res = evaluatePlot(xy({ references: [{ id: "r", axis: "y", expr: "undefined_name" }], traces: [{ id: "t", expr: "x" }] }));
    expect(res.references).toHaveLength(0);
    expect(res.empty).toBe(false);
  });
});

describe("evaluatePlot — error bars", () => {
  it("samples an error expression into a per-point ± half-width", () => {
    const res = evaluatePlot(xy({ x: { min: 0, max: 4 }, traces: [{ id: "t", expr: "x^2", errorExpr: "x", errorMode: "bar" }], samples: 5 }));
    const t = res.traces[0];
    expect(t.errorMode).toBe("bar");
    expect(t.points.find((p) => p.x === 3)?.err).toBe(3);
    expect(t.points.every((p) => p.err != null)).toBe(true);
  });

  it("converts error magnitudes to the y-axis unit", () => {
    const res = evaluatePlot(
      { kind: "xy", x: { min: 0, max: 2 }, y: { unit: "kN" }, traces: [{ id: "t", expr: "10*x kN", errorExpr: "1 kN" }], samples: 3 },
    );
    expect(res.traces[0].points.every((p) => p.err === 1)).toBe(true);
  });

  it("treats a bad error expression as no bars (never errors the trace)", () => {
    const res = evaluatePlot(xy({ traces: [{ id: "t", expr: "x", errorExpr: "(" }] }));
    expect(res.traces[0].error).toBeUndefined();
    expect(res.traces[0].points.every((p) => p.err == null)).toBe(true);
  });
});

describe("evaluatePlot — polar", () => {
  it("sweeps θ over a full turn by default and pins the radius from the centre", () => {
    const res = evaluatePlot({ kind: "polar", xVar: "theta", x: {}, y: {}, samples: 9, traces: [{ id: "r", expr: "1" }] });
    const t = res.traces[0];
    expect(t.points).toHaveLength(9);
    expect(t.points.every((p) => p.y === 1)).toBe(true); // r = 1
    expect(t.points[0].x).toBeCloseTo(0);
    expect(t.points.at(-1)!.x).toBeCloseTo(2 * Math.PI);
    expect(res.bounds.yMin).toBe(0);
    expect(res.empty).toBe(false);
  });
});

describe("evaluatePlot — contour / surface are typed-but-inert this pass", () => {
  it("returns empty (placeholder) without sampling", () => {
    for (const kind of ["contour", "surface"] as const) {
      const res = evaluatePlot({ kind, x: { min: 0, max: 1 }, y: { min: 0, max: 1 }, traces: [{ id: "t", expr: "x*y" }] });
      expect(res.empty).toBe(true);
      expect(res.traces).toHaveLength(0);
      expect(res.kind).toBe(kind);
    }
  });
});

describe("nice-number helpers", () => {
  it("rounds extents out to clean bounds", () => {
    expect(niceBounds(0, 72)).toEqual([0, 80]);
    expect(niceBounds(3, 3)).toEqual([2, 4]); // degenerate span pads by 1
  });

  it("snaps to 1/2/5 × 10ⁿ", () => {
    expect(niceNum(0.0, true)).toBe(1);
    expect(niceNum(7.3, false)).toBe(10);
    expect(niceNum(2.1, true)).toBe(2);
  });
});
