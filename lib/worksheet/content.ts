/**
 * Worksheet content tree — the `worksheets.content` JSONB shape (Functional
 * Brief §2). The document is a stack of reading-order **rows**; each row splits
 * into 1–3 **columns** (cells), and regions flow top-to-bottom within a cell,
 * optionally indented. This module is the single source of truth for that shape:
 * a Zod schema (tolerant on load, non-lossy on save) + inferred TS types + the
 * helpers the editor reducer and the engine flattener build on.
 *
 * M2 deferred this schema to "the editor milestone" (DECISIONS.md) so `/lib/calc`
 * could stay decoupled from the tree; the engine still consumes a flat
 * reading-order `RegionInput[]` produced by `./flatten`.
 */
import { z } from "zod";
import type { ProgramBranch, ProgramStatement } from "@/lib/calc";

/* ------------------------------------------------------------------ *
 * Calc-payload schemas (mirror the `/lib/calc` types — one source of truth).
 * ------------------------------------------------------------------ */

const notationSchema = z.enum(["auto", "decimal", "sci", "eng"]);
const radixSchema = z.enum(["dec", "bin", "oct", "hex"]);
const complexFormSchema = z.enum(["rect", "polar"]);

const resultFormatSchema = z.object({
  decimals: z.number().int().min(0).max(15).optional(),
  sigfigs: z.number().int().min(1).max(15).optional(),
  notation: notationSchema.optional(),
  radix: radixSchema.optional(),
  trailingZeros: z.boolean().optional(),
  thousands: z.boolean().optional(),
  expThreshold: z.number().optional(),
  zeroThreshold: z.number().optional(),
  fraction: z.boolean().optional(),
  complex: complexFormSchema.optional(),
});

const condOpSchema = z.enum([">", ">=", "=", "!=", "<", "<="]);
const condStyleSchema = z.object({
  color: z.string().optional(),
  fill: z.string().optional(),
  bold: z.boolean().optional(),
  label: z.string().optional(),
});
const condRuleSchema = z.object({
  op: condOpSchema,
  value: z.union([z.number(), z.string()]),
  style: condStyleSchema,
});

const displayFlagsSchema = z.object({
  name: z.boolean(),
  formula: z.boolean(),
  substituted: z.boolean(),
  result: z.boolean(),
});

/** Show-steps default: name, formula, and result on; substituted off. */
export const DEFAULT_DISPLAY: DisplayFlags = {
  name: true,
  formula: true,
  substituted: false,
  result: true,
};

/* ------------------------------------------------------------------ *
 * Region schemas — one per `type`, discriminated.
 *
 * `math` and `text` are fully edited here so their fields are typed exactly.
 * The render-only types (table/plot/image/control/area/include/solve) use
 * `.passthrough()` so a load→save round-trip never strips payload the editor
 * doesn't yet deeply edit.
 * ------------------------------------------------------------------ */

const regionBase = {
  id: z.string(),
  indent: z.number().int().min(0).max(8).default(0),
  border: z.boolean().optional(),
  tag: z.string().optional(),
  disabled: z.boolean().optional(),
};

/*
 * Symbolic result cache (Phase-2 R0 export — cache-in-content strategy).
 *
 * Symbolic (SymPy) results are computed by the async Pyodide worker, which the
 * Node PDF-export path cannot drive. Rather than run Pyodide server-side, the
 * worker-computed result is cached HERE in the content tree so the deterministic
 * Node export reads it directly and the PDF matches the app. Versioned (`v`) so a
 * future shape change invalidates old entries cleanly, and `hash`-keyed to the
 * region's input source: a mismatch means the formula changed and the cache is
 * stale. The producer (worker compute → write this cache) is wired in the Math
 * symbolic-evaluate (→) session; this slice is the export-read consumer only.
 */
const symbolicCacheSchema = z.object({
  v: z.literal(1),
  /** Hash of the normalized input source the result was computed from. */
  hash: z.string(),
  /** Rendered result as TeX (e.g. "x + 1"). */
  tex: z.string(),
  /** Plain-text result value, when meaningful. */
  value: z.string().optional(),
  /** Result unit label, when the value carries one. */
  unit: z.string().optional(),
  /** ISO timestamp the result was computed (provenance). */
  computedAt: z.string(),
});

