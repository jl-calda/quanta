import type { CSSProperties, ReactNode } from "react";

/* ==========================================================================
   Quanta — textbook math notation primitives.
   Compositional building blocks rendered in the math serif (STIX Two Text).
   These produce true textbook layout (stacked fractions, radicals, sub/sup),
   never code. Used by MathRegion and exported for direct composition.

   Ported 1:1 from the _ds bundle (components/math/MathParts.jsx).

   NOTE: `Math` shadows the global `Math` object within this module only. No
   global-Math call is made here, so it is safe; consumers that need the global
   (e.g. MathRegion's Math.max) live in their own modules that do not import it.
   ========================================================================== */

const mathFont: CSSProperties = {
  fontFamily: "var(--font-math)",
  color: "var(--text-math)",
};

export interface VarProps {
  children?: ReactNode;
  italic?: boolean;
  style?: CSSProperties;
}

/** Variable / symbol in the math face. Use `italic` (default true). */
export function Var({ children, italic = true, style }: VarProps) {
  return <span style={{ ...mathFont, fontStyle: italic ? "italic" : "normal", ...style }}>{children}</span>;
}

export interface SubSupProps {
  base?: ReactNode;
  sub?: ReactNode;
  sup?: ReactNode;
  italic?: boolean;
}

/** Subscript: <Sub base="M" sub="Ed" /> → M_Ed */
export function Sub({ base, sub, italic = true }: SubSupProps) {
  return (
    <span style={{ ...mathFont, fontStyle: italic ? "italic" : "normal", whiteSpace: "nowrap" }}>
      {base}
      <sub style={{ fontSize: "0.66em", fontStyle: "normal", lineHeight: 0 }}>{sub}</sub>
    </span>
  );
}

/** Superscript / power: <Sup base="r" sup="2" /> */
export function Sup({ base, sup, italic = true }: SubSupProps) {
  return (
    <span style={{ ...mathFont, fontStyle: italic ? "italic" : "normal", whiteSpace: "nowrap" }}>
      {base}
      <sup style={{ fontSize: "0.66em", fontStyle: "normal", lineHeight: 0 }}>{sup}</sup>
    </span>
  );
}

export interface FracProps {
  num: ReactNode;
  den: ReactNode;
  style?: CSSProperties;
}

/** Stacked fraction with a true rule between numerator and denominator. */
export function Frac({ num, den, style }: FracProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        verticalAlign: "middle",
        margin: "0 0.18em",
        ...mathFont,
        ...style,
      }}
    >
      <span style={{ padding: "0 0.35em 0.08em", lineHeight: 1.05 }}>{num}</span>
      <span style={{ width: "100%", height: 1, background: "currentColor" }} />
      <span style={{ padding: "0.08em 0.35em 0", lineHeight: 1.05 }}>{den}</span>
    </span>
  );
}

export interface SqrtProps {
  children?: ReactNode;
  index?: ReactNode | null;
  style?: CSSProperties;
}

/** Radical. `index` for nth-root (optional). */
export function Sqrt({ children, index = null, style }: SqrtProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "stretch", ...mathFont, whiteSpace: "nowrap", ...style }}>
      {index != null && (
        <sup style={{ fontSize: "0.6em", alignSelf: "flex-start", marginRight: "-0.35em", marginTop: "0.1em" }}>
          {index}
        </sup>
      )}
      <span style={{ fontSize: "1.15em", lineHeight: 1, transform: "translateY(-0.02em)" }}>{"√"}</span>
      <span style={{ borderTop: "1px solid currentColor", padding: "0.12em 0.2em 0", marginLeft: "-0.06em" }}>
        {children}
      </span>
    </span>
  );
}

export interface OpProps {
  children?: ReactNode;
  style?: CSSProperties;
}

/** Operators & symbols rendered upright in the math face. */
export function Op({ children, style }: OpProps) {
  return <span style={{ ...mathFont, fontStyle: "normal", padding: "0 0.18em", ...style }}>{children}</span>;
}

export interface UnitProps {
  children?: ReactNode;
  style?: CSSProperties;
}

/** Unit label — upright, slightly muted, after a thin space. */
export function Unit({ children, style }: UnitProps) {
  return <span style={{ ...mathFont, fontStyle: "normal", marginLeft: "0.28em", ...style }}>{children}</span>;
}

export interface MathProps {
  size?: number;
  children?: ReactNode;
  style?: CSSProperties;
}

/** Inline math wrapper that sets the face/size for arbitrary composed content. */
export function Math({ size = 17, children, style }: MathProps) {
  return (
    <span
      style={{
        ...mathFont,
        fontSize: size,
        lineHeight: 1.1,
        display: "inline-flex",
        alignItems: "center",
        flexWrap: "wrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
