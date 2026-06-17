/**
 * Reference library — catalog types (Functional Brief §3.6 / 4.6).
 *
 * A shipped, in-code JSON catalog of functions, units, and constants browsed in
 * the Reference library. There is no database: the data lives here and is
 * searchable + categorized. The detail pane never hard-codes a result — it runs
 * the calc engine over a {@link WorkedExample} so the rendered value can't drift.
 *
 * A deliberate split runs through these types: **display strings** (`name`,
 * `value`, `unit`, `base` — may carry unicode like `g₀` or `× 10⁻¹¹`) are for
 * the eye only, while **engine strings** (`insert` and everything inside a
 * `WorkedExample`) must parse in mathjs. The example never reuses a prettified
 * display string; that separation is what keeps worked examples honest.
 */

export type RefKind = "function" | "unit" | "constant";
export type RefGroup = "FUNCTIONS" | "UNITS" | "CONSTANTS";

export interface ReferenceBase {
  kind: RefKind;
  /** Unique across the whole catalog. */
  id: string;
  /** Subcategory id (e.g. `"lookup"`), keyed into the {@link ReferenceTree}. */
  cat: string;
  /** Display name; may carry unicode (`g₀`, `°C`). */
  name: string;
  /** Signature/label shown in the list and copied by "Copy signature". */
  sig: string;
  /** Subcategory label, shown as a chip (e.g. `"Lookup & data"`). */
  tag: string;
  desc: string;
  /** Ids or names of related items; the resolver tolerates either. */
  related: string[];
  /** Live worked example, run through the engine in the detail pane. */
  example?: WorkedExample;
  /** Exact source inserted at the caret (engine-valid). */
  insert: string;
}

export interface FunctionRef extends ReferenceBase {
  kind: "function";
  /** Rows of `[name, type, description]` for the parameters table. */
  params: Array<[name: string, type: string, desc: string]>;
  /** "Units behaviour" prose. */
  units: string;
}

export interface UnitRef extends ReferenceBase {
  kind: "unit";
  /** Base-SI conversion, display string (e.g. `"0.001 m"`). */
  base: string;
  /** Dimension, display string (e.g. `"M·L·T⁻²"`). */
  dim: string;
  /** Optional behaviour prose. */
  units?: string;
}

export interface ConstantRef extends ReferenceBase {
  kind: "constant";
  /** Display value, may carry unicode (`6.674 × 10⁻¹¹`). */
  value: string;
  /** Display unit (`m/s²`). */
  unit: string;
  /** Provenance (`CODATA 2018`, `SI (defined)`). */
  source: string;
}

export type ReferenceItem = FunctionRef | UnitRef | ConstantRef;

export interface ReferenceCategory {
  id: string;
  label: string;
}

export type ReferenceTree = Record<RefGroup, ReferenceCategory[]>;

/* ------------------------------------------------------------------ *
 * Worked example — an engine-run, anti-drift spec
 * ------------------------------------------------------------------ */

export interface ExampleTable {
  headers: string[];
  rows: string[][];
  /** Row indices to highlight (the rows the example reads from). */
  highlightRows?: number[];
}

export interface WorkedExample {
  /** Plain-language framing shown above the math (muted line). */
  caption: string;
  /** Optional reference-data table rendered above the math. */
  table?: ExampleTable;
  /**
   * Engine-evaluable region sources in reading order. The LAST entry is the
   * highlighted result (author it as a named definition, e.g. `"a := sqrt(…)"`),
   * earlier entries are givens. Each must parse in mathjs.
   */
  regions: string[];
  /** Optional per-region target display unit, index-aligned to `regions`. */
  units?: (string | undefined)[];
  /** Result-line formatting for the highlighted region. */
  format?: { decimals?: number; sigfigs?: number; trailingZeros?: boolean };
  /** Highlight chip tone: `accent` (a value) or `pass` (a check). */
  tone?: "accent" | "pass";
}
