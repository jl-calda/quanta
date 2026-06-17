/**
 * Reference library catalog — public entry point.
 *
 * A shipped, in-code JSON catalog of functions, units, and constants (no DB):
 * searchable, categorized, with engine-run worked examples. Import from the
 * barrel: `import { ALL, TREE, searchItems, runExample } from "@/lib/calc/reference"`.
 */
export type {
  RefKind,
  RefGroup,
  ReferenceItem,
  ReferenceBase,
  FunctionRef,
  UnitRef,
  ConstantRef,
  ReferenceCategory,
  ReferenceTree,
  WorkedExample,
  ExampleTable,
} from "./types";

export { FUNCTIONS } from "./functions";
export { UNITS } from "@/lib/units/catalog";
export { CONSTANTS } from "@/lib/constants/catalog";
export {
  TREE,
  ALL,
  GROUP_OF_CAT,
  itemById,
  resolveRelated,
  categoryLabel,
  categoryCount,
} from "./tree";
export { searchItems, itemsInCategory, highlightMatch } from "./search";
export type { HighlightSplit } from "./search";
export { runExample } from "./examples";
export type { RunResult, ExampleLine } from "./examples";
