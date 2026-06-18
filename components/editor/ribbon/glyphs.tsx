import type { ReactNode } from "react";

/**
 * STIX math glyph helpers for the ribbon. Math symbols (xⁿ, √, Σ, ∫, fractions)
 * are TYPOGRAPHY, not icons — they render in `--font-math` (STIX Two Text), the
 * product's math voice. Ported from the design mockup (`ribbon-app.jsx`).
 */

/** Italic math variable. */
export function It({ children, s = 13 }: { children: ReactNode; s?: number }) {
  return (
    <span style={{ fontFamily: "var(--font-math)", fontStyle: "italic", fontSize: s, lineHeight: 1 }}>
      {children}
    </span>
  );
}

/** Superscript (exponent). */
export function Up({ children }: { children: ReactNode }) {
  return <sup style={{ fontSize: "0.66em", fontStyle: "normal" }}>{children}</sup>;
}

/** Subscript. */
export function Dn({ children }: { children: ReactNode }) {
  return <sub style={{ fontSize: "0.66em", fontStyle: "normal" }}>{children}</sub>;
}

/** Upright math glyph (operators, function names). */
export function Big({ children, s = 20 }: { children: ReactNode; s?: number }) {
  return (
    <span style={{ fontFamily: "var(--font-math)", fontSize: s, lineHeight: 1 }}>{children}</span>
  );
}

/** A tiny stacked fraction (e.g. d/dx, ∂/∂x) for operator tiles. */
export function MiniFrac({ n, d }: { n: ReactNode; d: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "var(--font-math)",
        fontStyle: "italic",
        fontSize: 11,
        lineHeight: 1.04,
      }}
    >
      <span>{n}</span>
      <span style={{ borderTop: "1px solid currentColor", padding: "0 2px" }}>{d}</span>
    </span>
  );
}
