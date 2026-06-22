import type { KeyBinding, Keymap, KeymapId } from "./types";

/**
 * Shared worksheet/app bindings — identical across keymaps. These are owned by
 * `EditorKeyboard` (or the region editors) and use the platform modifier
 * (`Mod` → ⌘ / Ctrl). The two keymaps differ only in how the *math field*
 * interprets keystrokes (see `mathcadMathEntry` / `defaultMathEntry`).
 */
const operatorBindings: KeyBinding[] = [
  { action: "insertGreek", label: "Convert letters to Greek — p then Ctrl+G makes π", keys: ["Ctrl", "+", "G"], group: "Operators & Greek", scope: "math", chord: "Ctrl+G" },
  { action: "insertSummation", label: "Insert summation", keys: ["Ctrl", "+", "Shift", "+", "S"], group: "Operators & Greek", scope: "math", chord: "Ctrl+Shift+S" },
  { action: "insertProduct", label: "Insert product", keys: ["Ctrl", "+", "Shift", "+", "P"], group: "Operators & Greek", scope: "math", chord: "Ctrl+Shift+P" },
  { action: "insertIntegral", label: "Insert integral", keys: ["Ctrl", "+", "Shift", "+", "I"], group: "Operators & Greek", scope: "math", chord: "Ctrl+Shift+I" },
  { action: "insertDerivative", label: "Insert derivative", keys: ["Ctrl", "+", "/"], group: "Operators & Greek", scope: "math" },
  { action: "insertPartial", label: "Insert partial derivative", keys: ["Ctrl", "+", "Shift", "+", "D"], group: "Operators & Greek", scope: "math" },
  { action: "insertLimit", label: "Insert limit", keys: ["Ctrl", "+", "L"], group: "Operators & Greek", scope: "math" },
  { action: "insertRange", label: "Insert range variable", keys: [";"], group: "Operators & Greek", scope: "math" },
  { action: "insertMatrix", label: "Insert matrix", keys: ["Ctrl", "+", "M"], group: "Operators & Greek", scope: "math" },
];

const selectionBindings: KeyBinding[] = [
  { action: "expandSelection", label: "Expand selection (the signature Mathcad key)", keys: ["Space"], group: "Selection & navigation", scope: "math", signature: true },
  { action: "nextPlaceholder", label: "Next / previous placeholder", keys: ["Tab", "or", "Shift", "+", "Tab"], group: "Selection & navigation", scope: "math" },
  { action: "moveCaret", label: "Move within the expression", keys: ["←", "or", "→"], group: "Selection & navigation", scope: "math" },
  { action: "removeLeft", label: "Remove to the left", keys: ["Backspace"], group: "Selection & navigation", scope: "math" },
];

const regionBindings: KeyBinding[] = [
  { action: "startMathRegion", label: "Start a math region — just type", keys: ["A–Z"], group: "Regions", scope: "app" },
  { action: "emptyRegionToText", label: "Convert an empty region to text", keys: ["Space"], group: "Regions", scope: "app" },
  { action: "newRegion", label: "New region below", keys: ["Mod", "+", "Enter"], group: "Regions", scope: "app" },
  { action: "deleteRegion", label: "Delete the selected region", keys: ["Mod", "+", "Del"], group: "Regions", scope: "app" },
  { action: "copyRegion", label: "Copy the selected region(s)", keys: ["Mod", "+", "C"], group: "Regions", scope: "app" },
  { action: "cutRegion", label: "Cut the selected region(s)", keys: ["Mod", "+", "X"], group: "Regions", scope: "app" },
  { action: "pasteRegion", label: "Paste region(s)", keys: ["Mod", "+", "V"], group: "Regions", scope: "app" },
  { action: "groupRegions", label: "Group selection into an area", keys: ["Mod", "+", "G"], group: "Regions", scope: "app" },
];

const calculationBindings: KeyBinding[] = [
  { action: "recalculate", label: "Recalculate the worksheet", keys: ["F9"], group: "Calculation", scope: "app" },
  { action: "recalculateToHere", label: "Recalculate to here", keys: ["Shift", "+", "F9"], group: "Calculation", scope: "app" },
  { action: "toggleCalcMode", label: "Toggle Auto / Manual calc", keys: ["Mod", "+", "Shift", "+", "A"], group: "Calculation", scope: "app" },
];

