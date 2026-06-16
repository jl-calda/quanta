/**
 * Quanta calc engine — shared types.
 *
 * The engine is pure and deterministic: identical results on the client, the
 * Web Worker, and Node. Errors use a typed model so each region can surface a
 * specific, fixable message in the app's voice (never a raw library throw).
 */

export type CalcErrorCode =
  | "parse_error"
  | "unit_mismatch"
  | "undefined_symbol"
  | "evaluation_error";

export interface CalcError {
  code: CalcErrorCode;
  /** What's wrong, in the app's voice. */
  message: string;
  /** Optional hint on how to fix it. */
  hint?: string;
}

export interface CalcOk {
  ok: true;
  /** The raw evaluated value (number, mathjs Unit, matrix, …). */
  value: unknown;
  /** Result formatted for display, carrying its unit where applicable. */
  formatted: string;
  /** TeX of the input expression, for KaTeX/STIX rendering. */
  tex: string;
}

export interface CalcErr {
  ok: false;
  error: CalcError;
}

export type CalcResult = CalcOk | CalcErr;
