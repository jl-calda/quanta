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

// The operator / matrix insert templates are the SINGLE canonical table in
// `/lib/keymap` (shared with the Insert-symbol dialog, shortcuts panel, and
// command palette). This bridge re-exports them and owns only the DOM-side
// insertion; there is deliberately no second copy of the table.
export {
  OPERATOR_TEMPLATES,
  MATRIX_TEMPLATES,
  type OperatorKey,
  type MatrixOpKey,
  type OperatorTemplate,
} from "@/lib/keymap";

export interface InsertPayload {
  /** LaTeX template for the MathLive field (placeholders `#@` arg / `#?` empty). */
  latex?: string;
  /** Plain engine-source text for an `<input>`/`<textarea>` (and ascii fallback). */
  text?: string;
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
