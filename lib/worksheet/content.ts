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

/* ------------------------------------------------------------------ *
 * Calc-payload schemas (mirror the `/lib/calc` types — one source of truth).
 * ------------------------------------------------------------------ */

const notationSchema = z.enum(["auto", "decimal", "sci", "eng"]);
const radixSchema = z.enum(["dec", "bin", "oct", "hex"]);

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

const mathRegionSchema = z.object({
  ...regionBase,
  type: z.literal("math"),
  source: z.string().default(""),
  unit: z.string().optional(),
  format: resultFormatSchema.optional(),
  conditional: z.array(condRuleSchema).optional(),
  display: displayFlagsSchema.partial().optional(),
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
const solveRegionSchema = renderOnlyRegion("solve");

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

const contentSchema = z.object({
  version: z.literal(1).default(1),
  rows: z.array(rowSchema).default([]),
});

/* ------------------------------------------------------------------ *
 * Inferred types
 * ------------------------------------------------------------------ */

export type Notation = z.infer<typeof notationSchema>;
export type Radix = z.infer<typeof radixSchema>;
export type ResultFormat = z.infer<typeof resultFormatSchema>;
export type CondRule = z.infer<typeof condRuleSchema>;
export type CondOp = z.infer<typeof condOpSchema>;
export type DisplayFlags = z.infer<typeof displayFlagsSchema>;
export type CellAlign = z.infer<typeof cellAlignSchema>;
export type TableColumn = z.infer<typeof tableColumnSchema>;
export type TableSort = z.infer<typeof tableSortSchema>;
export type TableFilter = z.infer<typeof tableFilterSchema>;
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

/** Render-only payloads keep an open shape so nothing is lost on round-trip. */
export interface RenderOnlyRegion extends RegionBase {
  type: "image" | "include" | "solve";
  [key: string]: unknown;
}

export type Region =
  | MathRegion
  | TextRegion
  | TableRegion
  | PlotRegion
  | AreaRegion
  | ControlRegion
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
  return { version: 1, rows: data.rows.map(normalizeRow) };
}

/** Validate a content tree before persisting; returns the parsed value or null. */
export function validateContent(json: unknown): WorksheetContent | null {
  const result = contentSchema.safeParse(migrateLegacyTables(json));
  if (!result.success) return null;
  const data = result.data as WorksheetContent;
  return { version: 1, rows: data.rows.map(normalizeRow) };
}

export { contentSchema };
