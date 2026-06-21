/**
 * Canonical math symbol + operator catalog — the single source of truth for
 * every notation insert in Quanta.
 *
 * The ribbon's operator palette, the Insert-symbol dialog, the keyboard-shortcuts
 * panel, and the command palette all read THIS table; there is deliberately no
 * second symbol list. Pure data (no DOM, no React) so it lives in `/lib/keymap`
 * beside the keymaps and stays portable — the editor's `math-entry` bridge
 * re-exports the operator templates and performs the actual insertion into the
 * focused field.
 */

/* ------------------------------------------------------------------ *
 * Operator / matrix structures (moved here from the editor so the
 * insert table has a single home).
 * ------------------------------------------------------------------ */

/** Keys for the ribbon's Operators / Math-evaluation groups. */
export type OperatorKey =
  | "fraction" | "exponent" | "root" | "subscript" | "absolute" | "factorial"
  | "summation" | "product" | "integral"
  | "derivative" | "partial" | "limit"
  | "range" | "index"
  | "assign" | "evaluate" | "global";

/** A math structure that can be inserted live or used to seed a new region. */
export interface OperatorTemplate {
  /** LaTeX inserted into the active math-field (`#@` = selection, `#?` = empty slot). */
  latex: string;
  /** Engine-plain-text for the mono field and to seed a fresh math region. */
  source: string;
}

export const OPERATOR_TEMPLATES: Record<OperatorKey, OperatorTemplate> = {
  fraction: { latex: "\\frac{#@}{#?}", source: "a/b" },
  exponent: { latex: "{#@}^{#?}", source: "x^2" },
  root: { latex: "\\sqrt{#0}", source: "sqrt(x)" },
  subscript: { latex: "{#@}_{#?}", source: "x_1" },
  absolute: { latex: "\\left|#0\\right|", source: "abs(x)" },
  factorial: { latex: "#@!", source: "n!" },
  summation: { latex: "\\sum_{#?=#?}^{#?}\\left(#0\\right)", source: "summation(i, 1, 10, i)" },
  product: { latex: "\\prod_{#?=#?}^{#?}\\left(#0\\right)", source: "product(i, 1, 5, i)" },
  integral: { latex: "\\int_{#?}^{#?}\\left(#0\\right)\\,d#?", source: "integral(x, 0, 1, x^2)" },
  derivative: { latex: "\\frac{d}{d#?}#0", source: "diff(x^2, x)" },
  partial: { latex: "\\frac{\\partial}{\\partial #?}#0", source: "diff(f, x)" },
  limit: { latex: "\\lim_{#?\\to#?}#0", source: "limit(sin(x)/x, x, 0)" },
  range: { latex: "#@..#?", source: "1..10" },
  index: { latex: "{#@}_{#?}", source: "v_1" },
  assign: { latex: "\\coloneq", source: ":=" },
  evaluate: { latex: "=", source: "=" },
  global: { latex: "\\equiv", source: "==" },
};

/** Keys for the Matrices tab's operation buttons. */
export type MatrixOpKey =
  | "transpose" | "inverse" | "determinant" | "identity" | "augment" | "stack" | "indexing";

export const MATRIX_TEMPLATES: Record<MatrixOpKey, OperatorTemplate> = {
  transpose: { latex: "{#@}^{\\mathsf{T}}", source: "transpose(M)" },
  inverse: { latex: "{#@}^{-1}", source: "inv(M)" },
  determinant: { latex: "\\left|#@\\right|", source: "det(M)" },
  identity: { latex: "\\mathrm{identity}(#?)", source: "identity(3)" },
  augment: { latex: "\\mathrm{augment}(#?, #?)", source: "concat(A, B)" },
  stack: { latex: "\\mathrm{stack}(#?, #?)", source: "concat(A, B, 1)" },
  indexing: { latex: "{#@}_{#?}", source: "M_1" },
};

/* ------------------------------------------------------------------ *
 * Symbol catalog — Greek, relational, arrows, misc, plus the operator
 * structures above surfaced as grid entries.
 * ------------------------------------------------------------------ */

