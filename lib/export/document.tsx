/**
 * ExportDocument — the single, shared print renderer (Functional Brief §4.10).
 *
 * Pure and framework-agnostic on purpose: NO `"use client"`, no hooks, no
 * browser globals. The live preview overlay renders this in scaled page frames,
 * and the server renders the *same* component via `renderToStaticMarkup` into a
 * self-contained HTML string (the HTML artifact and Puppeteer's input). That
 * shared path is what makes the PDF match the screen. Math is rendered with
 * `katex.renderToString`, which runs identically in Node and the browser.
 *
 * Styling mirrors the Claude Design export mockup (`export-app.jsx`): a flowed
 * document body the browser/Puppeteer paginates natively (`break-inside: avoid`
 * on regions); page chrome (running header/footer, page numbers) is added by the
 * print engine, not here.
 */
import { Fragment, type ReactNode } from "react";
import katex from "katex";
import {
  constraintToLatex,
  contourBands,
  contourLines,
  evaluatePlot,
  evaluateProgram,
  evaluateSolve,
  evaluateTable,
  exprToLatex,
  guessSource,
  sourceToLatex,
  type RegionResult,
} from "@/lib/calc";
import {
  DEFAULT_DISPLAY,
  type MathRegion,
  type PlotRegion,
  type ProgramRegion,
  type Region,
  type RenderOnlyRegion,
  type SolveRegion,
  type TableColumn,
  type TableRegion,
  type TextRegion,
  type WorksheetContent,
} from "@/lib/worksheet/content";
import { themePalette } from "@/lib/worksheet/plot-theme";
import type { Density } from "@/lib/preferences/cookies";
import { selectInputs } from "./inputs";
import type { ExportOptions } from "./options";

/* Ink palette ported verbatim from the mockup's export context. These are the
 * printed-page colors (always light); the screen frame supplies the paper. */
const INK = "#15181D";
const MUTED = "#6B7480";
const FAINT = "#8A929C";
const HAIRLINE = "#E2E5EA";
const ROW_RULE = "#ECEEF1";
const STRONG_RULE = "#C8CDD4";
const CHROME = "#F4F5F7";

export interface ExportDocumentProps {
  title: string;
  content: WorksheetContent;
  results: Map<string, RegionResult>;
  options: ExportOptions;
  /** Optional meta shown under the title (project / by / date / rev). */
  meta?: { label: string; value: string }[];
  /**
   * Worksheet density. The component itself reads spacing from `--ws-*` CSS vars
   * (cascading from `<html data-density>` in the browser preview/print portal);
   * this field is consumed by `documentCss` (html.ts) to inject the matching
   * tokens for the Node render, where there is no `data-density`. Defaults to
   * compact (the engineering default) when omitted.
   */
  density?: Density;
}

/** Render engine TeX to KaTeX HTML (same config as the editor's KatexMath). */
export function renderTex(tex: string): string | null {
  try {
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode: false,
      output: "html",
      strict: false,
    });
  } catch {
    return null;
  }
}