const mathRegionSchema = z.object({
  ...regionBase,
  type: z.literal("math"),
  source: z.string().default(""),
  unit: z.string().optional(),
  format: resultFormatSchema.optional(),
  conditional: z.array(condRuleSchema).optional(),
  display: displayFlagsSchema.partial().optional(),
  /** Per-region display unit-system override — typed-but-inert seam (uses the
   *  worksheet system today; round-tripped for the future per-region picker). */
  unitSystem: z.enum(["si", "uscs", "cgs", "custom"]).optional(),
  /** Cached worker-computed symbolic result, read by server-side export. */
  cache: symbolicCacheSchema.optional(),
});

const textRegionSchema = z.object({
  ...regionBase,
  type: z.literal("text"),
  text: z.string().default(""),
  /** 1–3 → rendered as a heading; omitted → body copy. */
  heading: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  /** Small tracked uppercase label above a heading (e.g. "2 · Concrete cone"). */
  eyebrow: z.string().optional(),
});

/** Render-only region: known chrome fields + an open payload preserved verbatim. */
const renderOnlyRegion = <T extends string>(type: T) =>
  z.object({ ...regionBase, type: z.literal(type) }).passthrough();

/*
 * Table / spreadsheet region — fully typed. Cells hold raw sources (`rows`);
 * values are always derived by the engine, never persisted. `sort`/`filter` are
 * typed-but-inert seams for the deferred follow-up. Field names deliberately
 * avoid the old render-only `{header, cells, columnUnits}` payload, and
 * `columns`/`rows` default to `[]`, so a legacy table still validates (its old
 * keys pass through) instead of failing the union and wiping the document.
 */
const cellAlignSchema = z.enum(["left", "center", "right"]);
const tableColumnSchema = z.object({
  key: z.string(),
  label: z.string().default(""),
  unit: z.string().optional(),
  align: cellAlignSchema.optional(),
  width: z.number().optional(),
  format: resultFormatSchema.optional(),
  conditional: z.array(condRuleSchema).optional(),
});
const tableSortSchema = z.object({ key: z.string(), dir: z.enum(["asc", "desc"]) });
const tableFilterSchema = z.object({
  key: z.string(),
  op: condOpSchema,
  value: z.union([z.number(), z.string()]),
});
/*
 * Per-cell formatting overlay (Phase-2 refinement). Sparse map keyed `"r,c"`
 * (0-based DATA coords matching `rows[r][c]`). Only `format` reaches the engine
 * (it overrides the column number format when producing the cell's display
 * string); align/bold/italic/color/fill/border are pure presentation read at
 * render time. Optional + sparse so a table with no cell formatting round-trips
 * byte-identical.
 */
const tableCellBorderSchema = z.object({
  top: z.boolean().optional(),
  right: z.boolean().optional(),
  bottom: z.boolean().optional(),
  left: z.boolean().optional(),
});
const tableCellStyleSchema = z.object({
  format: resultFormatSchema.optional(),
  align: cellAlignSchema.optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  color: z.string().optional(),
  fill: z.string().optional(),
  border: tableCellBorderSchema.optional(),
});
/** Whole-table style preset — chrome for read/print mode (default = today's look). */
const tableStyleSchema = z.enum(["default", "plain", "grid", "bordered", "minimal"]);
/** A merged rectangle anchored at top-left `(r,c)`; covered cells keep their data. */
const tableMergeSchema = z.object({
  r: z.number().int().min(0),
  c: z.number().int().min(0),
  rowSpan: z.number().int().min(1),
  colSpan: z.number().int().min(1),
});
const tableRegionSchema = z
  .object({
    ...regionBase,
    type: z.literal("table"),
    name: z.string().optional(),
    eyebrow: z.string().optional(),
    columns: z.array(tableColumnSchema).default([]),
    rows: z.array(z.array(z.string())).default([]),
    ranges: z.record(z.string()).optional(),
    sort: tableSortSchema.optional(),
    filter: tableFilterSchema.optional(),
    /** Per-cell formatting overlay, keyed `"r,c"`. */
    cellStyles: z.record(tableCellStyleSchema).optional(),
    /** Whole-table style preset (read/print chrome). */
    tableStyle: tableStyleSchema.optional(),
    /** Display-only merged rectangles; data/formulas are unaffected. */
    merges: z.array(tableMergeSchema).optional(),
  })
  .passthrough();
