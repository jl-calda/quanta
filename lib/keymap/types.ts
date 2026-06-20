/**
 * Quanta keymaps.
 *
 * A keymap is the single source of truth for math-entry and worksheet
 * shortcuts. It is defined once (see `keymaps.ts`) and reused by:
 *   • the MathLive editor configuration (`mathlive.ts` → `mathfieldOptionsFromKeymap`),
 *   • the keyboard-shortcuts reference modal (`ShortcutsDialog`),
 *   • the floating math keypad's key hints, and
 *   • the keymap picker in Preferences (Mathcad default / Default).
 *
 * Because the reference modal renders straight from these bindings, there is no
 * drift between what the editor does and what the reference says it does.
 */

export type KeymapId = "mathcad" | "default";

/** Reference-modal groups, in display order (mirrors the design mockup 7.25). */
export type KeyBindingGroup =
  | "Math entry"
  | "Operators & Greek"
  | "Selection & navigation"
  | "Regions"
  | "Calculation"
  | "App";

/**
 * Which subsystem a binding belongs to:
 *   • `math` — fires inside a math field (owned by MathLive / the region editor).
 *   • `app`  — a worksheet-level accelerator (owned by `EditorKeyboard`); these
 *     use the platform modifier (`Mod` → ⌘ on macOS, Ctrl elsewhere).
 */
export type KeyScope = "math" | "app";

export interface KeyBinding {
  /** Stable action id the editor / MathLive bridge dispatches. */
  action: string;
  /** Human-readable label for the reference modal. */
  label: string;
  /**
   * Display key tokens for the keycap chips, e.g. `["Mod", "+", "Enter"]` or
   * `["Tab", "or", "Shift", "+", "Tab"]`. `"+"` joins a chord, `"or"` separates
   * alternatives, `"Mod"` renders as ⌘ / Ctrl per platform.
   */
  keys: string[];
  group: KeyBindingGroup;
  scope: KeyScope;
  /** Signature Mathcad key — starred in the reference modal. */
  signature?: boolean;
  /**
   * Machine trigger consumed by the MathLive bridge: an inline-shortcut key
   * (`":"`, `":="`) or a keybinding chord (`"Ctrl+/"`, `"Ctrl+G"`). Omitted when
   * MathLive handles the key natively, or when the binding is `app`-scoped (the
   * `EditorKeyboard` handler owns those explicitly).
   */
  chord?: string;
}

export interface Keymap {
  id: KeymapId;
  /** Display name shown in the Preferences picker and the modal badge. */
  name: string;
  description: string;
  bindings: KeyBinding[];
}
