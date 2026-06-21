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
import type { ReactNode } from "react";
import katex from "katex";
import {
  constraintToLatex,
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

function regionBoxStyle(borders: boolean, indent: number): React.CSSProperties {
  return {
    padding: borders ? "7px 9px" : "5px 0",
    marginLeft: (indent || 0) * 22,
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
          rowGap: 3,
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
  const indent = (region.indent || 0) * 22;
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
        font: "11px/1.6 var(--font-sans)",
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
        marginLeft: (region.indent || 0) * 22,
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
                  padding: "5px 9px",
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
                      padding: "5px 9px",
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
        marginLeft: (region.indent || 0) * 22,
        breakInside: "avoid",
      }}
    >
      {title && <div style={{ font: "600 11px/1.2 var(--font-sans)", marginBottom: 6, color: INK }}>{title}</div>}
      {inner}
    </div>
  );

  // contour/3D (config-only this pass) and unconfigured plots: a compact print note.
  if (region.kind === "contour" || region.kind === "surface") {
    return wrap(<div style={{ font: "10.5px/1.4 var(--font-sans)", color: MUTED }}>{region.kind === "surface" ? "3D surface" : "Contour"} plot — configured.</div>);
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
  const lineColor = ["#1F5FBF", "#1E8E5A", "#C6890B"];

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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={t.dash ? "5 3" : undefined}
          />
        );
      })}
    </svg>,
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
        marginLeft: (region.indent || 0) * 22,
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
        marginLeft: (region.indent || 0) * 22,
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
        marginLeft: (region.indent || 0) * 22,
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
        <div style={{ marginLeft: (region.indent || 0) * 22 }}>
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

      {content.rows.map((row) =>
        row.cells.map((cell, ci) =>
          cell.regions.map((region) => (
            <RegionBlock key={`${row.id}-${ci}-${region.id}`} region={region} results={results} options={options} />
          )),
        ),
      )}
    </div>
  );
}
