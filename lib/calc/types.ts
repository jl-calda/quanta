/**
 * Quanta calc engine — shared types.
 *
 * The engine is pure and deterministic: identical results on the client, the
 * Web Worker, and Node. Errors use a typed model so each region can surface a
 * specific, fixable message in the app's voice (never a raw library throw).
 */

/* ------------------------------------------------------------------ *
 * Typed error model (Functional Brief §2.8)
 * ------------------------------------------------------------------ */

export type CalcErrorKind =
  | "unit-mismatch"
  | "undefined"
  | "defined-later"
  | "cycle"
  | "parse"
  | "domain"
  | "singular"
  | "no-solution"
  | "spill";

export interface CalcError {
  kind: CalcErrorKind;
  /** What's wrong, in the app's voice. */
  message: string;
  /** How to fix it, in the app's voice. */
  fixHint?: string;
  /** Optional character span within the source, for inline underlines. */
  span?: { start: number; end: number };
}

/* ------------------------------------------------------------------ *
 * Single-expression result (the `evaluate()` convenience path)
 * ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ *
 * Result formatting (Functional Brief §2 — ResultFormat)
 * ------------------------------------------------------------------ */

export type Notation = "auto" | "decimal" | "sci" | "eng";
export type Radix = "dec" | "bin" | "oct" | "hex";
/** How a complex result is written: rectangular `a + b i` or polar `r ∠ θ`. */
export type ComplexForm = "rect" | "polar";

export interface ResultFormat {
  /** Fixed number of decimal places. Mutually exclusive with `sigfigs`. */
  decimals?: number;
  /** Significant figures. Mutually exclusive with `decimals`. */
  sigfigs?: number;
  notation?: Notation;
  radix?: Radix;
  /** Keep trailing zeros to fill `decimals` (e.g. `1.50` not `1.5`). */
  trailingZeros?: boolean;
  /** Group the integer part with thousands separators (`1,234`). */
  thousands?: boolean;
  /** |exponent| at/above which `auto` switches to scientific notation. */
  expThreshold?: number;
  /** Magnitudes at/below this are shown as exactly `0`. */
  zeroThreshold?: number;
  /** Render rationals as stacked fractions instead of decimals. */
  fraction?: boolean;
  /** Display form for complex results (rectangular `a + b i` vs polar `r ∠ θ`). */
  complex?: ComplexForm;
}

/** Default formatting when a region specifies none. */
export const DEFAULT_FORMAT: Required<
  Pick<ResultFormat, "notation" | "radix" | "complex">
> &
  ResultFormat = {
  notation: "auto",
  radix: "dec",
  sigfigs: 6,
  complex: "rect",
};

/* ------------------------------------------------------------------ *
 * Conditional formatting (Functional Brief §2 — CondRule)
 * ------------------------------------------------------------------ */

export type CondOp = ">" | ">=" | "=" | "!=" | "<" | "<=";

export interface CondStyle {
  color?: string;
  fill?: string;
  bold?: boolean;
  /** Short tag rendered beside the result, e.g. "OK" / "FAIL". */
  label?: string;
}

export interface CondRule {
  op: CondOp;
  value: number | string;
  style: CondStyle;
}

/* ------------------------------------------------------------------ *
 * Unit system (Functional Brief §2 — display-unit mapping)
 * ------------------------------------------------------------------ */

export type UnitSystemId = "SI" | "USCS" | "CGS" | "custom";

export interface UnitSystem {
  id: UnitSystemId;
  /**
   * Preferred display units, tried in order: a result is shown in the first one
   * whose dimensions match. Falls back to mathjs's own choice if none match.
   */
  preferred: string[];
}

/* ------------------------------------------------------------------ *
 * Engine input — a flat, reading-order list of regions
 *
 * The caller flattens the worksheet's JSONB tree (rows → cells → regions) into
 * reading order; the engine stays decoupled from that layout. A name must be
 * defined earlier in this list than it is used.
 * ------------------------------------------------------------------ */

export interface DisplayFlags {
  name: boolean;
  formula: boolean;
  substituted: boolean;
  result: boolean;
}

export interface RegionInput {
  id: string;
  /** Raw formula, e.g. `"N_Rd := 0.75 * A_s * f_ub"`. `:`/`:=` defines a name. */
  source: string;
  /** Target display unit for the result (overrides the system default). */
  unit?: string;
  format?: ResultFormat;
  conditional?: CondRule[];
  display?: Partial<DisplayFlags>;
  /** A disabled region is parsed but neither evaluated nor exported. */
  disabled?: boolean;
}

/* ------------------------------------------------------------------ *
 * Engine output
 * ------------------------------------------------------------------ */

export type RegionStatus = "current" | "stale" | "error";

export interface RegionResult {
  id: string;
  /** The name defined by this region, if it is a definition. */
  name: string | null;
  /** Raw evaluated value (number, Unit, matrix, …); `undefined` on error/stale. */
  value: unknown;
  /** Formatted result string carrying its unit. Empty when there is no result. */
  formatted: string;
  /** TeX of `name := formula` (or just the formula for an evaluation). */
  tex: string;
  /** TeX with leaf variables replaced by their values (show-steps middle line). */
  substitutedTex?: string;
  /** First matching conditional style, if any. */
  style?: CondStyle;
  error?: CalcError;
  status: RegionStatus;
}

export type SheetStatus = "current" | "stale" | "error";

export interface SheetResult {
  /** One result per input region, in reading order. */
  regions: RegionResult[];
  status: SheetStatus;
  errorCount: number;
}
