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
export {
  parseRegion,
  splitDefinition,
  collectDeps,
  filterUnitLiterals,
  normalizeSource,
} from "./parse";
export { latexToSource, sourceToLatex, exprToLatex, constraintToLatex, looksLikeLatex } from "./latex";
export { isSymbolic } from "./symbolic";
export { analyzeDependencies } from "./graph";
export { formatValue } from "./format";
export { applyConditional } from "./conditional";
export { buildSubstitutedTex } from "./show-steps";
export { toDisplayUnit, SI_SYSTEM, isUnit } from "./units";
export { math } from "./math";

// Table / spreadsheet region (pure, engine-native — see ./table, ./lookups).
export {
  evaluateTable,
  serializeForScope,
  colToLetter,
  letterToCol,
  parseA1,
  cellAddress,
  type TableSpec,
  type TableColumnSpec,
  type TableResult,
  type TableCellResult,
  type TableCellKind,
} from "./table";
export { Vlookup, Hlookup, Index, Match, Interp, LOOKUP_FUNCTIONS } from "./lookups";

// Plot region (pure, engine-native — see ./plot).
export {
  evaluatePlot,
  niceBounds,
  niceNum,
  type PlotSpec,
  type PlotAxisSpec,
  type PlotTraceSpec,
  type PlotKind,
  type PlotTraceStyle,
  type PlotPoint,
  type PlotResult,
  type TraceResult,
  type PlotBounds,
} from "./plot";

// Solve block (pure, engine-native — see ./solve).
export {
  evaluateSolve,
  jsSolverBackend,
  guessSource,
  type SolveSpec,
  type SolveResult,
  type SolveStatus,
  type SolveAlgorithm,
  type SolveOutput,
  type SolveGuessSpec,
  type SolveOdeConfig,
  type SolverBackend,
  type NumericProblem,
  type SolveRun,
} from "./solve";

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
