/**
 * Presentational plot rendering — pure SVG, no hooks, no provider, no browser
 * globals — so the SAME figure renders in the live editor (client, interactive),
 * the read-only history snapshot, and the server-side export/print path. All
 * geometry is derived from a {@link PlotResult} (the pure engine's sampled,
 * unit-converted series), so the renderer is a faithful CONSUMER that stays
 * reactive on recalc. Ported from the mockup `plot-region.html`: hairline
 * gridlines, ink axes, STIX symbol + `[unit]` labels, a blueprint trace, a hover
 * read-out, and pill legend chips. Interactivity is opt-in via callbacks — with
 * none passed (export/history) the figure is fully static.
 */
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import { niceNum, type PlotResult, type PlotTraceStyle, type TraceResult } from "@/lib/calc";
import type { PlotRegion } from "@/lib/worksheet/content";
import { Icon } from "../icons";

/* ------------------------------------------------------------------ *
 * Geometry (matches the mockup's 460×300 frame + margins)
 * ------------------------------------------------------------------ */

const W = 460;
const H = 300;
const M = { l: 52, r: 18, t: 16, b: 44 };
const X0 = M.l;
const X1 = W - M.r;
const Y0 = H - M.b;
const Y1 = M.t;

/** Default trace palette — design-system hues, blueprint first (mockup). */
const PALETTE = [
  "var(--accent)",
  "var(--status-pass)",
  "var(--status-warning)",
  "var(--text-link)",
  "var(--status-error)",
];

export function traceColor(index: number, color?: string): string {
  return color || PALETTE[index % PALETTE.length];
}

/** Which engine styles draw markers / fills / bars (others map to a near neighbour). */
function styleFlags(style: PlotTraceStyle) {
  const markers = style === "scatter" || style === "line-marker" || style === "error";
  const line = style === "line" || style === "line-marker" || style === "area" || style === "error";
  const area = style === "area";
  const bars = style === "column" || style === "bar" || style === "waterfall";
  const stem = style === "stem" || style === "box";
  return { markers, line, area, bars, stem };
}

/* ------------------------------------------------------------------ *
 * Axis-tick helpers
 * ------------------------------------------------------------------ */

/** ~`count` clean ticks within [min, max] (1/2/5 × 10ⁿ steps; reuses the engine's niceNum). */
export function niceTicks(min: number, max: number, count = 6): number[] {
  if (!(max > min)) return [min];
  const step = niceNum((max - min) / Math.max(1, count - 1), true);
  const start = Math.ceil(min / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-6; v += step) ticks.push(cleanFloat(v, step));
  return ticks;
}

/** Trim binary-float fuzz (0.30000000004 → 0.3) relative to the tick step. */
function cleanFloat(v: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  return Number(v.toFixed(Math.min(12, decimals)));
}

/** Compact tick / read-out label. */
export function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e5 || abs < 1e-3) return v.toExponential(1);
  const s = Number(v.toPrecision(4)).toString();
  return s;
}

/* ------------------------------------------------------------------ *
 * Axis label — STIX symbol + [unit]
 * ------------------------------------------------------------------ */

