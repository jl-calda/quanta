/**
 * Quanta keymaps.
 *
 * A keymap is the single source of truth for math-entry and worksheet
 * shortcuts. It is defined once here and reused by the MathLive editor
 * configuration, the keyboard-shortcuts reference modal, and the keymap picker
 * in Preferences (Mathcad default / Default).
 */

export type KeymapId = "mathcad" | "default";

export type KeyBindingGroup =
  | "Math entry"
  | "Structure"
  | "Symbols"
  | "Worksheet"
  | "Selection";

export interface KeyBinding {
  /** Trigger key or chord — e.g. ":", "/", "^", "Ctrl+G", "F9". */
  keys: string;
  /** Stable action id the editor dispatches. */
  action: string;
  /** Human-readable description for the shortcuts reference modal. */
  description: string;
  /** Grouping for the shortcuts modal. */
  group: KeyBindingGroup;
}

export interface Keymap {
  id: KeymapId;
  /** Display name shown in the Preferences picker. */
  name: string;
  description: string;
  bindings: KeyBinding[];
}