const appBindings: KeyBinding[] = [
  { action: "save", label: "Save worksheet", keys: ["Mod", "+", "S"], group: "App", scope: "app" },
  { action: "undo", label: "Undo", keys: ["Mod", "+", "Z"], group: "App", scope: "app" },
  { action: "redo", label: "Redo", keys: ["Mod", "+", "Shift", "+", "Z"], group: "App", scope: "app" },
  { action: "find", label: "Find", keys: ["Mod", "+", "F"], group: "App", scope: "app" },
  { action: "commandPalette", label: "Command palette", keys: ["Mod", "+", "K"], group: "App", scope: "app" },
  { action: "export", label: "Export", keys: ["Mod", "+", "P"], group: "App", scope: "app" },
  { action: "openShortcuts", label: "Open this reference", keys: ["/"], group: "App", scope: "app" },
];

const sharedBindings: KeyBinding[] = [
  ...operatorBindings,
  ...selectionBindings,
  ...regionBindings,
  ...calculationBindings,
  ...appBindings,
];

/**
 * Mathcad-style keymap — the default. Natural 2D math entry: typing builds
 * textbook notation live, the way Mathcad Prime behaves. `Space` expands the
 * selection up the expression (the signature move) and `.` makes a literal
 * (name) subscript.
 */
const mathcadMathEntry: KeyBinding[] = [
  { action: "insertAssign", label: "Make an assignment ( := )", keys: [":"], group: "Math entry", scope: "math", chord: ":" },
  { action: "insertEvaluate", label: "Evaluate a result ( = )", keys: ["="], group: "Math entry", scope: "math" },
  { action: "insertFraction", label: "Stacked fraction", keys: ["/"], group: "Math entry", scope: "math" },
  { action: "insertSuperscript", label: "Superscript / exponent", keys: ["^"], group: "Math entry", scope: "math" },
  { action: "insertSubscript", label: "Subscript (index)", keys: ["_"], group: "Math entry", scope: "math" },
  { action: "insertLiteralSubscript", label: "Literal subscript — type F.t for Fₜ", keys: ["."], group: "Math entry", scope: "math" },
  { action: "insertIndexSubscript", label: "Index subscript", keys: ["["], group: "Math entry", scope: "math" },
  { action: "insertSqrt", label: "Square root", keys: ["\\"], group: "Math entry", scope: "math" },
  { action: "insertAbs", label: "Absolute value", keys: ["|"], group: "Math entry", scope: "math" },
  { action: "expandSelection", label: "Expand the selection up the expression", keys: ["Space"], group: "Math entry", scope: "math", signature: true },
];

const mathcadKeymap: Keymap = {
  id: "mathcad",
  name: "Mathcad",
  description:
    "Space expands the selection; “.” makes a literal subscript; type-to-math. Recommended for engineers moving from Mathcad / BlockPad.",
  bindings: [...mathcadMathEntry, ...sharedBindings],
};

/**
 * Default keymap — a plainer, explicit-command profile for users who prefer
 * conventional entry over Mathcad's live 2D building. Space inserts a space;
 * structures are reached with explicit chords.
 */
const defaultMathEntry: KeyBinding[] = [
  { action: "insertAssign", label: "Make an assignment ( := )", keys: [":", "="], group: "Math entry", scope: "math", chord: ":=" },
  { action: "insertEvaluate", label: "Evaluate a result ( = )", keys: ["="], group: "Math entry", scope: "math" },
  { action: "insertFraction", label: "Stacked fraction", keys: ["Ctrl", "+", "/"], group: "Math entry", scope: "math", chord: "Ctrl+/" },
  { action: "insertSuperscript", label: "Superscript / exponent", keys: ["^"], group: "Math entry", scope: "math" },
  { action: "insertSubscript", label: "Subscript (index)", keys: ["_"], group: "Math entry", scope: "math" },
  { action: "insertSqrt", label: "Square root", keys: ["Ctrl", "+", "R"], group: "Math entry", scope: "math", chord: "Ctrl+R" },
  { action: "insertAbs", label: "Absolute value", keys: ["Ctrl", "+", "|"], group: "Math entry", scope: "math" },
];

const defaultKeymap: Keymap = {
  id: "default",
  name: "Default",
  description:
    "Standard editor keys. Space inserts a space; arrows move the caret normally.",
  bindings: [...defaultMathEntry, ...sharedBindings],
};

export const keymaps: Record<KeymapId, Keymap> = {
  mathcad: mathcadKeymap,
  default: defaultKeymap,
};

/** Mathcad-style entry is the default keymap. */
export const DEFAULT_KEYMAP_ID: KeymapId = "mathcad";

export function getKeymap(id: KeymapId): Keymap {
  return keymaps[id];
}
