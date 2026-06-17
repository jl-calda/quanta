/**
 * Quanta keymap — public entry point. Defined once; reused by the MathLive
 * editor config, the shortcuts reference modal, and the Preferences picker.
 */
export { keymaps, getKeymap, DEFAULT_KEYMAP_ID } from "./keymaps";
export { applyColonAssign, type EntryEdit } from "./transform";
export {
  mathfieldOptionsFromKeymap,
  type MathfieldKeymapConfig,
  type MathfieldKeybinding,
} from "./mathlive";
export type {
  Keymap,
  KeymapId,
  KeyBinding,
  KeyBindingGroup,
} from "./types";
