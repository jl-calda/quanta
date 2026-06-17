import type { CSSProperties, ReactNode } from "react";
import { Sub, Sup, Frac, Sqrt, Op, Var } from "@/components/ds";

/**
 * MiniPreview — a small textbook-math thumbnail for recent/template cards (the
 * "live-math moment" in miniature). Composed from the DS notation primitives
 * (server-safe, no client JS), rendered over a fine dot-grid like a worksheet.
 *
 * Until the editor/calc engine populates real region trees, we show one of four
 * representative sample calcs, chosen deterministically from a seed (the
 * worksheet/template id) so each card stably renders the same preview.
 */

export interface MiniPreviewProps {
  /** Stable seed (worksheet/template id) → picks a sample variant. */
  seed?: string;
  /** Explicit variant 0–3 (overrides the seed). */
  variant?: number;
  /** Scale factor for the math (cards vs. empty-state suggestions). */
  scale?: number;
}

/** Stable, dependency-free hash → variant index. */
function pickVariant(seed: string | undefined): number {
  if (!seed) return 0;
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return sum % 4;
}

export function MiniPreview({ seed, variant, scale = 1 }: MiniPreviewProps) {
  const v = variant ?? pickVariant(seed);
  const fs = 9.5 * scale;

  const lineRow: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.35em",
    font: `${fs}px/1.3 var(--font-math)`,
    color: "var(--text-math)",
    whiteSpace: "nowrap",
  };

  const num = (value: ReactNode, unit?: ReactNode): ReactNode => (
    <>
      <span>{value}</span>
      {unit != null && <span style={{ fontSize: "0.82em" }}>{unit}</span>}
    </>
  );

  const chip = (value: string, unit: string, tone: "ok" | "warn"): ReactNode => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0.18em",
        padding: "0.5px 4px",
        borderRadius: 3,
        background:
          tone === "warn" ? "var(--status-warning-bg)" : "var(--accent-tint)",
        color: tone === "warn" ? "var(--status-warning)" : "var(--accent)",
        fontWeight: 600,
      }}
    >
      <span>{value}</span>
      <span style={{ fontSize: "0.8em" }}>{unit}</span>
    </span>
  );

  const eyebrow = (text: string): ReactNode => (
    <div
      style={{
        font: `600 ${6.5 * scale}px/1 var(--font-sans)`,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: 4,
      }}
    >
      {text}
    </div>
  );

  const sets: ReactNode[] = [
    <>
      {eyebrow("1 · Inputs")}
      <div style={lineRow}>
        <Sub base="F" sub="t" />
        <Op>:=</Op>
        {num("12", "kN")}
      </div>
      <div style={lineRow}>
        <Var>d</Var>
        <Op>:=</Op>
        {num("16", "mm")}
      </div>
      {eyebrow("2 · Capacity")}
      <div style={lineRow}>
        <Sub base="N" sub="Rd" />
        <Op>=</Op>
        {chip("21.4", "kN", "ok")}
      </div>
    </>,
    <>
      {eyebrow("Deflection")}
      <div style={lineRow}>
        <Var>w</Var>
        <Op>:=</Op>
        {num("1.8", "kN/m")}
      </div>
      <div style={lineRow}>
        <Var>δ</Var>
        <Op>=</Op>
        <Frac
          num={
            <span>
              5<Var>w</Var>
              <Sup base="L" sup="4" />
            </span>
          }
          den={
            <span>
              384<Var>EI</Var>
            </span>
          }
        />
        <Op>=</Op>
        {chip("38", "mm", "warn")}
      </div>
    </>,
    <>
      {eyebrow("Point load")}
      <div style={lineRow}>
        <Var>P</Var>
        <Op>:=</Op>
        {num("1.5", "kN")}
      </div>
      <div style={lineRow}>
        <Sub base="M" sub="Ed" />
        <Op>=</Op>
        <Var>P</Var>
        <Op>·</Op>
        <Var>h</Var>
        <Op>=</Op>
        {chip("1.65", "kN·m", "ok")}
      </div>
      <div style={lineRow}>
        <Sub base="σ" sub="b" italic={false} />
        <Op>=</Op>
        {chip("142", "MPa", "ok")}
      </div>
    </>,
    <>
      {eyebrow("Bolt group")}
      <div style={lineRow}>
        <Sub base="V" sub="Ed" />
        <Op>:=</Op>
        {num("84", "kN")}
      </div>
      <div style={lineRow}>
        <Sub base="r" sub="max" />
        <Op>=</Op>
        <Sqrt>
          <span>
            <Sup base="x" sup="2" />
            <Op>+</Op>
            <Sup base="y" sup="2" />
          </span>
        </Sqrt>
      </div>
      <div style={lineRow}>
        <Sub base="F" sub="v" />
        <Op>=</Op>
        {chip("19.2", "kN", "ok")}
      </div>
    </>,
  ];

  return (
    <div
      className="q-grid-mini"
      style={{
        height: "100%",
        width: "100%",
        background: "var(--surface-paper)",
        padding: "12px 13px",
        overflow: "hidden",
      }}
    >
      {sets[v]}
    </div>
  );
}
