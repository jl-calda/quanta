/**
 * Quanta calc engine — public entry point.
 *
 * Pure and deterministic; identical on the client, the Web Worker, and Node.
 * The Pyodide-backed symbolic/heavy-numeric layer lives under ./worker and is
 * loaded lazily, only in the browser.
 */

// Single-expression convenience path.
export { evaluate, type EvaluateExprOptions } from "./evaluate";

// Whole-sheet pipeline + incremental engine.
export {
  evaluateSheet,
  evaluateParsed,
  CalcEngine,
  type EvaluateOptions,
  type RecalcMode,
} from "./recalc";

// Building blocks (exposed for tests, tooling, and the editor layer).
export { parseRegion, splitDefinition, collectDeps, normalizeSource } from "./parse";
export { latexToSource, sourceToLatex } from "./latex";
export { analyzeDependencies } from "./graph";
export { formatValue } from "./format";
export { applyConditional } from "./conditional";
export { buildSubstitutedTex } from "./show-steps";
export { toDisplayUnit, SI_SYSTEM, isUnit } from "./units";
export { math } from "./math";

export type {
  CalcResult,
  CalcOk,
  CalcErr,
  CalcError,
  CalcErrorKind,
  ResultFormat,
  Notation,
  Radix,
  CondRule,
  CondOp,
  CondStyle,
  UnitSystem,
  UnitSystemId,
  RegionInput,
  RegionResult,
  RegionStatus,
  SheetResult,
  SheetStatus,
  DisplayFlags,
} from "./types";
export { DEFAULT_FORMAT } from "./types";