/*
 * Plot region — fully typed (Functional Brief §6.4, mockup `plot-region.html`).
 *
 * A plot binds traces to expressions / ranges / table columns; the pure engine
 * (`lib/calc/plot`) samples them and the view renders. XY (line/scatter/marker/
 * column/bar/stem/area) + polar render this pass; `contour`/`surface` are typed
 * and fully config-round-tripped (z-expression, x/y ranges, grid resolution,
 * display options) but render a 'configure' placeholder until the 2D renderer
 * ships — so that milestone needs no schema or picker change. `.passthrough()`
 * keeps any unknown payload non-lossy on a load→save round-trip; the field
 * defaults mean a legacy render-only plot (`{type:"plot", title?}`) still
 * validates with sensible values, so no dedicated migration is required.
 */
const plotKindSchema = z.enum(["xy", "polar", "contour", "surface"]);
const traceStyleSchema = z.enum([
  "line",
  "scatter",
  "line-marker",
  "column",
  "bar",
  "stem",
  "area",
  "error",
  "waterfall",
  "box",
]);
const plotAxisSchema = z.object({
  label: z.string().optional(),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  log: z.boolean().optional(),
});
const plotTraceSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  /** y expression sampled over `xVar` (sweep) or a vector expression (data). */
  expr: z.string().default(""),
  style: traceStyleSchema.default("line"),
  color: z.string().optional(),
  dash: z.boolean().optional(),
  hidden: z.boolean().optional(),
});
/** z = f(x, y) surface, for contour/3D (typed-but-inert until the renderer ships). */
const plotZSchema = z.object({
  expr: z.string().default(""),
  label: z.string().optional(),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});
/** Sampling resolution for contour/3D grids. */
const plotGridSchema = z.object({
  x: z.number().int().min(2).max(200).default(24),
  y: z.number().int().min(2).max(200).default(24),
});
/** Display options for contour/3D (round-tripped now; consumed by the future renderer). */
const surfaceOptionsSchema = z.object({
  levels: z.number().int().min(1).max(64).optional(),
  filled: z.boolean().optional(),
  colormap: z.string().optional(),
  wireframe: z.boolean().optional(),
  showScale: z.boolean().optional(),
});
const plotRegionSchema = z
  .object({
    ...regionBase,
    type: z.literal("plot"),
    kind: plotKindSchema.default("xy"),
    title: z.string().optional(),
    /** Independent variable swept across the x-axis (plot-by-formula). */
    xVar: z.string().default("x"),
    /** Second independent variable for contour/surface (z = f(x, y)). */
    yVar: z.string().default("y"),
    /** Optional explicit x data expression (a vector) for data-bound traces. */
    xData: z.string().optional(),
    x: plotAxisSchema.default({}),
    y: plotAxisSchema.default({}),
    z: plotZSchema.optional(),
    grid: plotGridSchema.optional(),
    surface: surfaceOptionsSchema.optional(),
    traces: z.array(plotTraceSchema).default([]),
    /** Sweep sample count (plot-by-formula); engine clamps to 2–400. */
    samples: z.number().int().min(2).max(400).optional(),
    legend: z.boolean().default(true),
    frame: z.boolean().optional(),
  })
  .passthrough();
const imageRegionSchema = renderOnlyRegion("image");
/*
 * Input-control region — typed but `.passthrough()` (non-lossy round-trip, like
 * table/plot). Each control writes its bound variable into the engine scope as a
 * definition (`bind := value`) via `./flatten`, so moving it drives live recompute
 * (Functional Brief / Mockup §6.7). `valueType` decides how `value` is serialized
 * into that definition. `bind` defaults to "" so an unconfigured control emits no
 * engine input (and shows an empty-state hint) until it's named in the inspector.
 */
const controlKindSchema = z.enum([
  "slider",
  "dropdown",
  "combo",
  "radio",
  "checkbox",
  "button",
  "textbox",
  "listbox",
]);
const controlValueTypeSchema = z.enum(["text", "number", "boolean", "expr"]);
const controlOptionSchema = z.object({ value: z.string(), label: z.string().optional() });
const controlRegionSchema = z
  .object({
    ...regionBase,
    type: z.literal("control"),
    kind: controlKindSchema.default("slider"),
    /** Variable name this control defines in worksheet scope. */
    bind: z.string().default(""),
    /** Human caption shown beside the widget. */
    label: z.string().optional(),
    /** Current control value — serialized into `bind := value` per `valueType`. */
    value: z.union([z.string(), z.number(), z.boolean()]).optional(),
    valueType: controlValueTypeSchema.default("number"),
    /** Unit appended to a numeric value (e.g. `m`, `kN`). */
    unit: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    invert: z.boolean().optional(),
    /** Choices for dropdown / combo / radio / listbox. */
    options: z.array(controlOptionSchema).optional(),
  })
  .passthrough();