function Tex({ tex, size }: { tex: string; size: number }): ReactNode {
  const html = renderTex(tex);
  if (html == null) {
    return <span style={{ fontFamily: "var(--font-mono)", fontSize: size * 0.8 }}>{tex}</span>;
  }
  return (
    <span
      className="ed-katex"
      style={{ fontSize: size }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Convert an engine name like `F_t` / `f_ub` to subscripted HTML for tables. */
function NameMath({ name }: { name: string }): ReactNode {
  const m = name.match(/^([^_]+)_(.+)$/);
  return (
    <span style={{ fontFamily: "var(--font-math)", fontStyle: "italic", fontSize: 12, color: INK }}>
      {m ? (
        <>
          {m[1]}
          <sub style={{ fontSize: "0.72em" }}>{m[2]}</sub>
        </>
      ) : (
        name
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Region blocks
 * ------------------------------------------------------------------ */

/* Worksheet density — region spacing follows the same `--ws-*` tokens as the
 * editor. In the browser preview / print portal these cascade from
 * `<html data-density>`; for the Node render `documentCss` (html.ts) injects the
 * matching block from DOC_DENSITY. The compact value is the inline fallback so
 * the vars are never undefined. Math glyph sizes are intentionally not scaled. */
const WS_INDENT = "var(--ws-indent, 22px)";
/** Indent margin for a region's nesting level (density-aware). */
function indentMargin(indent: number | undefined): string {
  return `calc(${indent || 0} * ${WS_INDENT})`;
}

function regionBoxStyle(borders: boolean, indent: number): React.CSSProperties {
  return {
    padding: borders ? "var(--ws-region-pad-y, 4px) 9px" : "var(--ws-region-pad-y, 4px) 0",
    marginLeft: indentMargin(indent),
    border: borders ? `1px solid ${HAIRLINE}` : "1px solid transparent",
    borderRadius: 3,
    marginBottom: borders ? 5 : 2,
    breakInside: "avoid",
  };
}

function MathBlock({
  region,
  result,
  options,
}: {
  region: MathRegion;
  result: RegionResult | undefined;
  options: ExportOptions;
}): ReactNode {
  if (region.disabled) return null;
  const borders = options.borders || region.border === true;
  const display = { ...DEFAULT_DISPLAY, ...(region.display ?? {}) };

  // Error region — wavy underline + message, mirroring math-region.tsx.
  if (result?.error) {
    return (
      <div style={regionBoxStyle(borders, region.indent)}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: INK,
            textDecoration: "underline wavy #C2392B",
            textUnderlineOffset: "3px",
          }}
        >
          {region.source || "(empty)"}
        </span>
        <span style={{ marginLeft: 10, font: "10.5px/1.3 var(--font-sans)", color: "#C2392B" }}>
          {result.error.message}
          {result.error.fixHint ? ` ${result.error.fixHint}` : ""}
        </span>
      </div>
    );
  }

  const style = result?.style;
  const tone = {
    fg: style?.color ?? "#1F5FBF",
    bg: style?.fill ?? "rgba(31,95,191,0.10)",
  };

  return (
    <div style={regionBoxStyle(borders, region.indent)}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          flexWrap: "wrap",
          columnGap: "0.3em",
          rowGap: "var(--ws-math-rowgap, 3px)",
        }}
      >
        {display.formula && result?.tex ? (
          <Tex tex={result.tex} size={13} />
        ) : (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: INK }}>
            {region.source}
          </span>
        )}

        {options.steps && display.substituted !== false && result?.substitutedTex && (
          <span style={{ display: "inline-flex", alignItems: "center", color: MUTED }}>
            <span style={{ fontFamily: "var(--font-math)", padding: "0 0.2em" }}>=</span>
            <Tex tex={result.substitutedTex} size={12} />
          </span>
        )}

        {display.result && result?.formatted && (
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: "0.3em" }}>
            <span style={{ fontFamily: "var(--font-math)", fontSize: 13, color: INK }}>=</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                padding: "0.5px 6px",
                borderRadius: 3,
                background: tone.bg,
                color: tone.fg,
                fontFamily: "var(--font-math)",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {result.formatted}
            </span>
            {style?.label && (
              <span
                style={{
                  font: "600 8.5px/1 var(--font-sans)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: tone.fg,
                }}
              >
                {style.label}
              </span>
            )}
          </span>
        )}
      </span>
    </div>
  );
}

function TextBlock({ region }: { region: TextRegion }): ReactNode {
  if (region.disabled) return null;
  const indent = indentMargin(region.indent);
  if (region.heading) {
    return (
      <div style={{ marginLeft: indent, breakInside: "avoid", breakAfter: "avoid" }}>
        {region.eyebrow && (
          <div
            style={{
              font: "600 8.5px/1 var(--font-sans)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: FAINT,
              margin: "2px 0 4px",
            }}
          >
            {region.eyebrow}
          </div>
        )}
        <div
          style={{
            font: `600 ${region.heading === 1 ? 14 : region.heading === 2 ? 13 : 12}px/1.3 var(--font-sans)`,
            color: INK,
            margin: "12px 0 6px",
            paddingBottom: 4,
            borderBottom: `1px solid ${ROW_RULE}`,
          }}
        >
          {region.text}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        marginLeft: indent,
        font: "11px var(--font-sans)",
        lineHeight: "var(--ws-text-leading, 1.4)",
        color: "#3A4048",
        margin: "4px 0",
        breakInside: "avoid",
      }}
    >
      {region.text}
    </div>
  );
}