export type SymbolGroup =
  | "Greek"
  | "Operators"
  | "Calculus"
  | "Relational"
  | "Arrows"
  | "Misc";

export interface SymbolEntry {
  /** Stable id + search key, e.g. `"alpha"`, `"op:fraction"`, `"le"`. */
  id: string;
  /** Human label for tooltips and the shortcuts / command lists. */
  label: string;
  /** Display glyph (STIX) shown in the picker grid. */
  glyph: string;
  /** LaTeX inserted into the active math-field. */
  latex: string;
  /** Engine-plain-text fallback for plain inputs / a new-region seed. */
  source: string;
  group: SymbolGroup;
}

/** Display metadata for the operator structures (the palette's own labels). */
const OPERATOR_DISPLAY: Record<OperatorKey, { glyph: string; label: string; group: "Operators" | "Calculus" }> = {
  fraction: { glyph: "a⁄b", label: "Fraction", group: "Operators" },
  exponent: { glyph: "xⁿ", label: "Exponent", group: "Operators" },
  root: { glyph: "√x", label: "Square root", group: "Operators" },
  subscript: { glyph: "xₙ", label: "Subscript", group: "Operators" },
  absolute: { glyph: "|x|", label: "Absolute value", group: "Operators" },
  factorial: { glyph: "n!", label: "Factorial", group: "Operators" },
  assign: { glyph: "≔", label: "Assignment", group: "Operators" },
  evaluate: { glyph: "=", label: "Evaluate", group: "Operators" },
  global: { glyph: "≡", label: "Global definition", group: "Operators" },
  summation: { glyph: "∑", label: "Summation", group: "Calculus" },
  product: { glyph: "∏", label: "Product", group: "Calculus" },
  integral: { glyph: "∫", label: "Integral", group: "Calculus" },
  derivative: { glyph: "d⁄dx", label: "Derivative", group: "Calculus" },
  partial: { glyph: "∂⁄∂x", label: "Partial derivative", group: "Calculus" },
  limit: { glyph: "lim", label: "Limit", group: "Calculus" },
  range: { glyph: "m‥n", label: "Range variable", group: "Calculus" },
  index: { glyph: "xₙ", label: "Index", group: "Calculus" },
};

const OPERATOR_ENTRIES: SymbolEntry[] = (Object.keys(OPERATOR_TEMPLATES) as OperatorKey[]).map((key) => {
  const d = OPERATOR_DISPLAY[key];
  const t = OPERATOR_TEMPLATES[key];
  return { id: `op:${key}`, label: d.label, glyph: d.glyph, latex: t.latex, source: t.source, group: d.group };
});

/** `[name, glyph, latex]` — engine source is the glyph (the math-field uses latex). */
const GREEK_LOWER: ReadonlyArray<readonly [string, string, string]> = [
  ["alpha", "α", "\\alpha"], ["beta", "β", "\\beta"], ["gamma", "γ", "\\gamma"],
  ["delta", "δ", "\\delta"], ["epsilon", "ε", "\\epsilon"], ["zeta", "ζ", "\\zeta"],
  ["eta", "η", "\\eta"], ["theta", "θ", "\\theta"], ["iota", "ι", "\\iota"],
  ["kappa", "κ", "\\kappa"], ["lambda", "λ", "\\lambda"], ["mu", "μ", "\\mu"],
  ["nu", "ν", "\\nu"], ["xi", "ξ", "\\xi"], ["pi", "π", "\\pi"], ["rho", "ρ", "\\rho"],
  ["sigma", "σ", "\\sigma"], ["tau", "τ", "\\tau"], ["upsilon", "υ", "\\upsilon"],
  ["phi", "φ", "\\phi"], ["chi", "χ", "\\chi"], ["psi", "ψ", "\\psi"], ["omega", "ω", "\\omega"],
];

const GREEK_UPPER: ReadonlyArray<readonly [string, string, string]> = [
  ["Gamma", "Γ", "\\Gamma"], ["Delta", "Δ", "\\Delta"], ["Theta", "Θ", "\\Theta"],
  ["Lambda", "Λ", "\\Lambda"], ["Xi", "Ξ", "\\Xi"], ["Pi", "Π", "\\Pi"],
  ["Sigma", "Σ", "\\Sigma"], ["Phi", "Φ", "\\Phi"], ["Psi", "Ψ", "\\Psi"], ["Omega", "Ω", "\\Omega"],
];