const areaRegionSchema = z
  .object({
    ...regionBase,
    type: z.literal("area"),
    title: z.string().default("Area"),
    collapsed: z.boolean().default(false),
    regions: z.array(z.lazy((): z.ZodTypeAny => regionSchema)).default([]),
  })
  .passthrough();
const includeRegionSchema = renderOnlyRegion("include");
/*
 * Solve-block region — fully typed (Functional Brief §6.5, mockup
 * `solve-block.html`). Guess values define the unknowns, constraints are
 * equations/inequalities in math source, and the solver call (find / minimize /
 * maximize / minerr) builds a residual/objective and binds the solution back to
 * the unknown names (consumed by downstream regions + plots via the same
 * scope-bridge tables use). `odesolve`/`pdesolve`/`numol` are selectable and
 * round-trip their full `ode` config, but render a 'ships next' placeholder
 * until the integrator lands. `.passthrough()` keeps any unknown payload
 * non-lossy; the field defaults mean a legacy render-only `{type:"solve"}` still
 * validates, so no migration is needed.
 */
const solveAlgoSchema = z.enum([
  "find",
  "minimize",
  "maximize",
  "minerr",
  "odesolve",
  "pdesolve",
  "numol",
]);
const solveGuessSchema = z.object({
  var: z.string().default(""),
  /** Initial-guess magnitude / expression (e.g. "10", "L/2"). */
  value: z.string().default(""),
  /** Optional unit appended to the guess (e.g. "mm", "deg"). */
  unit: z.string().optional(),
});
/** Typed-but-inert ODE/PDE config (round-trips now; the integrator ships next). */
const odeConfigSchema = z.object({
  system: z.array(z.string()).default([]),
  indepVar: z.string().default("x"),
  range: z.object({ min: z.number().optional(), max: z.number().optional() }).default({}),
  conditions: z.array(z.string()).default([]),
  step: z.number().optional(),
  mesh: z.number().int().optional(),
});
const solveRegionSchema = z
  .object({
    ...regionBase,
    type: z.literal("solve"),
    /** Chip label shown beside "Solve block" (e.g. "plate thickness"). */
    name: z.string().optional(),
    algorithm: solveAlgoSchema.default("find"),
    /** Unknowns + their initial guesses (unit-bearing sources, e.g. "10 mm"). */
    guesses: z.array(solveGuessSchema).default([]),
    /** Equations / inequalities in math source (`=`, `<=`, `>=`, `<`, `>`). */
    constraints: z.array(z.string()).default([]),
    /** Expression to optimize (minimize / maximize). */
    objective: z.string().optional(),
    /** Constraint tolerance; engine default applies when unset. */
    ctol: z.number().optional(),
    /** Residual / objective scaling divisor. */
    scaling: z.number().optional(),
    maxIter: z.number().int().optional(),
    /** On non-convergence: surface `no-solution` (default) or bind the last iterate. */
    onNonConverge: z.enum(["error", "last"]).optional(),
    ode: odeConfigSchema.optional(),
  })
  .passthrough();

/*
 * Program-block region — fully typed (Functional Brief §2 "inline programs /
 * natural-math logic", Coverage Matrix B8). A program is the RHS of a Mathcad
 * definition: `name(params) := body` defines a callable user function; `name :=
 * body` (no params) defines a value. The body is a structured statement tree —
 * local assignment, if / else-if / otherwise, for, while, return — so the read
 * view renders the Mathcad 2D layout directly and the pure engine
 * (`lib/calc/program`) evaluates the structure (no bespoke text parser). Each
 * statement's expressions are math source, evaluated by the shared engine, so
 * units flow through control flow. Folded into worksheet scope by `./flatten`
 * (value programs as `name := value`, function programs via a synthetic
 * function-assignment) so the UNMODIFIED engine resolves references downstream.
 * `.passthrough()` keeps any unknown payload non-lossy; the field defaults mean a
 * legacy render-only `{type:"program"}` still validates, so no migration is needed.
 */