function TableBlock({ region }: { region: TableRegion }): ReactNode {
  if (region.disabled) return null;
  const cols = region.columns;
  if (cols.length === 0) return null;
  // Pure, deterministic — same evaluator the editor uses; runs in Node for export.
  const result = evaluateTable(region, {});
  const ncols = cols.length;
  const align = (col: TableColumn) => col.align ?? (col.unit || col.format ? "right" : "left");

  return (
    <div
      style={{
        border: `1px solid ${STRONG_RULE}`,
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 12,
        marginLeft: indentMargin(region.indent),
        breakInside: "avoid",
      }}
    >
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: CHROME }}>
            {cols.map((col, i) => (
              <th
                key={col.key}
                style={{
                  padding: "var(--ws-cell-pad-y, 4px) 9px",
                  font: "600 8px/1 var(--font-sans)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: MUTED,
                  textAlign: align(col),
                  borderRight: i < ncols - 1 ? `1px solid ${HAIRLINE}` : "none",
                  borderBottom: `1px solid ${STRONG_RULE}`,
                }}
              >
                {col.label}
                {col.unit ? ` [${col.unit}]` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {region.rows.map((_, ri) => (
            <tr key={ri} style={{ borderTop: ri ? `1px solid ${ROW_RULE}` : "none" }}>
              {cols.map((col, ci) => {
                const cell = result.cells[ri]?.[ci];
                return (
                  <td
                    key={col.key}
                    style={{
                      padding: "var(--ws-cell-pad-y, 4px) 9px",
                      font: "10.5px/1.2 var(--font-mono)",
                      color: cell?.style?.color ?? INK,
                      textAlign: align(col),
                      fontWeight: ci === 0 ? 600 : 400,
                      borderRight: ci < ncols - 1 ? `1px solid ${ROW_RULE}` : "none",
                    }}
                  >
                    {cell?.error ? "#error" : cell?.formatted ?? ""}
                    {cell?.style?.label ? ` ${cell.style.label}` : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlotBlock({
  region,
  borders,
}: {
  region: PlotRegion;
  borders: boolean;
}): ReactNode {
  if (region.disabled) return null;
  const title = region.title || null;
  const wrap = (inner: ReactNode) => (
    <div
      style={{
        border: borders ? `1px solid ${HAIRLINE}` : "none",
        borderRadius: 3,
        padding: borders ? 10 : 0,
        marginBottom: 8,
        marginLeft: indentMargin(region.indent),
        breakInside: "avoid",
      }}
    >
      {title && <div style={{ font: "600 11px/1.2 var(--font-sans)", marginBottom: 6, color: INK }}>{title}</div>}
      {inner}
    </div>
  );

  // Surface: render the same projected wireframe the editor draws (pure, runs in Node).
  if (region.kind === "surface") {
    return wrap(<SurfaceBlock region={region} />);
  }
  // Contour: render the same iso-bands the editor draws (pure geometry, runs in Node).
  if (region.kind === "contour") {
    return wrap(<ContourBlock region={region} />);
  }
  // Data-bound kinds need the live worksheet scope (absent in the Node export path),
  // so the print view shows a compact note rather than an empty frame. Parametric is
  // formula-driven and falls through to the points renderer below.
  if (region.kind === "histogram" || region.kind === "boxplot" || region.kind === "vector") {
    const label = region.kind === "histogram" ? "Histogram" : region.kind === "boxplot" ? "Box plot" : "Vector field";
    return wrap(<div style={{ font: "10.5px/1.4 var(--font-sans)", color: MUTED }}>{label} — configured.</div>);
  }
  if (region.traces.length === 0) {
    return wrap(<div style={{ font: "10.5px/1.4 var(--font-sans)", color: MUTED }}>No traces yet.</div>);
  }

  // Same pure sampler the editor uses; runs in Node for export (no live scope, so
  // plot-by-formula traces draw and worksheet-name-bound ones simply stay empty).
  const result = evaluatePlot(region, {});
  const { xMin, xMax, yMin, yMax } = result.bounds;
  const X0 = 46;
  const X1 = 454;
  const Y0 = 166;
  const Y1 = 14;
  const sx = (v: number) => X0 + ((v - xMin) / (xMax - xMin || 1)) * (X1 - X0);
  const sy = (v: number) => Y0 - ((v - yMin) / (yMax - yMin || 1)) * (Y0 - Y1);
  const drawable = result.traces.filter((t) => !t.hidden && !t.error && t.points.length > 0);
  // Print-safe hex palette (the on-screen renderer swaps the default for CSS vars).
  const lineColor = themePalette(region.theme);

  return wrap(
    <svg width="100%" viewBox="0 0 470 200" style={{ display: "block" }} aria-label="Plot">
      {[0.25, 0.5, 0.75].map((f, i) => (
        <line key={i} x1={X0} y1={Y1 + (Y0 - Y1) * f} x2={X1} y2={Y1 + (Y0 - Y1) * f} stroke={HAIRLINE} strokeWidth="1" />
      ))}
      <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={STRONG_RULE} strokeWidth="1.2" />
      <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={STRONG_RULE} strokeWidth="1.2" />
      {drawable.map((t, i) => {
        const d = t.points.map((p, j) => `${j ? "L" : "M"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
        return (
          <path
            key={t.id}
            d={d}
            fill="none"
            stroke={t.color || lineColor[i % lineColor.length]}
            strokeWidth={t.width ?? 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={t.dash ? "5 3" : undefined}
          />
        );
      })}
    </svg>,
  );
}

/**
 * Printed contour — the same pure `evaluatePlot` sampling + `./contour` iso-band
 * geometry the editor uses, drawn with the page's blueprint ink (a sequential
 * opacity ramp, deeper = higher z) plus a compact colour scale.
 */
function ContourBlock({ region }: { region: PlotRegion }): ReactNode {
  const result = evaluatePlot(region, {});
  const grid = result.contour;
  if (!grid || grid.error) {
    return (
      <div style={{ font: "10.5px/1.4 var(--font-sans)", color: MUTED }}>
        {grid?.error ? grid.error.message : "Contour plot — set z = f(x, y) and an x/y range."}
      </div>
    );
  }
  const BLUEPRINT = "#1F5FBF";
  const filled = region.surface?.filled ?? true;
  const X0 = 46;
  const Y0 = 166;
  const Y1 = 14;
  const X1 = 454 - 38; // leave a gutter for the colour scale
  const { xMin, xMax, yMin, yMax } = result.bounds;
  const sx = (v: number) => X0 + ((v - xMin) / (xMax - xMin || 1)) * (X1 - X0);
  const sy = (v: number) => Y0 - ((v - yMin) / (yMax - yMin || 1)) * (Y0 - Y1);
  const op = (t: number) => 0.06 + 0.8 * Math.max(0, Math.min(1, t));
  const toPath = (poly: ReadonlyArray<readonly [number, number]>) =>
    poly.map(([px, py], i) => `${i ? "L" : "M"}${sx(px).toFixed(1)} ${sy(py).toFixed(1)}`).join(" ") + " Z";
  const bands = filled ? contourBands(grid) : [];
  const lines = contourLines(grid);
  const span = grid.zMax - grid.zMin || 1;
  const syz = (v: number) => Y0 - ((v - grid.zMin) / span) * (Y0 - Y1);
  const scaleX = X1 + 10;

  return (
    <svg width="100%" viewBox="0 0 470 200" style={{ display: "block" }} aria-label="Contour plot">
      {filled &&
        bands.map((b, i) => (
          <g key={`b${i}`} fill={BLUEPRINT} fillOpacity={op(b.t)}>
            {b.polygons.map((poly, j) => (
              <path key={j} d={toPath(poly)} />
            ))}
          </g>
        ))}
      {lines.map((ls, i) => (
        <g key={`l${i}`} stroke={filled ? "#FFFFFF" : BLUEPRINT} strokeOpacity={filled ? 0.6 : 0.45 + 0.4 * ls.t} strokeWidth={filled ? 0.5 : 1.2}>
          {ls.segments.map((seg, j) => (
            <line key={j} x1={sx(seg[0][0])} y1={sy(seg[0][1])} x2={sx(seg[1][0])} y2={sy(seg[1][1])} />
          ))}
        </g>
      ))}
      <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={STRONG_RULE} strokeWidth="1.2" />
      <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke={STRONG_RULE} strokeWidth="1.2" />
      {grid.levels.slice(0, -1).map((lo, i) => {
        const hi = grid.levels[i + 1];
        const t = ((lo + hi) / 2 - grid.zMin) / span;
        return <rect key={i} x={scaleX} y={syz(hi)} width="8" height={Math.max(0.5, syz(lo) - syz(hi))} fill={BLUEPRINT} fillOpacity={op(t)} />;
      })}
      <rect x={scaleX} y={Y1} width="8" height={Y0 - Y1} fill="none" stroke={HAIRLINE} strokeWidth="1" />
    </svg>
  );
}

function SurfaceBlock({ region }: { region: PlotRegion }): ReactNode {
  const result = evaluatePlot(region, {});
  const s = result.surface;
  if (!s || s.error) {
    return (
      <div style={{ font: "10.5px/1.4 var(--font-sans)", color: MUTED }}>
        {s?.error ? s.error.message : "3D surface plot — set z = f(x, y) and an x/y range."}
      </div>
    );
  }
  const BLUEPRINT = "#1F5FBF";
  const nx = s.xs.length;
  const ny = s.ys.length;

  // Cabinet projection + auto-fit (mirrors the editor's SurfaceFigure; print ink).
  const fL = 40;
  const fR = 454;
  const fT = 14;
  const fB = 166;
  const XW = 1.0;
  const DX = 0.42;
  const DY = 0.3;
  const ZH = 0.55;
  const zSpan = s.zMax - s.zMin || 1;
  const normW = (z: number) => {
    const w = (z - s.zMin) / zSpan;
    return w < 0 ? 0 : w > 1 ? 1 : w;
  };
  let axMin = Infinity;
  let axMax = -Infinity;
  let ayMin = Infinity;
  let ayMax = -Infinity;
  for (const u of [0, 1]) {
    for (const v of [0, 1]) {
      for (const w of [0, 1]) {
        const ax = u * XW + v * DX;
        const ay = v * DY + w * ZH;
        if (ax < axMin) axMin = ax;
        if (ax > axMax) axMax = ax;
        if (ay < ayMin) ayMin = ay;
        if (ay > ayMax) ayMax = ay;
      }
    }
  }
  const axSpan = axMax - axMin || 1;
  const aySpan = ayMax - ayMin || 1;
  const scale = Math.min((fR - fL) / axSpan, (fB - fT) / aySpan);
  const padX = fL + ((fR - fL) - axSpan * scale) / 2;
  const padY = fT + ((fB - fT) - aySpan * scale) / 2;
  const px = (u: number, v: number) => padX + (u * XW + v * DX - axMin) * scale;
  const py = (u: number, v: number, w: number) => padY + (ayMax - (v * DY + w * ZH)) * scale;
  const U = (xi: number) => (nx > 1 ? xi / (nx - 1) : 0);
  const V = (yi: number) => (ny > 1 ? yi / (ny - 1) : 0);
  const pathFor = (cells: { u: number; v: number; z: number | null }[]) => {
    let d = "";
    let pen = false;
    for (const c of cells) {
      if (c.z == null) {
        pen = false;
        continue;
      }
      const w = normW(c.z);
      d += `${pen ? "L" : "M"}${px(c.u, c.v).toFixed(1)} ${py(c.u, c.v, w).toFixed(1)} `;
      pen = true;
    }
    return d.trim();
  };
  const cols: string[] = [];
  for (let xi = 0; xi < nx; xi += 1) {
    const cells: { u: number; v: number; z: number | null }[] = [];
    for (let yi = 0; yi < ny; yi += 1) cells.push({ u: U(xi), v: V(yi), z: s.z[yi]?.[xi] ?? null });
    cols.push(pathFor(cells));
  }
  const centerRow = Math.floor(ny / 2);
  const rows: { d: string; meanW: number; center: boolean }[] = [];
  for (let yi = 0; yi < ny; yi += 1) {
    const cells: { u: number; v: number; z: number | null }[] = [];
    let sum = 0;
    let cnt = 0;
    for (let xi = 0; xi < nx; xi += 1) {
      const z = s.z[yi]?.[xi] ?? null;
      cells.push({ u: U(xi), v: V(yi), z });
      if (z != null) {
        sum += normW(z);
        cnt += 1;
      }
    }
    rows.push({ d: pathFor(cells), meanW: cnt ? sum / cnt : 0, center: yi === centerRow });
  }
  const ox = px(0, 0);
  const oy = py(0, 0, 0);

  return (
    <svg width="100%" viewBox="0 0 470 200" style={{ display: "block" }} aria-label="3D surface plot">
      <line x1={ox} y1={oy} x2={px(1, 0)} y2={py(1, 0, 0)} stroke={STRONG_RULE} strokeWidth="1.2" />
      <line x1={ox} y1={oy} x2={px(0, 1)} y2={py(0, 1, 0)} stroke={STRONG_RULE} strokeWidth="1.2" />
      <line x1={ox} y1={oy} x2={px(0, 0)} y2={py(0, 0, 1)} stroke={STRONG_RULE} strokeWidth="1.2" />
      {cols.map((d, i) => (d ? <path key={`c${i}`} d={d} fill="none" stroke={STRONG_RULE} strokeWidth="1" strokeOpacity={0.55} /> : null))}
      {rows.map((r, i) =>
        r.d ? (
          <path key={`r${i}`} d={r.d} fill="none" stroke={BLUEPRINT} strokeWidth={r.center ? 1.5 : 1.1} strokeOpacity={r.center ? 1 : Math.min(0.95, 0.4 + 0.5 * r.meanW)} />
        ) : null,
      )}
    </svg>
  );
}

function ImageBlock({ region }: { region: RenderOnlyRegion }): ReactNode {
  if (region.disabled) return null;
  const data = region as Record<string, unknown>;
  const src = typeof data.src === "string" ? data.src : null;
  if (!src) return null;
  return (
    // A print artifact needs a plain <img>, not next/image's runtime optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={typeof data.alt === "string" ? data.alt : ""}
      style={{
        maxWidth: "100%",
        marginLeft: indentMargin(region.indent),
        borderRadius: 3,
        border: `1px solid ${HAIRLINE}`,
        breakInside: "avoid",
      }}
    />
  );
}

function InputsSummary({ rows }: { rows: { id: string; name: string; value: string; note?: string }[] }): ReactNode {
  if (rows.length === 0) return null;
  return (
    <div style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 4, overflow: "hidden", marginBottom: 12, breakInside: "avoid" }}>
      <div
        style={{
          padding: "5px 10px",
          background: CHROME,
          borderBottom: `1px solid ${HAIRLINE}`,
          font: "600 8.5px/1 var(--font-sans)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: MUTED,
        }}
      >
        Inputs summary
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={{ borderTop: i ? `1px solid ${ROW_RULE}` : "none" }}>
              <td style={{ padding: "4px 10px", width: 70 }}>
                <NameMath name={r.name} />
              </td>
              <td style={{ padding: "4px 10px", width: 110, fontFamily: "var(--font-mono)", fontSize: 11, color: INK }}>
                {r.value}
              </td>
              <td style={{ padding: "4px 10px", font: "10.5px/1.3 var(--font-sans)", color: MUTED }}>{r.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Solve block (print). Runs the SAME pure `evaluateSolve` in Node — so the PDF
 * carries the solved values deterministically. Self-contained solves compute
 * fully; worksheet-name-bound ones stay empty here (the export path has no live
 * scope, exactly like tables/plots).
 */
function SolveBlock({ region }: { region: SolveRegion }): ReactNode {
  if (region.disabled) return null;
  const result = evaluateSolve(region, {});
  const guesses = region.guesses.filter((g) => g.var.trim());
  const constraints = region.constraints.filter((c) => c.trim());
  const vars = (result.unknowns.length ? result.unknowns : guesses.map((g) => g.var)).join(", ");

  const eyebrow = (label: string): ReactNode => (
    <div style={{ font: "600 7.5px/1 var(--font-sans)", letterSpacing: "0.08em", textTransform: "uppercase", color: FAINT, margin: "7px 0 4px" }}>
      {label}
    </div>
  );

  return (
    <div
      style={{
        border: `1px solid ${STRONG_RULE}`,
        borderLeft: "2.5px solid #1F5FBF",
        borderRadius: 3,
        background: "#fff",
        padding: "8px 11px 9px",
        marginBottom: 8,
        marginLeft: indentMargin(region.indent),
        breakInside: "avoid",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 2 }}>
        <span style={{ font: "600 10px/1 var(--font-sans)", color: INK }}>Solve block</span>
        {region.name && <span style={{ font: "8.5px/1 var(--font-mono)", color: MUTED }}>{region.name}</span>}
        <span style={{ marginLeft: "auto", font: "8px/1 var(--font-sans)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: result.status === "solved" ? "#1E8E5A" : result.status === "no-solution" || result.status === "error" ? "#C2392B" : MUTED }}>
          {result.status === "solved" ? "converged" : result.status === "no-solution" || result.status === "error" ? "no solution" : result.status === "deferred" ? "ships next" : ""}
        </span>
      </div>

      {guesses.length > 0 && (
        <>
          {eyebrow("Given — guess values")}
          <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 3 }}>
            {guesses.map((g, i) => (
              <Tex key={i} tex={sourceToLatex(`${g.var} := ${guessSource(g)}`)} size={12} />
            ))}
          </div>
        </>
      )}

      {constraints.length > 0 && (
        <>
          {eyebrow("Constraints")}
          <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 3 }}>
            {constraints.map((c, i) => (
              <Tex key={i} tex={constraintToLatex(c)} size={12} />
            ))}
          </div>
        </>
      )}

      {(region.algorithm === "minimize" || region.algorithm === "maximize") && region.objective?.trim() && (
        <>
          {eyebrow("Objective")}
          <div style={{ paddingLeft: 3 }}>
            <Tex tex={exprToLatex(region.objective)} size={12} />
          </div>
        </>
      )}

      {eyebrow("Solve")}
      <div style={{ paddingLeft: 3 }}>
        <Tex tex={`\\left(${vars || "\\;"}\\right) := \\operatorname{${region.algorithm}}\\left(${vars || "\\;"}\\right)`} size={12} />
      </div>

      <div style={{ marginTop: 7, paddingTop: 6, borderTop: `1px solid ${HAIRLINE}` }}>
        {result.status === "solved" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {result.outputs.map((out) => (
              <div key={out.name} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <Tex tex={`${exprToLatex(out.name)} =`} size={12} />
                <span style={{ font: "600 11px/1.2 var(--font-math)", color: "#1F5FBF" }}>{out.formatted}</span>
              </div>
            ))}
          </div>
        ) : result.status === "deferred" ? (
          <div style={{ font: "9.5px/1.4 var(--font-sans)", color: MUTED }}>
            {region.algorithm} — differential-equation integrator ships with the SciPy engine; configuration saved.
          </div>
        ) : (
          <div style={{ font: "9.5px/1.4 var(--font-sans)", color: "#C2392B" }}>
            {result.error?.message ?? "No solution found."} {result.error?.fixHint ?? ""}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgramBlock({ region }: { region: ProgramRegion }): ReactNode {
  if (region.disabled) return null;
  const result = evaluateProgram(region, {});
  const name = region.name?.trim();
  const params = (region.params ?? []).map((p) => p.trim()).filter(Boolean);
  const signature = name
    ? params.length > 0
      ? `${exprToLatex(name)}\\left(${params.map(exprToLatex).join(",\\ ")}\\right)`
      : exprToLatex(name)
    : null;

  return (
    <div
      style={{
        border: `1px solid ${STRONG_RULE}`,
        borderLeft: "2.5px solid #1F5FBF",
        borderRadius: 3,
        background: "#fff",
        padding: "8px 11px 9px",
        marginBottom: 8,
        marginLeft: indentMargin(region.indent),
        breakInside: "avoid",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 4 }}>
        <span style={{ font: "600 10px/1 var(--font-sans)", color: INK }}>Program</span>
        {name && (
          <span style={{ font: "8.5px/1 var(--font-mono)", color: MUTED }}>
            {name}
            {params.length > 0 ? `(${params.join(", ")})` : ""}
          </span>
        )}
      </div>

      {signature && (
        <div style={{ paddingLeft: 3 }}>
          <Tex tex={`${signature} :=`} size={12} />
        </div>
      )}

      <div style={{ marginTop: 7, paddingTop: 6, borderTop: `1px solid ${HAIRLINE}` }}>
        {result.status === "value" ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            {result.name && <Tex tex={`${exprToLatex(result.name)} =`} size={12} />}
            <span style={{ font: "600 11px/1.2 var(--font-math)", color: "#1F5FBF" }}>{result.formatted}</span>
          </div>
        ) : result.status === "error" ? (
          <div style={{ font: "9.5px/1.4 var(--font-sans)", color: "#C2392B" }}>
            {result.error?.message ?? "This program could not run."} {result.error?.fixHint ?? ""}
          </div>
        ) : result.status === "function" ? (
          <div style={{ font: "9.5px/1.4 var(--font-sans)", color: MUTED }}>
            Defines {result.name}({result.params.join(", ")}) — called from regions below.
          </div>
        ) : (
          <div style={{ font: "9.5px/1.4 var(--font-sans)", color: MUTED }}>Empty program.</div>
        )}
      </div>
    </div>
  );
}

function RegionBlock({
  region,
  results,
  options,
}: {
  region: Region;
  results: Map<string, RegionResult>;
  options: ExportOptions;
}): ReactNode {
  switch (region.type) {
    case "math":
      return <MathBlock region={region} result={results.get(region.id)} options={options} />;
    case "text":
      return <TextBlock region={region} />;
    case "table":
      return <TableBlock region={region} />;
    case "plot":
      return <PlotBlock region={region} borders={options.borders || region.border === true} />;
    case "solve":
      return <SolveBlock region={region} />;
    case "program":
      return <ProgramBlock region={region} />;
    case "image":
      return <ImageBlock region={region} />;
    case "area":
      // Areas are always expanded for print; render a faint title, then children.
      return (
        <div style={{ marginLeft: indentMargin(region.indent) }}>
          {region.title && (
            <div
              style={{
                font: "600 8.5px/1 var(--font-sans)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: FAINT,
                margin: "8px 0 4px",
              }}
            >
              {region.title}
            </div>
          )}
          {region.regions.map((child) => (
            <RegionBlock key={child.id} region={child} results={results} options={options} />
          ))}
        </div>
      );
    default:
      return null;
  }
}

/** The flowed worksheet body — title block, optional inputs summary, regions. */
export function ExportDocument({ title, content, results, options, meta }: ExportDocumentProps): ReactNode {
  const inputs = options.inputsSummary ? selectInputs(content, results) : [];
  return (
    <div className="ex-doc">
      {/* title block */}
      <div style={{ marginBottom: 14, breakAfter: "avoid" }}>
        <h1 style={{ margin: 0, font: "600 18px/1.2 var(--font-sans)", letterSpacing: "-0.01em", color: INK }}>
          {title}
        </h1>
        {meta && meta.length > 0 && (
          <div style={{ display: "flex", gap: 22, marginTop: 9 }}>
            {meta.map((m) => (
              <div key={m.label}>
                <div style={{ font: "7.5px/1 var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase", color: FAINT }}>
                  {m.label}
                </div>
                <div style={{ font: "10.5px/1.2 var(--font-mono)", color: INK, marginTop: 2 }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {options.inputsSummary && <InputsSummary rows={inputs} />}

      {content.rows.map((row, ri) => (
        <Fragment key={row.id}>
          {/* Hard page break before this row (never the first). The zero-height
              marker forces the print engine to a new page; the preview reads the
              same `[data-ex-break]` marker so both paginate identically. */}
          {row.breakBefore && ri > 0 && <div data-ex-break style={{ breakBefore: "page" }} aria-hidden />}
          {row.cells.map((cell, ci) =>
            cell.regions.map((region) => (
              <RegionBlock key={`${ci}-${region.id}`} region={region} results={results} options={options} />
            )),
          )}
        </Fragment>
      ))}
    </div>
  );
}