function AxisLabel({ symbol, unit }: { symbol: string; unit: string | null }): ReactNode {
  return (
    <>
      <tspan style={{ fontFamily: "var(--font-math)", fontStyle: "italic" }}>{symbol}</tspan>
      {unit ? <tspan> [{unit}]</tspan> : null}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * The figure
 * ------------------------------------------------------------------ */

export interface PlotFigureProps {
  result: PlotResult;
  region: Pick<PlotRegion, "kind" | "x" | "y" | "xVar">;
  /** Index (into the primary trace) of the hovered sample, for the read-out. */
  hoverIndex?: number | null;
  /** Report the nearest sample under the cursor (omit ⇒ static, no hover). */
  onHoverIndex?: (index: number | null) => void;
  /** Pan a pinned-or-derived axis range by a data delta (omit ⇒ no drag). */
  onPan?: (axis: "x" | "y", delta: number) => void;
  height?: number;
}

export function PlotFigure({ result, region, hoverIndex, onHoverIndex, onPan, height }: PlotFigureProps) {
  if (result.kind === "polar") {
    return <PolarFigure result={result} height={height} />;
  }

  const { xMin, xMax, yMin, yMax } = result.bounds;
  const sx = (v: number) => X0 + ((v - xMin) / (xMax - xMin || 1)) * (X1 - X0);
  const sy = (v: number) => Y0 - ((v - yMin) / (yMax - yMin || 1)) * (Y0 - Y1);
  const baseY = Math.min(Math.max(0, yMin), yMax); // bar/area baseline (0 when in range)

  const xticks = niceTicks(xMin, xMax, 7);
  const yticks = niceTicks(yMin, yMax, 5);

  const drawable = result.traces.filter((t) => !t.hidden && !t.error && t.points.length > 0);
  const primary = drawable[0];

  // Bar width — share the x-span across the densest bar trace's sample count.
  const barTrace = drawable.find((t) => styleFlags(t.style).bars);
  const barW = barTrace ? Math.max(2, ((X1 - X0) / Math.max(barTrace.points.length, 1)) * 0.62) : 0;

  const hover =
    onHoverIndex && primary && hoverIndex != null && primary.points[hoverIndex]
      ? primary.points[hoverIndex]
      : null;

  /* pointer → nearest primary-trace sample index */
  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (!onHoverIndex || !primary) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    primary.points.forEach((p, i) => {
      const d = Math.abs(sx(p.x) - vx);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    onHoverIndex(best);
  };

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${height ?? H}`}
      style={{ display: "block", cursor: onHoverIndex ? "crosshair" : "default" }}
      role="img"
      aria-label="Plot"
    >
      {/* gridlines */}
      {yticks.map((v, i) => (
        <line key={`gy${i}`} x1={X0} y1={sy(v)} x2={X1} y2={sy(v)} stroke="var(--border-hairline)" strokeWidth="1" />
      ))}
      {xticks.map((v, i) => (
        <line key={`gx${i}`} x1={sx(v)} y1={Y0} x2={sx(v)} y2={Y1} stroke="var(--border-hairline)" strokeWidth="1" />
      ))}

      {/* axes */}
      <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke="var(--border-strong)" strokeWidth="1.2" />
      <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke="var(--border-strong)" strokeWidth="1.2" />

      {/* ticks */}
      {xticks.map((v, i) => (
        <text key={`tx${i}`} x={sx(v)} y={Y0 + 15} textAnchor="middle" style={{ font: "10px var(--font-mono)", fill: "var(--text-muted)" }}>
          {fmtNum(v)}
        </text>
      ))}
      {yticks.map((v, i) => (
        <text key={`ty${i}`} x={X0 - 7} y={sy(v) + 3} textAnchor="end" style={{ font: "10px var(--font-mono)", fill: "var(--text-muted)" }}>
          {fmtNum(v)}
        </text>
      ))}

      {/* axis labels */}
      <text x={(X0 + X1) / 2} y={H - 6} textAnchor="middle" style={{ font: "11px var(--font-sans)", fill: "var(--text-primary)" }}>
        <AxisLabel symbol={region.x?.label || region.xVar || "x"} unit={result.xUnit} />
      </text>
      <text x={13} y={(Y0 + Y1) / 2} textAnchor="middle" transform={`rotate(-90 13 ${(Y0 + Y1) / 2})`} style={{ font: "11px var(--font-sans)", fill: "var(--text-primary)" }}>
        <AxisLabel symbol={region.y?.label || "y"} unit={result.yUnit} />
      </text>

      {/* traces */}
      {drawable.map((t, i) => (
        <TraceMarks key={t.id} trace={t} index={i} sx={sx} sy={sy} baseY={baseY} barW={barW} />
      ))}

      {/* hover crosshair + read-out */}
      {hover && (
        <HoverReadout
          px={sx(hover.x)}
          py={sy(hover.y)}
          x={hover.x}
          y={hover.y}
          xUnit={result.xUnit}
          yUnit={result.yUnit}
          color={traceColor(0, primary?.color)}
        />
      )}

      {/* interaction overlays (only when wired) */}
      {onHoverIndex && (
        <rect
          x={X0}
          y={Y1}
          width={X1 - X0}
          height={Y0 - Y1}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => onHoverIndex(null)}
        />
      )}
      {onPan && <PanStrips xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} onPan={onPan} />}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * One trace's marks, drawn by style
 * ------------------------------------------------------------------ */

function TraceMarks({
  trace,
  index,
  sx,
  sy,
  baseY,
  barW,
}: {
  trace: TraceResult;
  index: number;
  sx: (v: number) => number;
  sy: (v: number) => number;
  baseY: number;
  barW: number;
}) {
  const color = traceColor(index, trace.color);
  const f = styleFlags(trace.style);
  const pts = trace.points;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");

  return (
    <g>
      {f.area && (
        <path
          d={`${d} L${sx(pts[pts.length - 1].x).toFixed(1)} ${sy(baseY).toFixed(1)} L${sx(pts[0].x).toFixed(1)} ${sy(baseY).toFixed(1)} Z`}
          fill={color}
          opacity={0.12}
        />
      )}
      {f.bars &&
        pts.map((p, i) => {
          const top = Math.min(sy(p.y), sy(baseY));
          const h = Math.abs(sy(p.y) - sy(baseY));
          return <rect key={i} x={sx(p.x) - barW / 2} y={top} width={barW} height={Math.max(0.5, h)} fill={color} opacity={0.22} stroke={color} strokeWidth="1.2" />;
        })}
      {f.stem &&
        pts.map((p, i) => <line key={i} x1={sx(p.x)} y1={sy(baseY)} x2={sx(p.x)} y2={sy(p.y)} stroke={color} strokeWidth="1.5" />)}
      {f.line && pts.length > 1 && (
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={trace.dash ? "5 3" : undefined} />
      )}
      {(f.markers || f.stem) &&
        pts.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={f.markers ? 3 : 2.4} fill={f.markers ? "var(--surface-paper)" : color} stroke={color} strokeWidth="1.6" />)}
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * Hover read-out (ink chip, mockup)
 * ------------------------------------------------------------------ */

function HoverReadout({
  px,
  py,
  x,
  y,
  xUnit,
  yUnit,
  color,
}: {
  px: number;
  py: number;
  x: number;
  y: number;
  xUnit: string | null;
  yUnit: string | null;
  color: string;
}) {
  const flip = px > W - 130;
  const bx = flip ? px - 114 : px + 10;
  return (
    <>
      <line x1={px} y1={py} x2={px} y2={Y0} stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      <line x1={px} y1={py} x2={X0} y2={py} stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      <circle cx={px} cy={py} r="4" fill={color} stroke="var(--surface-paper)" strokeWidth="1.5" />
      <g transform={`translate(${bx.toFixed(1)},${Math.max(Y1, py - 34).toFixed(1)})`}>
        <rect x="0" y="0" width="104" height="30" rx="4" fill="var(--text-primary)" />
        <text x="9" y="13" style={{ font: "10px var(--font-mono)", fill: "var(--surface-paper)" }}>
          <tspan style={{ fill: "#9FB6D8" }}>x </tspan>
          {fmtNum(x)}
          {xUnit ? ` ${xUnit}` : ""}
        </text>
        <text x="9" y="24" style={{ font: "10px var(--font-mono)", fill: "var(--surface-paper)" }}>
          <tspan style={{ fill: "#9FB6D8" }}>y </tspan>
          {fmtNum(y)}
          {yUnit ? ` ${yUnit}` : ""}
        </text>
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Axis drag strips — pan a range by dragging beneath/left of the axis
 * ------------------------------------------------------------------ */

function PanStrips({
  xMin,
  xMax,
  yMin,
  yMax,
  onPan,
}: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  onPan: (axis: "x" | "y", delta: number) => void;
}) {
  const dragX = (e: ReactPointerEvent<SVGRectElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveX = (e: ReactPointerEvent<SVGRectElement>) => {
    if (e.buttons !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const perPx = (xMax - xMin) / (rect.width || 1);
    if (e.movementX) onPan("x", -e.movementX * perPx);
  };
  const moveY = (e: ReactPointerEvent<SVGRectElement>) => {
    if (e.buttons !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const perPx = (yMax - yMin) / (rect.height || 1);
    if (e.movementY) onPan("y", e.movementY * perPx);
  };
  return (
    <>
      <rect x={X0} y={Y0} width={X1 - X0} height={M.b - 4} fill="transparent" style={{ cursor: "ew-resize" }} onPointerDown={dragX} onPointerMove={moveX}>
        <title>Drag to pan the x range</title>
      </rect>
      <rect x={0} y={Y1} width={M.l - 4} height={Y0 - Y1} fill="transparent" style={{ cursor: "ns-resize" }} onPointerDown={dragX} onPointerMove={moveY}>
        <title>Drag to pan the y range</title>
      </rect>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Polar figure (r = f(θ))
 * ------------------------------------------------------------------ */

function PolarFigure({ result, height }: { result: PlotResult; height?: number }) {
  const cx = W / 2;
  const cy = (height ?? H) / 2;
  const R = Math.min(cx - M.r, cy - M.t) - 6;
  const rMax = result.bounds.yMax || 1;
  const project = (theta: number, r: number) => [cx + (r / rMax) * R * Math.cos(theta), cy - (r / rMax) * R * Math.sin(theta)] as const;
  const rings = niceTicks(0, rMax, 4).filter((v) => v > 0);
  const drawable = result.traces.filter((t) => !t.hidden && !t.error && t.points.length > 0);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${height ?? H}`} style={{ display: "block" }} role="img" aria-label="Polar plot">
      {rings.map((v, i) => (
        <circle key={i} cx={cx} cy={cy} r={(v / rMax) * R} fill="none" stroke="var(--border-hairline)" strokeWidth="1" />
      ))}
      {[0, 30, 60, 90, 120, 150].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return <line key={deg} x1={cx - R * Math.cos(a)} y1={cy - R * Math.sin(a)} x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)} stroke="var(--border-hairline)" strokeWidth="1" />;
      })}
      {rings.map((v, i) => (
        <text key={`r${i}`} x={cx + 3} y={cy - (v / rMax) * R - 2} style={{ font: "9px var(--font-mono)", fill: "var(--text-muted)" }}>
          {fmtNum(v)}
        </text>
      ))}
      {drawable.map((t, i) => {
        const color = traceColor(i, t.color);
        const d = t.points
          .map((p, j) => {
            const [x, y] = project(p.x, p.y);
            return `${j ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(" ");
        return <path key={t.id} d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeDasharray={t.dash ? "5 3" : undefined} />;
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Legend
 * ------------------------------------------------------------------ */

export function PlotLegend({
  traces,
  boundLabel,
  onToggle,
}: {
  traces: TraceResult[];
  boundLabel?: string | null;
  onToggle?: (id: string) => void;
}) {
  if (traces.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
      <span style={{ font: "10px/1 var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>Series</span>
      {traces.map((t, i) => (
        <LegendChip key={t.id} trace={t} color={traceColor(i, t.color)} onClick={onToggle ? () => onToggle(t.id) : undefined} />
      ))}
      {boundLabel && (
        <span style={{ marginLeft: "auto", font: "10.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
          bound to <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{boundLabel}</span>
        </span>
      )}
    </div>
  );
}

function LegendChip({ trace, color, onClick }: { trace: TraceResult; color: string; onClick?: () => void }) {
  const on = !trace.hidden;
  const inner = (
    <>
      <span style={{ width: 14, height: 0, borderTop: `2px ${trace.dash ? "dashed" : "solid"} ${trace.error ? "var(--status-error)" : color}` }} />
      <span style={{ font: "11px/1 var(--font-sans)", color: "var(--text-primary)" }}>{trace.label}</span>
      {trace.error && <Icon name="alertCirc" size={11} />}
    </>
  );
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    height: 24,
    padding: "0 9px",
    border: "1px solid var(--border-hairline)",
    borderRadius: 99,
    background: on ? "var(--surface-raised)" : "var(--surface-chrome)",
    color: trace.error ? "var(--status-error)" : undefined,
    opacity: on ? 1 : 0.5,
  };
  if (!onClick) return <span style={style}>{inner}</span>;
  return (
    <button type="button" onClick={onClick} title={on ? "Hide series" : "Show series"} style={{ ...style, cursor: "pointer" }}>
      {inner}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Empty state (mockup (c)) + contour/3D 'configure' placeholder
 * ------------------------------------------------------------------ */

export function PlotEmptyState() {
  return (
    <div
      className="q-grid"
      style={{
        border: "1px dashed var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-paper)",
        minHeight: 220,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 46,
          height: 46,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-hairline)",
          background: "var(--surface-raised)",
          color: "var(--accent)",
          marginBottom: 13,
        }}
      >
        <Icon name="plot" size={24} />
      </span>
      <div style={{ font: "600 13.5px/1.3 var(--font-sans)", color: "var(--text-primary)", marginBottom: 5 }}>Pick variables to plot</div>
      <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)", maxWidth: 290, marginBottom: 14 }}>
        Add a trace and set the x range — choose a name defined above this region, or type an expression like{" "}
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>2·x²</span>.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <ChooserPill axis="x" />
        <ChooserPill axis="y" />
      </div>
    </div>
  );
}

function ChooserPill({ axis }: { axis: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 28,
        padding: "0 11px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        font: "12px/1 var(--font-sans)",
        color: "var(--text-muted)",
      }}
    >
      {axis} <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>—</span>
    </span>
  );
}

/**
 * Contour / 3D surface — selectable now, rendered in a follow-up. The card shows
 * the full, round-tripped config (z-expr, x/y ranges, grid, options) so it reads
 * as a configured-but-pending plot, never a dead tile.
 */
export function PlotPlaceholder({ region }: { region: PlotRegion }) {
  const label = region.kind === "surface" ? "3D surface" : "Contour";
  const z = region.z?.expr?.trim();
  const rng = (a: PlotRegion["x"]) =>
    a.min != null || a.max != null ? `${fmtNum(a.min ?? 0)} – ${fmtNum(a.max ?? 0)}${a.unit ? ` ${a.unit}` : ""}` : "auto";
  const rows: [string, string][] = [
    ["z", z ? `${region.z?.label || "z"} := ${z}` : "— not set"],
    ["x", rng(region.x)],
    ["y", rng(region.y)],
    ["grid", `${region.grid?.x ?? 24} × ${region.grid?.y ?? 24}`],
  ];
  return (
    <div
      className="q-grid"
      style={{
        border: "1px dashed var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-paper)",
        padding: 18,
        display: "flex",
        gap: 16,
        alignItems: "center",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: "var(--radius-md)", border: "1px solid var(--border-hairline)", background: "var(--surface-raised)", color: "var(--accent)", flex: "0 0 auto" }}>
        <Icon name={region.kind === "surface" ? "plot3d" : "contour"} size={24} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: "600 13px/1.3 var(--font-sans)", color: "var(--text-primary)", marginBottom: 2 }}>{label} — configure in the inspector</div>
        <div style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)", marginBottom: 8 }}>
          Rendering ships next; your settings are saved with the worksheet.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 10, rowGap: 3 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <span style={{ font: "10.5px/1.5 var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>{k}</span>
              <span style={{ font: "12px/1.5 var(--font-mono)", color: "var(--text-primary)" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