const programStatementSchema: z.ZodType<ProgramStatement> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("assign"), target: z.string().default(""), expr: z.string().default("") }),
    z.object({ kind: z.literal("return"), expr: z.string().default("") }),
    z.object({
      kind: z.literal("if"),
      branches: z
        .array(z.object({ cond: z.string().default(""), body: z.array(programStatementSchema).default([]) }))
        .default([]),
      otherwise: z.array(programStatementSchema).optional(),
    }),
    z.object({
      kind: z.literal("for"),
      var: z.string().default("i"),
      from: z.string().default("1"),
      to: z.string().default("1"),
      step: z.string().optional(),
      body: z.array(programStatementSchema).default([]),
    }),
    z.object({
      kind: z.literal("while"),
      cond: z.string().default(""),
      body: z.array(programStatementSchema).default([]),
    }),
  ]) as unknown as z.ZodType<ProgramStatement>,
);
const programRegionSchema = z
  .object({
    ...regionBase,
    type: z.literal("program"),
    /** Defined name (function or value), e.g. "factorial". */
    name: z.string().optional(),
    /** Parameter names — non-empty ⇒ a callable function. */
    params: z.array(z.string()).default([]),
    /** The statement body, evaluated top to bottom. */
    body: z.array(programStatementSchema).default([]),
    /** Display unit for a no-parameter (value) program's result. */
    unit: z.string().optional(),
  })
  .passthrough();

export const regionSchema: z.ZodType<Region> = z.discriminatedUnion("type", [
  mathRegionSchema,
  textRegionSchema,
  tableRegionSchema,
  plotRegionSchema,
  imageRegionSchema,
  controlRegionSchema,
  areaRegionSchema,
  includeRegionSchema,
  solveRegionSchema,
  programRegionSchema,
]) as unknown as z.ZodType<Region>;

const cellSchema = z.object({
  regions: z.array(regionSchema).default([]),
});

const rowSchema = z.object({
  id: z.string(),
  columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  /** Column width ratios summing to ~1; omitted → equal columns. */
  split: z.array(z.number()).optional(),
  cells: z.array(cellSchema).default([]),
});

/*
 * Worksheet-level custom units (Functional Brief §2 — user-defined units & unit
 * systems). `defs` are value-unit definitions (`kip := 4.4482216 kN`) registered
 * on the engine before evaluation; `preferred` is the display-unit list the
 * status-bar "custom" system uses. Stored in content JSONB (no new table); the
 * one source of truth shared by the status-bar selector and the worksheet-settings
 * Units tab.
 */
const userUnitDefSchema = z.object({
  name: z.string().default(""),
  definition: z.string().default(""),
});
const worksheetUnitsSchema = z.object({
  defs: z.array(userUnitDefSchema).default([]),
  preferred: z.array(z.string()).default([]),
});

const contentSchema = z.object({
  version: z.literal(1).default(1),
  rows: z.array(rowSchema).default([]),
  /** Worksheet-defined custom units + preferred display list. */
  units: worksheetUnitsSchema.optional(),
});

/* ------------------------------------------------------------------ *
 * Inferred types
 * ------------------------------------------------------------------ */

export type Notation = z.infer<typeof notationSchema>;
export type Radix = z.infer<typeof radixSchema>;
export type ComplexForm = z.infer<typeof complexFormSchema>;
export type ResultFormat = z.infer<typeof resultFormatSchema>;
export type CondRule = z.infer<typeof condRuleSchema>;
export type CondOp = z.infer<typeof condOpSchema>;
export type DisplayFlags = z.infer<typeof displayFlagsSchema>;
export type CellAlign = z.infer<typeof cellAlignSchema>;
export type TableColumn = z.infer<typeof tableColumnSchema>;
export type TableSort = z.infer<typeof tableSortSchema>;
export type TableFilter = z.infer<typeof tableFilterSchema>;
export type TableCellBorder = z.infer<typeof tableCellBorderSchema>;
export type TableCellStyle = z.infer<typeof tableCellStyleSchema>;
export type TableStyle = z.infer<typeof tableStyleSchema>;
export type TableMerge = z.infer<typeof tableMergeSchema>;
export type PlotKind = z.infer<typeof plotKindSchema>;
export type TraceStyle = z.infer<typeof traceStyleSchema>;
export type PlotAxis = z.infer<typeof plotAxisSchema>;
export type PlotTrace = z.infer<typeof plotTraceSchema>;
export type PlotZ = z.infer<typeof plotZSchema>;
export type PlotGrid = z.infer<typeof plotGridSchema>;
export type SurfaceOptions = z.infer<typeof surfaceOptionsSchema>;
export type ControlKind = z.infer<typeof controlKindSchema>;
export type ControlValueType = z.infer<typeof controlValueTypeSchema>;
export type ControlOption = z.infer<typeof controlOptionSchema>;
export type SolveAlgorithm = z.infer<typeof solveAlgoSchema>;
export type SolveGuess = z.infer<typeof solveGuessSchema>;
export type OdeConfig = z.infer<typeof odeConfigSchema>;
export type SymbolicCache = z.infer<typeof symbolicCacheSchema>;
export type UserUnitDef = z.infer<typeof userUnitDefSchema>;
export type WorksheetUnits = z.infer<typeof worksheetUnitsSchema>;

