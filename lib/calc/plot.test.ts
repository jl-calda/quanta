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

describe("evaluatePlot — per-trace styling + data source", () => {
  it("carries the per-trace line width through to the result", () => {
    const res = evaluatePlot(
      xy({ traces: [{ id: "a", expr: "x", width: 3.5 }, { id: "b", expr: "2*x" }] }),
    );
    expect(res.traces[0].width).toBe(3.5);
    expect(res.traces[1].width).toBeUndefined(); // renderer applies its default
  });

  it("gives each trace its OWN x data when xData is set (multiple data sources)", () => {
    const res = evaluatePlot(
      {
        kind: "xy",
        x: {},
        y: {},
        xData: "ax", // plot-level x for traces that don't override
        traces: [
          { id: "a", expr: "ay" }, // uses plot-level ax
          { id: "b", expr: "by", xData: "bx" }, // its own source
        ],
      },
      { ax: [1, 2, 3], ay: [10, 20, 30], bx: [5, 6], by: [50, 60] },
    );
    expect(res.traces[0].points).toEqual([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ]);
    expect(res.traces[1].points).toEqual([
      { x: 5, y: 50 },
      { x: 6, y: 60 },
    ]);
  });

  it("spans x bounds across an override trace instead of clipping it to the sweep span", () => {
    // Plot is a sweep over x∈[0,6], but a trace overrides with data out past 6.
    const res = evaluatePlot(
      xy({
        x: {}, // unpinned x so bounds are derived
        traces: [
          { id: "sweep", expr: "x" },
          { id: "data", expr: "ys", xData: "xs" },
        ],
      }),
      { xs: [10, 20], ys: [1, 2] },
    );
    expect(res.bounds.xMax).toBeGreaterThanOrEqual(20); // override trace not clipped
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

describe("evaluatePlot — contour (2D z = f(x, y) sampling)", () => {
  const contour = (over: Partial<PlotSpec> = {}): PlotSpec => ({
    kind: "contour",
    xVar: "x",
    yVar: "y",
    x: { min: 0, max: 2 },
    y: { min: 0, max: 2 },
    grid: { x: 3, y: 3 },
    z: { expr: "x + y" },
    traces: [],
    ...over,
  });

  it("samples z = f(x, y) on a regular grid (rows by y, cols by x)", () => {
    const res = evaluatePlot(contour());
    expect(res.kind).toBe("contour");
    expect(res.empty).toBe(false);
    const g = res.contour;
    expect(g).toBeDefined();
    expect(g!.x).toEqual([0, 1, 2]);
    expect(g!.y).toEqual([0, 1, 2]);
    expect(g!.z).toHaveLength(3); // ny rows
    expect(g!.z[0]).toHaveLength(3); // nx cols
    expect(g!.z[0][0]).toBe(0); // x=0, y=0
    expect(g!.z[2][2]).toBe(4); // x=2, y=2
    expect(g!.z[1][2]).toBe(3); // x=2 (col), y=1 (row)
    expect(g!.error).toBeUndefined();
  });

  it("attaches x/y units and converts z to the z unit", () => {
    const res = evaluatePlot(
      contour({
        x: { min: 0, max: 2, unit: "m" },
        y: { min: 0, max: 2, unit: "m" },
        z: { expr: "x * y", unit: "m^2" },
      }),
    );
    const g = res.contour!;
    expect(g.zUnit).toBe("m^2");
    expect(g.z[2][2]).toBe(4); // (2 m)·(2 m) = 4 m²
  });

  it("marks non-finite samples as NaN gaps without erroring", () => {
    const res = evaluatePlot(contour({ z: { expr: "1/(x-y)" } }));
    const g = res.contour!;
    expect(g.error).toBeUndefined();
    expect(Number.isNaN(g.z[0][0])).toBe(true); // x==y → 1/0 → gap
    expect(Number.isFinite(g.z[0][2])).toBe(true); // x=2, y=0 → 1/2
  });

  it("surfaces an undefined name (every point fails) as a typed error", () => {
    const res = evaluatePlot(contour({ z: { expr: "k * x" } }));
    expect(res.contour?.error).toBeDefined();
    expect(res.empty).toBe(true);
  });

  it("computes ascending band levels spanning the z scale", () => {
    const g = evaluatePlot(contour({ surface: { levels: 4 } })).contour!;
    expect(g.levels.length).toBe(5); // nBands + 1
    for (let i = 1; i < g.levels.length; i += 1) expect(g.levels[i]).toBeGreaterThan(g.levels[i - 1]);
    expect(g.levels[0]).toBeCloseTo(g.zMin);
    expect(g.levels.at(-1)).toBeCloseTo(g.zMax);
  });

  it("honors pinned z.min / z.max as the colour scale", () => {
    const g = evaluatePlot(contour({ z: { expr: "x + y", min: 0, max: 10 } })).contour!;
    expect(g.zMin).toBe(0);
    expect(g.zMax).toBe(10);
  });

  it("is empty (no grid) when the z expression is blank", () => {
    const res = evaluatePlot(contour({ z: { expr: "" } }));
    expect(res.empty).toBe(true);
    expect(res.contour).toBeUndefined();
  });

  it("is empty (no grid) when the x or y range is unset", () => {
    expect(evaluatePlot(contour({ x: {} })).contour).toBeUndefined();
    expect(evaluatePlot(contour({ y: {} })).empty).toBe(true);
  });
});

describe("evaluatePlot — surface (projected-wireframe sampling)", () => {
  /** A configured surface spec; override per test. */
  function surf(over: Partial<PlotSpec> = {}): PlotSpec {
    return { kind: "surface", xVar: "x", yVar: "y", x: { min: 0, max: 2 }, y: { min: 0, max: 2 }, grid: { x: 3, y: 3 }, z: { expr: "x+y" }, ...over };
  }

  it("samples z = f(x, y) over the grid", () => {
    const res = evaluatePlot(surf());
    const s = res.surface!;
    expect(s).toBeDefined();
    expect(res.kind).toBe("surface");
    expect(res.empty).toBe(false);
    expect(res.contour).toBeUndefined();
    expect(s.xs).toEqual([0, 1, 2]);
    expect(s.ys).toEqual([0, 1, 2]);
    expect(s.z).toHaveLength(3); // ny rows
    expect(s.z[0]).toHaveLength(3); // nx cols
    expect(s.z[0][0]).toBe(0); // x=0, y=0
    expect(s.z[1][1]).toBe(2); // x=1, y=1
    expect(s.z[2][2]).toBe(4); // x=2, y=2
    expect(s.zMin).toBe(0);
    expect(s.zMax).toBe(4);
    expect(s.error).toBeUndefined();
  });

  it("honors the grid resolution per axis", () => {
    const s = evaluatePlot(surf({ grid: { x: 5, y: 2 } })).surface!;
    expect(s.xs).toHaveLength(5);
    expect(s.ys).toHaveLength(2);
    expect(s.z).toHaveLength(2);
    expect(s.z[0]).toHaveLength(5);
  });

  it("is unit-aware on x, y, and z", () => {
    const s = evaluatePlot(
      surf({ x: { min: 0, max: 2, unit: "m" }, y: { min: 0, max: 2, unit: "m" }, z: { expr: "x*y", unit: "m^2" } }),
    ).surface!;
    expect(s.z[2][2]).toBe(4); // 2 m · 2 m = 4 m²
    expect(s.zUnit).toBe("m^2");
    expect(evaluatePlot(surf({ x: { min: 0, max: 2, unit: "m" } })).xUnit).toBe("m");
  });

  it("drops non-finite cells as gaps without erroring the surface", () => {
    const s = evaluatePlot(surf({ z: { expr: "sqrt(x-1)" }, x: { min: 0, max: 2 }, grid: { x: 3, y: 2 } })).surface!;
    expect(s.error).toBeUndefined();
    expect(s.z[0][0]).toBeNull(); // sqrt(-1) ⇒ complex ⇒ gap
    expect(s.z[0][2]).toBe(1); // sqrt(1)
    expect(s.empty).toBe(false);
  });

  it("leaves the surface unset when z is blank (placeholder fallback)", () => {
    const res = evaluatePlot(surf({ z: { expr: "" } }));
    expect(res.surface).toBeUndefined();
    expect(res.empty).toBe(true);
  });

  it("leaves the surface unset when an x/y range is missing", () => {
    expect(evaluatePlot(surf({ x: {} })).surface).toBeUndefined();
    expect(evaluatePlot(surf({ y: { min: 0 } })).surface).toBeUndefined();
  });

  it("samples against the worksheet scope", () => {
    const s = evaluatePlot(surf({ z: { expr: "k*x+y" } }), { k: 2 }).surface!;
    expect(s.z[0][2]).toBe(4); // 2·2 + 0
    expect(s.z[2][0]).toBe(2); // 2·0 + 2
  });

  it("errors when z references an undefined name on every cell", () => {
    const res = evaluatePlot(surf({ z: { expr: "k*x+y" } })); // no scope
    expect(res.surface?.error).toBeDefined();
    expect(res.surface?.empty).toBe(true);
    expect(res.errorCount).toBe(1);
  });

  it("carries a parse error on the surface", () => {
    const res = evaluatePlot(surf({ z: { expr: "x +" } }));
    expect(res.surface?.error?.kind).toBe("parse");
    expect(res.surface?.empty).toBe(true);
  });

  it("errors on a z unit mismatch (every cell)", () => {
    const res = evaluatePlot(surf({ x: { min: 0, max: 2, unit: "m" }, z: { expr: "x", unit: "kN" } }));
    expect(res.surface?.error?.kind).toBe("unit-mismatch");
  });

  it("honors a pinned z.min / z.max for the height scale", () => {
    const s = evaluatePlot(surf({ z: { expr: "x*y", min: 0, max: 10 } })).surface!;
    expect(s.zMin).toBe(0);
    expect(s.zMax).toBe(10);
  });

  it("reports a constant z as a flat sheet (zMin === zMax)", () => {
    const s = evaluatePlot(surf({ z: { expr: "5" } })).surface!;
    expect(s.empty).toBe(false);
    expect(s.zMin).toBe(5);
    expect(s.zMax).toBe(5);
    expect(s.z[0][0]).toBe(5);
  });

  it("clamps the grid resolution to 2..200", () => {
    const s = evaluatePlot(surf({ grid: { x: 1, y: 500 } })).surface!;
    expect(s.xs).toHaveLength(2);
    expect(s.ys).toHaveLength(200);
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

describe("evaluatePlot — histogram", () => {
  it("bins a data vector into bars and counts every sample", () => {
    const res = evaluatePlot({
      kind: "histogram",
      histogram: { bins: 4 },
      traces: [{ id: "h", expr: "[0, 1, 2, 3, 4, 5, 6, 7]" }],
    });
    expect(res.kind).toBe("histogram");
    expect(res.empty).toBe(false);
    const bins = res.traces[0].bins!;
    expect(bins).toHaveLength(4);
    const total = bins.reduce((a, b) => a + b.count, 0);
    expect(total).toBe(8);
    // y-axis spans the count, x-axis spans the data.
    expect(res.bounds.yMin).toBe(0);
    expect(res.bounds.xMin).toBe(0);
    expect(res.bounds.xMax).toBe(7);
  });

  it("errors a trace whose expression is undefined, without throwing", () => {
    const res = evaluatePlot({ kind: "histogram", traces: [{ id: "h", expr: "missing_name" }] });
    expect(res.traces[0].error).toBeDefined();
    expect(res.empty).toBe(true);
  });
});

describe("evaluatePlot — boxplot", () => {
  it("summarises each trace's data vector as a box", () => {
    const res = evaluatePlot({
      kind: "boxplot",
      traces: [{ id: "b", expr: "[1, 2, 3, 4, 5]" }],
    });
    expect(res.kind).toBe("boxplot");
    const box = res.traces[0].box!;
    expect(box.median).toBe(3);
    expect(box.q1).toBeCloseTo(2, 10);
    expect(box.q3).toBeCloseTo(4, 10);
    expect(res.empty).toBe(false);
    // x is categorical (one box), y spans the values.
    expect(res.bounds.xMax).toBe(1);
  });
});

describe("evaluatePlot — parametric", () => {
  it("traces (x(t), y(t)) over the parameter range", () => {
    const res = evaluatePlot({
      kind: "parametric",
      param: { var: "t", min: 0, max: 1 },
      samples: 5,
      traces: [{ id: "p", expr: "t", xExpr: "2*t" }],
    });
    expect(res.kind).toBe("parametric");
    const pts = res.traces[0].points;
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[4]).toEqual({ x: 2, y: 1 });
  });

  it("plots y(t) against t when x(t) is blank", () => {
    const res = evaluatePlot({
      kind: "parametric",
      param: { var: "t", min: 0, max: 2 },
      samples: 3,
      traces: [{ id: "p", expr: "t^2" }],
    });
    const pts = res.traces[0].points;
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[2]).toEqual({ x: 2, y: 4 });
  });

  it("does not force the bare parameter through the x-axis unit when x(t) is blank", () => {
    const res = evaluatePlot({
      kind: "parametric",
      param: { var: "t", min: 0, max: 2 },
      samples: 3,
      x: { unit: "s" }, // a unit on x must not break the dimensionless parameter
      traces: [{ id: "p", expr: "t" }],
    });
    expect(res.traces[0].error).toBeUndefined();
    expect(res.traces[0].points).toHaveLength(3);
    expect(res.traces[0].points[2]).toEqual({ x: 2, y: 2 });
  });
});

describe("evaluatePlot — vector field", () => {
  it("samples F(x, y) = (u, v) on a grid into one synthetic trace", () => {
    const res = evaluatePlot({
      kind: "vector",
      vector: { u: "1", v: "0" },
      grid: { x: 3, y: 3 },
      x: { min: 0, max: 1 },
      y: { min: 0, max: 1 },
    });
    expect(res.kind).toBe("vector");
    const vecs = res.traces[0].vectors!;
    expect(vecs).toHaveLength(9);
    expect(vecs[0].u).toBe(1);
    expect(vecs[0].v).toBe(0);
    expect(vecs[0].mag).toBe(1);
    expect(res.empty).toBe(false);
  });

  it("normalizes arrows to unit length while keeping the magnitude", () => {
    const res = evaluatePlot({
      kind: "vector",
      vector: { u: "3", v: "4", normalize: true },
      grid: { x: 2, y: 2 },
      x: { min: 0, max: 1 },
      y: { min: 0, max: 1 },
    });
    const v = res.traces[0].vectors![0];
    expect(Math.hypot(v.u, v.v)).toBeCloseTo(1, 10);
    expect(v.mag).toBeCloseTo(5, 10);
  });

  it("is empty (not thrown) when components are unset", () => {
    const res = evaluatePlot({ kind: "vector", vector: { u: "", v: "" } });
    expect(res.empty).toBe(true);
    expect(res.traces[0].vectors).toEqual([]);
  });
});
