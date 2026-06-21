/**
 * Engine-native function library — math, statistical, logical, text, and date
 * families registered onto the shared mathjs instance (see ../math).
 *
 * Registered engine-wide (NOT injected into the table scope): the single shared
 * instance already powers both worksheet math regions AND table cells, so one
 * registration reaches both — no duplicate wiring. All names are UPPERCASE
 * Excel-style so they never override mathjs's lowercase builtins (`round`, `mod`,
 * `and`, `or`, `concat`, …); the lazy logicals (IF/IFS/SWITCH/IFERROR/IFNA) carry
 * `rawArgs` so they receive unevaluated argument nodes. Each family factory takes
 * the `math` instance as an argument (never imports ../math) to stay cycle-free —
 * ../math is the single caller of {@link registerLibraryFunctions}.
 *
 * Decision + naming convention recorded in DECISIONS.md.
 */
import type { MathJsInstance } from "mathjs";
import { makeMathFunctions } from "./math";
import { makeStatFunctions } from "./statistical";
import { makeLogicalFunctions } from "./logical";
import { makeTextFunctions } from "./text";
import { makeDateFunctions } from "./date";

type Fn = (...args: unknown[]) => unknown;

/** Build every family's function map against the shared instance. */
function libraryFunctions(math: MathJsInstance): Record<string, Fn> {
  return {
    ...makeMathFunctions(math),
    ...makeStatFunctions(math),
    ...makeLogicalFunctions(),
    ...makeTextFunctions(),
    ...makeDateFunctions(),
  };
}

/** Register the whole library onto the shared mathjs instance. */
export function registerLibraryFunctions(math: MathJsInstance): void {
  math.import(libraryFunctions(math) as Record<string, unknown>, { override: true });
}

export {
  makeMathFunctions,
  makeStatFunctions,
  makeLogicalFunctions,
  makeTextFunctions,
  makeDateFunctions,
};