export interface RegionBase {
  id: string;
  indent: number;
  border?: boolean;
  tag?: string;
  disabled?: boolean;
}

export interface MathRegion extends RegionBase {
  type: "math";
  source: string;
  unit?: string;
  format?: ResultFormat;
  conditional?: CondRule[];
  display?: Partial<DisplayFlags>;
  /** Per-region display unit-system override — typed-but-inert seam. */
  unitSystem?: "si" | "uscs" | "cgs" | "custom";
  /** Cached worker-computed symbolic result, read by server-side export. */
  cache?: SymbolicCache;
}

export interface TextRegion extends RegionBase {
  type: "text";
  text: string;
  heading?: 1 | 2 | 3;
  eyebrow?: string;
}

export interface AreaRegion extends RegionBase {
  type: "area";
  title: string;
  collapsed: boolean;
  regions: Region[];
  [key: string]: unknown;
}

export interface TableRegion extends RegionBase {
  type: "table";
  /** Named range for the whole grid; exported to the worksheet scope. */
  name?: string;
  /** Present-mode title (defaults to `name`). */
  eyebrow?: string;
  columns: TableColumn[];
  /** Row-major raw cell sources; `"=…"` is a formula, else a literal. */
  rows: string[][];
  /** Named A1 sub-ranges, e.g. `{ anchor_db: "A2:C5" }`. */
  ranges?: Record<string, string>;
  /** Typed-but-inert seams (sort/filter ship in the follow-up). */
  sort?: TableSort;
  filter?: TableFilter;
  /** Per-cell formatting overlay, keyed `"r,c"` (0-based data coords). */
  cellStyles?: Record<string, TableCellStyle>;
  /** Whole-table style preset (read/print chrome). */
  tableStyle?: TableStyle;
  /** Display-only merged rectangles; data/formulas are unaffected. */
  merges?: TableMerge[];
  [key: string]: unknown;
}

export interface PlotRegion extends RegionBase {
  type: "plot";
  /** xy + polar render this pass; contour/surface are typed config placeholders. */
  kind: PlotKind;
  title?: string;
  /** Independent variable swept across the x-axis (plot-by-formula). */
  xVar: string;
  /** Second independent variable for contour/surface (z = f(x, y)). */
  yVar: string;
  /** Optional explicit x data expression (a vector) for data-bound traces. */
  xData?: string;
  x: PlotAxis;
  y: PlotAxis;
  z?: PlotZ;
  grid?: PlotGrid;
  surface?: SurfaceOptions;
  traces: PlotTrace[];
  samples?: number;
  legend: boolean;
  frame?: boolean;
  [key: string]: unknown;
}

/** Input control that defines a bound variable in scope (Mockup §6.7). */
export interface ControlRegion extends RegionBase {
  type: "control";
  kind: ControlKind;
  /** Variable name this control defines in worksheet scope. */
  bind: string;
  label?: string;
  /** Current value — serialized into `bind := value` per `valueType`. */
  value?: string | number | boolean;
  valueType: ControlValueType;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  invert?: boolean;
  options?: ControlOption[];
  [key: string]: unknown;
}

/** Solve block: guesses + constraints + a solver call (Functional Brief §6.5). */
export interface SolveRegion extends RegionBase {
  type: "solve";
  /** Chip label beside "Solve block". */
  name?: string;
  algorithm: SolveAlgorithm;
  /** Unknowns + their initial guesses (unit-bearing sources). */
  guesses: SolveGuess[];
  /** Equations / inequalities in math source. */
  constraints: string[];
  /** Expression to optimize (minimize / maximize). */
  objective?: string;
  ctol?: number;
  scaling?: number;
  maxIter?: number;
  onNonConverge?: "error" | "last";
  /** Round-tripped config for the deferred odesolve / pdesolve / numol. */
  ode?: OdeConfig;
  [key: string]: unknown;
}

