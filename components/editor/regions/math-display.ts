/**
 * Pure display helpers for the Math region — kept out of the "use client"
 * component so they're unit-testable in vitest's node environment (no JSX, no
 * React, no katex). Covers the inline operator palette (Mockup 6.1 Frame A) and
 * the result magnitude/unit split (Frame C `ResUnit`).
 */

import { isUnit } from "@/lib/calc";
import { OPERATOR_TEMPLATES } from "../math-entry";

/** One key in the inline math-input bar shown while editing a region. */
export interface PaletteItem {
  /** STIX glyph shown on the key (matches `math-region.html` Frame A). */
  glyph: string;
  /** Keyboard-shortcut hint shown beneath the glyph. */
  hint: string;
  /** Accessible label / tooltip. */
  label: string;
  /** LaTeX template inserted into the MathLive field (`#@` selection, `#?` slot). */
  latex: string;
  /** Engine plain-text inserted into the mono field / used as the ascii fallback. */
  text: string;
}

/**
 * The 10-key operator palette from Mockup 6.1 Frame A. `latex` drives the
 * primary MathLive field; `text` drives the secondary mono field. Structure
 * templates reuse {@link OPERATOR_TEMPLATES} (the same shapes the ribbon and
 * keypad insert) so all of Quanta's entry surfaces stay consistent.
 */
export const MATH_PALETTE: PaletteItem[] = [
  { glyph: "a/b", hint: "/", label: "Fraction", latex: OPERATOR_TEMPLATES.fraction.latex, text: "/" },
  { glyph: "x²", hint: "^", label: "Exponent", latex: OPERATOR_TEMPLATES.exponent.latex, text: "^" },
  { glyph: "√", hint: "\\sqrt", label: "Root", latex: OPERATOR_TEMPLATES.root.latex, text: "sqrt(" },
  { glyph: "xₙ", hint: "_", label: "Subscript", latex: OPERATOR_TEMPLATES.subscript.latex, text: "_" },
  { glyph: "xⁿ", hint: "^", label: "Superscript", latex: OPERATOR_TEMPLATES.exponent.latex, text: "^" },
  { glyph: "π", hint: ":p", label: "Greek", latex: "\\pi", text: "pi" },
  { glyph: "Σ", hint: "\\sum", label: "Sum", latex: OPERATOR_TEMPLATES.summation.latex, text: "sum(" },
  { glyph: "∫", hint: "\\int", label: "Integral", latex: OPERATOR_TEMPLATES.integral.latex, text: "integrate(" },
  { glyph: "∂", hint: "\\pd", label: "Partial", latex: OPERATOR_TEMPLATES.partial.latex, text: "diff(" },
  { glyph: "≤", hint: "<=", label: "Relational", latex: "\\le", text: "<=" },
];

/**
 * Split a formatted result into its magnitude and unit so the unit can render
 * as a distinct token (Mockup 6.1 `ResUnit`). mathjs unit values always format
 * as `"<magnitude> <unit>"`, so splitting on the first space is safe; bare
 * numbers (and any non-unit value) return a `null` unit.
 */
export function splitResultUnit(
  formatted: string,
  value: unknown,
): { magnitude: string; unit: string | null } {
  if (isUnit(value)) {
    const i = formatted.indexOf(" ");
    if (i > 0 && i < formatted.length - 1) {
      return { magnitude: formatted.slice(0, i), unit: formatted.slice(i + 1) };
    }
  }
  return { magnitude: formatted, unit: null };
}

/**
 * True when a definition's formatted result is just its own right-hand side —
 * e.g. `B := 2 mm` evaluating to `2 mm`. Such an echo is noise (the worksheet
 * already shows `B := 2 mm`), so the result is suppressed.
 *
 * An evaluation (no `:=`) always keeps its result, even if it happens to equal
 * the source. For a definition we compare the RHS (everything after the first
 * `:=`) against `formatted`, normalizing both — whitespace stripped, lowercased,
 * and `·` treated as `*` — so `9.81 m/s^2` matches regardless of spacing.
 */
export function resultEchoesDefinition(source: string, formatted: string): boolean {
  const at = source.indexOf(":=");
  if (at < 0) return false; // evaluation → keep the echo
  const rhs = source.slice(at + 2);
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase().replace(/·/g, "*");
  return norm(rhs) === norm(formatted);
}