const GREEK_ENTRIES: SymbolEntry[] = [...GREEK_LOWER, ...GREEK_UPPER].map(([name, glyph, latex]) => ({
  id: name,
  label: name[0].toUpperCase() + name.slice(1),
  glyph,
  latex,
  source: glyph,
  group: "Greek" as const,
}));

/** `[id, label, glyph, latex, source]`. */
const RELATIONAL: ReadonlyArray<readonly [string, string, string, string, string]> = [
  ["le", "Less than or equal", "≤", "\\le", "<="],
  ["ge", "Greater than or equal", "≥", "\\ge", ">="],
  ["ne", "Not equal", "≠", "\\ne", "!="],
  ["approx", "Approximately equal", "≈", "\\approx", "≈"],
  ["equiv", "Identical to", "≡", "\\equiv", "=="],
  ["propto", "Proportional to", "∝", "\\propto", "∝"],
  ["times", "Multiply", "×", "\\times", "*"],
  ["cdot", "Dot product", "·", "\\cdot", "*"],
  ["div", "Divide", "÷", "\\div", "/"],
  ["pm", "Plus–minus", "±", "\\pm", "±"],
  ["mp", "Minus–plus", "∓", "\\mp", "∓"],
  ["in", "Element of", "∈", "\\in", "∈"],
];

const ARROWS: ReadonlyArray<readonly [string, string, string, string, string]> = [
  ["to", "Rightward arrow", "→", "\\rightarrow", "→"],
  ["gets", "Leftward arrow", "←", "\\leftarrow", "←"],
  ["iff", "Left–right arrow", "↔", "\\leftrightarrow", "↔"],
  ["implies", "Implies", "⇒", "\\Rightarrow", "⇒"],
  ["impliedby", "Implied by", "⇐", "\\Leftarrow", "⇐"],
  ["mapsto", "Maps to", "↦", "\\mapsto", "↦"],
];

const MISC: ReadonlyArray<readonly [string, string, string, string, string]> = [
  ["infty", "Infinity", "∞", "\\infty", "Infinity"],
  ["partialsym", "Partial", "∂", "\\partial", "∂"],
  ["nabla", "Nabla / del", "∇", "\\nabla", "∇"],
  ["degree", "Degree", "°", "^\\circ", "deg"],
  ["angle", "Angle", "∠", "\\angle", "∠"],
  ["perp", "Perpendicular", "⊥", "\\perp", "⊥"],
  ["parallel", "Parallel", "∥", "\\parallel", "∥"],
  ["prime", "Prime", "′", "'", "'"],
  ["emptyset", "Empty set", "∅", "\\emptyset", "∅"],
  ["therefore", "Therefore", "∴", "\\therefore", "∴"],
];

const fromTuples = (
  rows: ReadonlyArray<readonly [string, string, string, string, string]>,
  group: SymbolGroup,
): SymbolEntry[] =>
  rows.map(([id, label, glyph, latex, source]) => ({ id, label, glyph, latex, source, group }));

/** Ordered symbol groups — the Insert-symbol dialog renders one tab per group. */
export const SYMBOL_GROUPS: ReadonlyArray<{ group: SymbolGroup; entries: SymbolEntry[] }> = [
  { group: "Greek", entries: GREEK_ENTRIES },
  { group: "Operators", entries: OPERATOR_ENTRIES.filter((e) => e.group === "Operators") },
  { group: "Calculus", entries: OPERATOR_ENTRIES.filter((e) => e.group === "Calculus") },
  { group: "Relational", entries: fromTuples(RELATIONAL, "Relational") },
  { group: "Arrows", entries: fromTuples(ARROWS, "Arrows") },
  { group: "Misc", entries: fromTuples(MISC, "Misc") },
];

/** Flat list of every symbol, for search (command palette, shortcuts panel). */
export const ALL_SYMBOLS: SymbolEntry[] = SYMBOL_GROUPS.flatMap((g) => g.entries);