/** Program block: a user-defined function or value with control flow (§2 · B8). */
export interface ProgramRegion extends RegionBase {
  type: "program";
  /** Defined name (function or value), e.g. "factorial". */
  name?: string;
  /** Parameter names — non-empty ⇒ a callable function. */
  params: string[];
  /** The statement body, evaluated top to bottom. */
  body: ProgramStatement[];
  /** Display unit for a no-parameter (value) program's result. */
  unit?: string;
  [key: string]: unknown;
}

/** Re-exported from the engine so the editor/content layer shares one shape. */
export type { ProgramStatement, ProgramBranch };

/** Render-only payloads keep an open shape so nothing is lost on round-trip. */
export interface RenderOnlyRegion extends RegionBase {
  type: "image" | "include";
  [key: string]: unknown;
}

export type Region =
  | MathRegion
  | TextRegion
  | TableRegion
  | PlotRegion
  | AreaRegion
  | ControlRegion
  | SolveRegion
  | ProgramRegion
  | RenderOnlyRegion;
export type RegionType = Region["type"];

export interface Cell {
  regions: Region[];
}

export interface Row {
  id: string;
  columns: 1 | 2 | 3;
  split?: number[];
  cells: Cell[];
}

export interface WorksheetContent {
  version: 1;
  rows: Row[];
  /** Worksheet-defined custom units + preferred display list. */
  units?: WorksheetUnits;
}

/* ------------------------------------------------------------------ *
 * Construction & parsing
 * ------------------------------------------------------------------ */

/** A stable unique id for a new row / cell / region. */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

/** A fresh empty document. */
export function emptyContent(): WorksheetContent {
  return { version: 1, rows: [] };
}

export const EMPTY_CONTENT: WorksheetContent = emptyContent();

/** A blank cell. */
export function emptyCell(): Cell {
  return { regions: [] };
}

/** A single-column row holding `regions` (the canonical layout for spanning). */
export function singleColumnRow(regions: Region[] = []): Row {
  return { id: newId(), columns: 1, cells: [{ regions }] };
}

/** A new region of `type` with sensible defaults. */
export function newRegion(type: RegionType): Region {
  const base = { id: newId(), indent: 0 };
  switch (type) {
    case "math":
      return { ...base, type: "math", source: "", display: { ...DEFAULT_DISPLAY } };
    case "text":
      return { ...base, type: "text", text: "" };
    case "area":
      return { ...base, type: "area", title: "Area", collapsed: false, regions: [] };
    case "table":
      return {
        ...base,
        type: "table",
        columns: [
          { key: newId(), label: "Column A" },
          { key: newId(), label: "Column B" },
        ],
        rows: [
          ["", ""],
          ["", ""],
          ["", ""],
        ],
      };
    case "plot":
      // Empty traces ⇒ the region opens on its empty state ("Pick variables to plot").
      return {
        ...base,
        type: "plot",
        kind: "xy",
        xVar: "x",
        yVar: "y",
        x: {},
        y: {},
        traces: [],
        samples: 80,
        legend: true,
      };
    case "control":
      // A slider bound to nothing yet — the inspector names it; `bind:""` keeps
      // it out of engine scope (and shows an empty-state hint) until configured.
      return {
        ...base,
        type: "control",
        kind: "slider",
        bind: "",
        valueType: "number",
        value: 5,
        min: 0,
        max: 10,
        step: 1,
      };
    case "solve":
      // A find-block seeded with one unknown + one constraint, so it opens on a
      // usable example the inspector refines.
      return {
        ...base,
        type: "solve",
        algorithm: "find",
        guesses: [{ var: "x", value: "1" }],
        constraints: ["x^2 = 9"],
      };
    case "program":
      // A factorial seed — a counted loop with a conditional guard — so the block
      // opens on a runnable example that defines a callable function.
      return {
        ...base,
        type: "program",
        name: "factorial",
        params: ["n"],
        body: [
          { kind: "assign", target: "result", expr: "1" },
          {
            kind: "if",
            branches: [{ cond: "n > 1", body: [
              { kind: "for", var: "i", from: "2", to: "n", body: [
                { kind: "assign", target: "result", expr: "result * i" },
              ] },
            ] }],
          },
          { kind: "return", expr: "result" },
        ],
      };
    default:
      return { ...base, type } as RenderOnlyRegion;
  }
}

