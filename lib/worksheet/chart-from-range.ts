/**
 * Chart-from-range bridge (pure). Turns a rectangular cell selection in a table
 * into the pieces needed to render it as a chart: a set of named A1 sub-ranges to
 * add to the table's `ranges` (each exported to the worksheet scope as a vector by
 * {@link evaluateTable}) and a data-mode {@link PlotRegion} whose `xData` / trace
 * `expr` reference those range keys by name.
 *
 * This is the whole feature: a plot is a read-only consumer of worksheet names, so
 * binding it to a table range needs no engine change — the unmodified pipeline
 * (`settleTables` → `evaluatePlotsWith` → `evaluatePlot` data mode) zips the X
 * vector with each trace vector and converts units exactly like any other result.
 * It lives in the tree layer (not `lib/calc`), because it builds content-tree
 * objects the engine deliberately never imports; it is pure and deterministic.
 *
 * Convention (Excel / Sheets / Mathcad): the leftmost selected column is the x
 * axis, the rest are y traces. A single selected column charts against its row
 * index instead.
 */
import { cellAddress, colToLetter } from "@/lib/calc";
import { newId, newRegion, type PlotAxis, type PlotRegion, type PlotTrace, type TableRegion } from "./content";

/** A rectangular cell selection in DATA coordinates (zero-based; row 0 = A1 row 2). */
export interface CellRect {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

/** Normalize a (possibly reversed / right-to-left) drag to its min/max corners. */
function normalizeRect(rect: CellRect): CellRect {
  return {
    r0: Math.min(rect.r0, rect.r1),
    c0: Math.min(rect.c0, rect.c1),
    r1: Math.max(rect.r0, rect.r1),
    c1: Math.max(rect.c0, rect.c1),
  };
}

/** A column's real unit, or undefined for blank / dash placeholders (matches the engine). */
function realUnit(unit: string | undefined): string | undefined {
  if (!unit) return undefined;
  const t = unit.trim();
  if (t === "" || t === "—" || t === "-" || t === "–") return undefined;
  return t;
}

/**
 * A readable identifier base for a range key, derived from the column label:
 * ASCII word chars only, never starting with a digit, length-capped, falling back
 * to the column letter for an empty / non-identifier label. The caller always
 * appends a unique suffix, so this need not be unique on its own.
 */
function keyBase(label: string, colIndex: number): string {
  let base = label
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "") // drop non-ASCII
    .replace(/[^A-Za-z0-9_]/g, "_") // remaining punctuation / spaces → underscore
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (base === "") base = colToLetter(colIndex); // empty / fully non-ASCII label
  if (/^[0-9]/.test(base)) base = `c_${base}`; // identifiers can't start with a digit
  if (base.length > 24) base = base.slice(0, 24);
  return base;
}

/** A worksheet-unique, valid-identifier range key (`/^[A-Za-z_]\w*$/`). */
function uniqueKey(label: string, colIndex: number): string {
  const suffix = newId().replace(/[^a-z0-9]/gi, "").slice(-6) || "0";
  return `${keyBase(label, colIndex)}_${suffix}`;
}

interface RangeColumn {
  key: string;
  label: string;
  unit?: string;
}

/**
 * Build the named ranges + bound plot for a selected table range, or null when the
 * selection is a single cell (nothing to chart). The returned `ranges` are meant to
 * be merged into the source table's `ranges`; the returned `plot` is inserted after
 * the table.
 */
export function buildChartFromRange(
  table: TableRegion,
  rawRect: CellRect,
): { ranges: Record<string, string>; plot: PlotRegion } | null {
  const rect = normalizeRect(rawRect);
  if (rect.r0 === rect.r1 && rect.c0 === rect.c1) return null;

  // One A1 sub-range + unique key per column in the selection.
  const ranges: Record<string, string> = {};
  const columns: RangeColumn[] = [];
  for (let c = rect.c0; c <= rect.c1; c += 1) {
    const col = table.columns[c];
    const label = col?.label?.trim() ?? "";
    const key = uniqueKey(label, c);
    ranges[key] = `${cellAddress(rect.r0, c)}:${cellAddress(rect.r1, c)}`;
    columns.push({ key, label, unit: realUnit(col?.unit) });
  }

  // Leftmost column → x; the rest → y traces. A lone column charts against its index.
  let xData: string;
  const xAxis: PlotAxis = {};
  let yColumns: RangeColumn[];
  if (columns.length === 1) {
    const n = rect.r1 - rect.r0 + 1;
    xData = `1:${n}`; // literal mathjs range → [1, 2, …, n]; no scope name
    xAxis.label = "Index";
    yColumns = columns;
  } else {
    const xCol = columns[0];
    xData = xCol.key;
    if (xCol.label) xAxis.label = xCol.label;
    if (xCol.unit) xAxis.unit = xCol.unit;
    yColumns = columns.slice(1);
  }

  const traces: PlotTrace[] = yColumns.map((yc) => ({
    id: newId(),
    expr: yc.key,
    ...(yc.label ? { label: yc.label } : {}),
    style: "line-marker" as const,
  }));

  // Pin the y unit only when every trace shares one real unit — otherwise leave it
  // auto, so each trace converts to its own dimension instead of erroring on a mismatch.
  const yAxis: PlotAxis = {};
  if (yColumns.length === 1 && yColumns[0].label) yAxis.label = yColumns[0].label;
  const firstUnit = yColumns[0]?.unit;
  if (firstUnit !== undefined && yColumns.every((yc) => yc.unit === firstUnit)) {
    yAxis.unit = firstUnit;
  }

  const region = newRegion("plot");
  if (region.type !== "plot") return null; // unreachable; narrows the union
  region.kind = "xy";
  region.xData = xData;
  region.x = xAxis;
  region.y = yAxis;
  region.traces = traces;
  region.legend = traces.length > 1;
  if (table.name) region.title = table.name;

  return { ranges, plot: region };
}
