import type { CSSProperties, ReactNode } from "react";
import { Sub, Sup, Frac, Sqrt, Op, Var } from "@/components/ds";
import { variantFor } from "./format";

/**
 * TemplateThumb — the rendered "live-math moment" thumbnail for a template card
 * (and, scaled up, the Preview drawer's page fallback). Eight representative
 * calc snippets composed from the DS notation primitives over a fine dot-grid,
 * ported 1:1 from the Claude Design export (`gallery-thumbs.jsx`). Server-safe:
 * no client JS. The variant is chosen deterministically from the template id, so
 * each card stably renders the same preview until real region trees populate.
 */

export interface TemplateThumbProps {
  /** Stable seed (template id) → picks one of the 8 variants. */
  seed?: string;
  /** Explicit variant 0–7 (overrides the seed). */
  variant?: number;
  /** Scale factor (1 in cards, ~1.7 in the preview pages). */
  scale?: number;
}

type Tone = "ok" | "warn" | "fail";

export function TemplateThumb({ seed, variant, scale = 1 }: TemplateThumbProps) {
  const v = variant ?? variantFor(seed);
  const fs = 9 * scale;

  const row: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.3em",
    font: `${fs}px/1.35 var(--font-math)`,
    color: "var(--text-math)",
    whiteSpace: "nowrap",
  };

  const u = (text: string): ReactNode => (
    <span style={{ fontSize: "0.8em" }}>{text}</span>
  );

  const eyebrow = (text: string): ReactNode => (
    <div
      style={{
        font: `600 ${6.2 * scale}px/1 var(--font-sans)`,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        margin: "0 0 3px",
      }}
    >
      {text}
    </div>
  );

  const heading = (text: string): ReactNode => (
    <div
      style={{
        font: `600 ${8.5 * scale}px/1.2 var(--font-sans)`,
        color: "var(--text-primary)",
        margin: "5px 0 4px",
      }}
    >
      {text}
    </div>
  );

  const tag = (text: string): ReactNode => (
    <span
      style={{
        marginLeft: "0.3em",
        font: `600 ${6.5 * scale}px/1 var(--font-sans)`,
        color: "var(--status-pass)",
      }}
    >
      {text}
    </span>
  );

  const chip = (val: string, unit: string, tone: Tone = "ok"): ReactNode => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0.16em",
        padding: "0.5px 5px",
        borderRadius: 3,
        fontWeight: 600,
        background:
          tone === "warn"
            ? "var(--status-warning-bg)"
            : tone === "fail"
              ? "var(--status-error-bg)"
              : "var(--status-pass-bg)",
        color:
          tone === "warn"
            ? "var(--status-warning)"
            : tone === "fail"
              ? "var(--status-error)"
              : "var(--status-pass)",
      }}
    >
      <span>{val}</span>
      {unit && <span style={{ fontSize: "0.8em" }}>{unit}</span>}
    </span>
  );

  const sets: ReactNode[] = [
    // 0 — bolt group eccentric shear
    <>
      {eyebrow("EN 1993-1-8 · §3.12")}
      {heading("Bolt group — eccentric shear")}
      <div style={row}>
        <Sub base="V" sub="Ed" />
        <Op>:=</Op>84 {u("kN")}
      </div>
      <div style={row}>
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
      <div style={row}>
        <Sub base="F" sub="v,Ed" />
        <Op>=</Op>
        {chip("19.2", "kN")}
        {tag("OK")}
      </div>
    </>,
    // 1 — beam deflection
    <>
      {eyebrow("AS 1170 · SLS")}
      {heading("Simply-supported beam")}
      <div style={row}>
        <Var>w</Var>
        <Op>:=</Op>1.8 {u("kN/m")}
      </div>
      <div style={row}>
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
    // 2 — guardrail point load
    <>
      {eyebrow("AS 1657 · barriers")}
      {heading("Guardrail post")}
      <div style={row}>
        <Var>P</Var>
        <Op>:=</Op>1.5 {u("kN")}
      </div>
      <div style={row}>
        <Sub base="M" sub="Ed" />
        <Op>=</Op>
        <Var>P</Var>
        <Op>·</Op>
        <Var>h</Var>
        <Op>=</Op>
        {chip("1.65", "kN·m")}
      </div>
      <div style={row}>
        <Sub base="σ" sub="b" italic={false} />
        <Op>=</Op>
        {chip("142", "MPa")}
      </div>
    </>,
    // 3 — anchor pull-out
    <>
      {eyebrow("ACI 318 · CCD")}
      {heading("Anchor pull-out")}
      <div style={row}>
        <Sub base="N" sub="cb" />
        <Op>=</Op>
        <Frac num={<Sub base="A" sub="Nc" />} den={<Sub base="A" sub="Nc0" />} />
        <Op>·</Op>
        <Sub base="N" sub="b" />
      </div>
      <div style={row}>
        <Sub base="N" sub="Rd" />
        <Op>=</Op>
        {chip("29.7", "kN")}
      </div>
    </>,
    // 4 — weld group
    <>
      {eyebrow("AISC 360 · welds")}
      {heading("Fillet weld group")}
      <div style={row}>
        <Var>a</Var>
        <Op>:=</Op>6 {u("mm")}
      </div>
      <div style={row}>
        <Sub base="f" sub="w" />
        <Op>=</Op>
        <Frac
          num={<Var>V</Var>}
          den={
            <span>
              0.707<Var>a</Var>
              <Var>L</Var>
            </span>
          }
        />
        <Op>=</Op>
        {chip("118", "MPa")}
      </div>
    </>,
    // 5 — unit conversion
    <>
      {eyebrow("Conversion")}
      {heading("Pressure & load units")}
      <div style={row}>
        1 {u("ksi")}
        <Op>=</Op>
        {chip("6.895", "MPa")}
      </div>
      <div style={row}>
        1 {u("kip")}
        <Op>=</Op>
        {chip("4.448", "kN")}
      </div>
      <div style={row}>
        1 {u("psf")}
        <Op>=</Op>
        {chip("47.88", "Pa")}
      </div>
    </>,
    // 6 — column buckling
    <>
      {eyebrow("EN 1993-1-1 · §6.3")}
      {heading("Column buckling")}
      <div style={row}>
        <Sub base="N" sub="cr" />
        <Op>=</Op>
        <Frac
          num={
            <span>
              <Sup base="π" sup="2" italic={false} />
              <Var>EI</Var>
            </span>
          }
          den={<Sup base="L" sup="2" />}
        />
      </div>
      <div style={row}>
        <Var>λ̄</Var>
        <Op>=</Op>
        {chip("0.84", "")}
      </div>
      <div style={row}>
        <Var>χ</Var>
        <Op>·</Op>
        <Sub base="N" sub="pl" />
        <Op>=</Op>
        {chip("612", "kN")}
      </div>
    </>,
    // 7 — retaining wall
    <>
      {eyebrow("Geotech · EC7")}
      {heading("Retaining wall — sliding")}
      <div style={row}>
        <Sub base="K" sub="a" />
        <Op>=</Op>
        <Frac
          num={
            <span>
              1−sin<Var>φ</Var>
            </span>
          }
          den={
            <span>
              1+sin<Var>φ</Var>
            </span>
          }
        />
      </div>
      <div style={row}>
        <Op style={{ padding: 0 }}>FoS</Op>
        <Op>=</Op>
        {chip("1.62", "")}
        {tag("OK")}
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
        padding: `${13 * scale}px ${14 * scale}px`,
        overflow: "hidden",
      }}
    >
      {sets[v]}
    </div>
  );
}
