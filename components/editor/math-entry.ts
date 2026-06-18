/**
 * Math-entry bridge — insert notation into whatever formula surface is focused.
 *
 * Quanta has two entry surfaces: the PRIMARY MathLive `<math-field>` (natural 2D
 * entry) and a SECONDARY plain `<input>`/`<textarea>` (the mono formula field and
 * anything else). The ribbon's operator groups and the floating keypad both need
 * to drop a structure at the caret of the active one; this is the single place
 * that knows how to talk to each. It never imports `mathlive` (SSR-safe) — the
 * math-field is detected by tag name and driven through its public
 * `executeCommand(["insert", …])` API (the same one `lib/keymap/mathlive.ts`
 * configures), so the module stays a plain, testable helper.
 */

export interface InsertPayload {
  /** LaTeX template for the MathLive field (placeholders `#@` arg / `#?` empty). */
  latex?: string;
  /** Plain engine-source text for an `<input>`/`<textarea>` (and ascii fallback). */
  text?: string;
}

/** A math structure that can be inserted live or used to seed a new region. */
export interface OperatorTemplate {
  /** LaTeX inserted into the active math-field. */
  latex: string;
  /** Engine-plain-text used for the mono field and to seed a fresh math region. */
  source: string;
}

/** Loose view of the MathLive element — typed without importing the package. */
interface MathFieldLike {
  executeCommand?: (command: unknown) => boolean;
}

function isMathField(el: Element): el is Element & MathFieldLike {
  return el.tagName === "MATH-FIELD" && typeof (el as MathFieldLike).executeCommand === "function";
}

/** Insert `text` at the caret of a plain input/textarea via the native setter. */
function insertIntoTextField(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  const proto = el.tagName === "INPUT" ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const next = el.value.slice(0, start) + text + el.value.slice(end);
  // Use the native setter so React's controlled inputs see the change.
  setter?.call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  const caret = start + text.length;
  el.setSelectionRange(caret, caret);
}

/**
 * Insert into the currently focused formula surface. Returns `false` when no
 * editable formula surface is focused (the caller can then fall back to opening
 * a new region). Callers must fire this from `onMouseDown` + `preventDefault` so
 * the field keeps focus.
 */
export function insertIntoActiveField(payload: InsertPayload): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (!el) return false;

  if (isMathField(el)) {
    if (payload.latex) return el.executeCommand?.(["insert", payload.latex]) ?? true;
    if (payload.text) {
      return el.executeCommand?.(["insert", payload.text, { format: "ascii-math" }]) ?? true;
    }
    return false;
  }

  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    const text = payload.text ?? payload.latex;
    if (text == null) return false;
    insertIntoTextField(el as HTMLInputElement | HTMLTextAreaElement, text);
    return true;
  }

  return false;
}

/** Keys for the ribbon's Operators / Math-evaluation groups. */
export type OperatorKey =
  | "fraction" | "exponent" | "root" | "subscript" | "absolute" | "factorial"
  | "summation" | "product" | "integral"
  | "derivative" | "partial" | "limit"
  | "range" | "index"
  | "assign" | "evaluate" | "global";

/**
 * Math structures the ribbon inserts (Func §5.2 — the operator groups that drive
 * natural entry). `latex` builds 2D notation in the live field; `source` is the
 * engine-plain-text used for the mono field and to seed a new region when nothing
 * is focused. LaTeX placeholders: `#@` = the current selection/argument, `#?` =
 * an empty slot to tab into.
 */
export const OPERATOR_TEMPLATES: Record<OperatorKey, OperatorTemplate> = {
  fraction: { latex: "\\frac{#@}{#?}", source: "a/b" },
  exponent: { latex: "{#@}^{#?}", source: "x^2" },
  root: { latex: "\\sqrt{#0}", source: "sqrt(x)" },
  subscript: { latex: "{#@}_{#?}", source: "x_1" },
  absolute: { latex: "\\left|#0\\right|", source: "abs(x)" },
  factorial: { latex: "#@!", source: "n!" },
  summation: { latex: "\\sum_{#?}^{#?}#0", source: "sum([1, 2, 3])" },
  product: { latex: "\\prod_{#?}^{#?}#0", source: "prod([1, 2, 3])" },
  integral: { latex: "\\int_{#?}^{#?}#0\\,d#?", source: "integrate(x^2, x)" },
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

/**
 * Matrix operations — wrap the selection (or seed a call) with a mathjs function
 * the engine evaluates (`transpose`, `inv`, `det`, `identity`, `concat`).
 */
export const MATRIX_TEMPLATES: Record<MatrixOpKey, OperatorTemplate> = {
  transpose: { latex: "{#@}^{\\mathsf{T}}", source: "transpose(M)" },
  inverse: { latex: "{#@}^{-1}", source: "inv(M)" },
  determinant: { latex: "\\left|#@\\right|", source: "det(M)" },
  identity: { latex: "\\mathrm{identity}(#?)", source: "identity(3)" },
  augment: { latex: "\\mathrm{augment}(#?, #?)", source: "concat(A, B)" },
  stack: { latex: "\\mathrm{stack}(#?, #?)", source: "concat(A, B, 1)" },
  indexing: { latex: "{#@}_{#?}", source: "M_1" },
};

/** A `rows × cols` matrix as a LaTeX template (empty slots to tab through). */
export function matrixLatex(rows: number, cols: number): string {
  const row = Array.from({ length: cols }, () => "#?").join(" & ");
  const body = Array.from({ length: rows }, () => row).join(" \\\\ ");
  return `\\begin{pmatrix}${body}\\end{pmatrix}`;
}

/** A `rows × cols` zero matrix as engine-plain-text (mathjs nested arrays). */
export function matrixSource(rows: number, cols: number): string {
  const row = "[" + Array.from({ length: cols }, () => "0").join(", ") + "]";
  return "[" + Array.from({ length: rows }, () => row).join(", ") + "]";
}
