import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluatePlot, type PlotSpec } from "@/lib/calc";
import { PlotFigure, type PlotFigureProps } from "./plot-present";

/**
 * DONE WHEN: a plot with a secondary log axis, a reference line, and error bars
 * renders correctly. The figure is the pure SVG renderer used in the editor,
 * history, and export, so a static render is a faithful proof it draws.
 */
function render(spec: PlotSpec, region: PlotFigureProps["region"]): string {
  const result = evaluatePlot(spec);
  return renderToStaticMarkup(createElement(PlotFigure, { result, region }));
}

describe("PlotFigure — Phase 2 refinements", () => {
  it("renders a secondary log axis + reference line + error bars without throwing", () => {
    const spec: PlotSpec = {
      kind: "xy",
      xVar: "x",
      x: { min: 1, max: 100 },
      y: { label: "force", unit: "kN" },
      y2: { label: "stress", unit: "MPa", scale: "log" },
      samples: 12,
      traces: [
        { id: "a", expr: "x", axis: "y" },
        { id: "b", expr: "x^2", axis: "y2", errorExpr: "x", errorMode: "bar" },
      ],
      references: [{ id: "r", axis: "y", value: 40, label: "capacity" }],
      annotations: [{ id: "n", x: 50, y: 50, text: "peak" }],
    };
    const region: PlotFigureProps["region"] = {
      kind: "xy",
      xVar: "x",
      x: spec.x,
      y: spec.y,
      y2: spec.y2,
    };

    const svg = render(spec, region);

    // It produced an SVG, the secondary axis label, the reference label, and the annotation.
    expect(svg).toContain("<svg");
    expect(svg).toContain("stress");
    expect(svg).toContain("capacity");
    expect(svg).toContain("peak");

    // The engine fed the renderer the data that proves the three features are live.
    const result = evaluatePlot(spec);
    expect(result.bounds.y2Max).toBeGreaterThan(0); // secondary axis materialised
    expect(result.y2Unit).toBe("MPa");
    expect(result.traces[1].points.some((p) => p.err != null)).toBe(true); // error bars
    expect(result.traces[1].points.every((p) => p.y > 0)).toBe(true); // log-axis drop
    expect(result.references).toHaveLength(1);

    // No NaN coordinates leaked into the SVG geometry.
    expect(svg).not.toContain("NaN");
  });

  it("renders an error band variant", () => {
    const spec: PlotSpec = {
      kind: "xy",
      x: { min: 0, max: 5 },
      y: {},
      samples: 8,
      traces: [{ id: "t", expr: "x^2", errorExpr: "2", errorMode: "band" }],
    };
    const svg = render(spec, { kind: "xy", xVar: "x", x: spec.x, y: spec.y });
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("NaN");
  });
});