/**
 * Repair a row so `cells.length === columns` without ever dropping a region:
 * widen `columns` to fit overflow cells, then pad short rows with empty cells.
 */
function normalizeRow(row: Row): Row {
  const cells = row.cells.length > 0 ? [...row.cells] : [emptyCell()];
  const columns = Math.min(3, Math.max(row.columns, cells.length)) as 1 | 2 | 3;
  while (cells.length < columns) cells.push(emptyCell());
  if (cells.length > columns) {
    // Fold any overflow regions into the last kept cell (never lose content).
    const overflow = cells.splice(columns);
    const last = cells[columns - 1];
    last.regions = [...last.regions, ...overflow.flatMap((c) => c.regions)];
  }
  return { ...row, columns, cells };
}

/**
 * Migrate any legacy render-only table payload (`{header, cells, columnUnits,
 * rows: <count>}`) to the typed shape by DERIVING `columns`/`rows`, while keeping
 * the old keys via passthrough. Crucially this overwrites a numeric `rows` count
 * with the string-grid `rows`, so the typed schema validates instead of failing
 * the whole document. Defensive on untrusted JSON; typed tables pass through.
 */
function migrateLegacyTables(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const root = json as Record<string, unknown>;
  if (!Array.isArray(root.rows)) return json;
  return {
    ...root,
    rows: root.rows.map((row) => {
      if (!row || typeof row !== "object") return row;
      const rw = row as Record<string, unknown>;
      if (!Array.isArray(rw.cells)) return row;
      return {
        ...rw,
        cells: rw.cells.map((cell) => {
          if (!cell || typeof cell !== "object") return cell;
          const cl = cell as Record<string, unknown>;
          if (!Array.isArray(cl.regions)) return cell;
          return { ...cl, regions: cl.regions.map(migrateRegionTable) };
        }),
      };
    }),
  };
}

function migrateRegionTable(region: unknown): unknown {
  if (!region || typeof region !== "object") return region;
  const r = region as Record<string, unknown>;
  if (r.type === "area" && Array.isArray(r.regions)) {
    return { ...r, regions: r.regions.map(migrateRegionTable) };
  }
  if (r.type !== "table") return region;
  // Already typed: `rows` is an array of arrays (or empty).
  if (Array.isArray(r.rows) && (r.rows.length === 0 || Array.isArray(r.rows[0]))) return region;
  const header = Array.isArray(r.header) ? r.header : [];
  const units = Array.isArray(r.columnUnits) ? r.columnUnits : [];
  const legacyCells = Array.isArray(r.cells) ? (r.cells as unknown[]) : [];
  const width = Math.max(header.length, units.length, 0, ...legacyCells.map((row) => (Array.isArray(row) ? row.length : 0)));
  const columns = Array.from({ length: width }, (_, i) => ({
    key: `c${i}`,
    label: header[i] != null ? String(header[i]) : "",
    ...(units[i] != null && String(units[i]) ? { unit: String(units[i]) } : {}),
  }));
  const rows = legacyCells.map((row) => (Array.isArray(row) ? row.map((c) => String(c)) : []));
  return { ...r, columns: Array.isArray(r.columns) ? r.columns : columns, rows };
}

/**
 * Parse untrusted JSON (from the DB) into a valid content tree. Never throws
 * into the UI — on any failure it falls back to an empty document so the editor
 * still mounts. Layout invariants (`cells.length === columns`) are repaired.
 */
export function parseContent(json: unknown): WorksheetContent {
  const result = contentSchema.safeParse(migrateLegacyTables(json));
  if (!result.success) return emptyContent();
  const data = result.data as WorksheetContent;
  return { version: 1, rows: data.rows.map(normalizeRow), units: data.units };
}

/** Validate a content tree before persisting; returns the parsed value or null. */
export function validateContent(json: unknown): WorksheetContent | null {
  const result = contentSchema.safeParse(migrateLegacyTables(json));
  if (!result.success) return null;
  const data = result.data as WorksheetContent;
  return { version: 1, rows: data.rows.map(normalizeRow), units: data.units };
}

export { contentSchema };
