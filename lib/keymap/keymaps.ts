import type { Keymap, KeymapId } from "./types";

/**
 * Mathcad-style keymap — the default. Natural 2D math entry: typing builds
 * textbook notation live, the way Mathcad Prime behaves.
 */
const mathcadKeymap: Keymap = {
  id: "mathcad",
  name: "Mathcad (default)",
  description: "Natural Mathcad-style 2D math entry.",
  bindings: [
    { keys: ":", action: "insertAssign", description: "Define a variable (:=)", group: "Math entry" },
    { keys: "=", action: "insertEvaluate", description: "Evaluate (show the result)", group: "Math entry" },
    { keys: "/", action: "insertFraction", description: "Stacked fraction", group: "Structure" },
    { keys: "^", action: "insertSuperscript", description: "Superscript / power", group: "Structure" },
    { keys: "_", action: "insertSubscript", description: "Subscript", group: "Structure" },
    { keys: ".", action: "insertLiteralSubscript", description: "Literal (name) subscript", group: "Structure" },
    { keys: "\\", action: "insertSqrt", description: "Square root", group: "Structure" },
    { keys: "Space", action: "expandSelection", description: "Expand selection (exit a subexpression)", group: "Selection" },
    { keys: "Ctrl+G", action: "insertGreek", description: "Greek letter from the previous name", group: "Symbols" },
    { keys: "F9", action: "recalculate", description: "Recalculate the worksheet", group: "Worksheet" },
  ],
};

/**
 * Default keymap — a plainer, explicit-command profile for users who prefer
 * conventional entry over Mathcad's live 2D building.
 */
const defaultKeymap: Keymap = {
  id: "default",
  name: "Default",
  description: "Conventional entry with explicit commands.",
  bindings: [
    { keys: ":=", action: "insertAssign", description: "Define a variable", group: "Math entry" },
    { keys: "=", action: "insertEvaluate", description: "Evaluate (show the result)", group: "Math entry" },
    { keys: "Ctrl+/", action: "insertFraction", description: "Stacked fraction", group: "Structure" },
    { keys: "^", action: "insertSuperscript", description: "Superscript / power", group: "Structure" },
    { keys: "_", action: "insertSubscript", description: "Subscript", group: "Structure" },
    { keys: "Ctrl+R", action: "insertSqrt", description: "Square root", group: "Structure" },
    { keys: "Ctrl+G", action: "insertGreek", description: "Greek letter from the previous name", group: "Symbols" },
    { keys: "F9", action: "recalculate", description: "Recalculate the worksheet", group: "Worksheet" },
  ],
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
