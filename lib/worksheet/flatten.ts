/**
 * Tree ↔ engine bridge (pure). The calc engine consumes a flat, reading-order
 * `RegionInput[]`; this module walks the worksheet content tree (rows top→bottom,
 * cells left→right, regions top→bottom, descending into areas) to produce it, and
 * maps `RegionResult`s back onto region ids for O(1) render lookup. Reading order
 * is what enforces "a name must be defined earlier than it is used".
 */
import { evaluatePlot, evaluateTable, serializeForScope, SI_SYSTEM } from "@/lib/calc";
import type { PlotResult, RegionInput, RegionResult, SheetResult, TableResult } from "@/lib/calc";
import type { PlotRegion, Region, Row, TableRegion, WorksheetContent } from "./content";

/** Yield every region in reading order, descending into area children. */
export function* walkRegions(content: WorksheetContent): Generator<Region> {
  for (const row of content.rows) {
    for (const cell of row.cells) {
      yield* walkRegionList(cell.regions);
    }
  }
}

function* walkRegionList(regions: Region[]): Generator<Region> {
  for (const region of regions) {
    yield region;
    if (region.type === "area") yield* walkRegionList(region.regions);
  }
}

/**
 * Flatten the tree to the engine's reading-order input list. Only `math`
 * regions are evaluables this pass; their order in the list is the reading
 * order the engine uses for name visibility and recalc.
 */
export function flattenToRegionInputs(content: WorksheetContent): RegionInput[] {
  const inputs: RegionInput[] = [];
  for (const region of walkRegions(content)) {
    if (region.type !== "math") continue;
    inputs.push({
      id: region.id,
      source: region.source,
      unit: region.unit,
      format: region.format,
      conditional: region.conditional,
      display: region.display,
      disabled: region.disabled,
    });
  }
  return inputs;
}

/** Index a sheet result by region id, for render-time lookup. */
export function mapResults(sheet: SheetResult): Map<string, RegionResult> {
  const map = new Map<string, RegionResult>();
  for (const result of sheet.regions) map.set(result.id, result);
  return map;
}

/** Every table region, in reading order — drives the provider's table evaluation. */
export function tableRegions(content: WorksheetContent): TableRegion[] {
  const out: TableRegion[] = [];
  for (const region of walkRegions(content)) {
    if (region.type === "table") out.push(region);
  }
  return out;
}

/** Every plot region, in reading order — drives the provider's plot evaluation. */
export function plotRegions(content: WorksheetContent): PlotRegion[] {
  const out: PlotRegion[] = [];
  for (const region of walkRegions(content)) {
    if (region.type === "plot") out.push(region);
  }
  return out;
}

/**
 * Sample every plot against a settled worksheet scope (pure — plots are read-only
 * consumers that export nothing, so they evaluate once after tables settle).
 */
export function evaluatePlotsWith(
  specs: PlotRegion[],
  scope: Record<string, unknown>,
): Map<string, PlotResult> {
  const out = new Map<string, PlotResult>();
  for (const spec of specs) out.set(spec.id, evaluatePlot(spec, scope, SI_SYSTEM));
  return out;
}

/**
 * The worksheet name→value scope from a finished sheet result — the read side of
 * the table scope-bridge. Uses each definition's RAW value (as the engine itself
 * scopes it), so a table cell's `toDisplayUnit` behaves exactly like a region's.
 */
export function worksheetScopeFromResults(
  regions: RegionResult[],
): Record<string, unknown> {
  const scope: Record<string, unknown> = {};
  for (const r of regions) {
    if (r.name && r.status === "current" && r.value !== undefined) scope[r.name] = r.value;
  }
  return scope;
}

/**
 * Engine input list with table outputs folded back in (the write side of the
 * scope-bridge). Walks reading order: each math region emits its input, and after
 * each table its serialized named exports are spliced in as synthetic definitions
 * (`name := <source>`) so the UNMODIFIED engine resolves them for downstream
 * regions through its normal reading-order graph. With no `tableExports` this is
 * exactly {@link flattenToRegionInputs}.
 */
export function buildEngineInputs(
  content: WorksheetContent,
  tableExports?: Map<string, Record<string, string>>,
): RegionInput[] {
  const inputs: RegionInput[] = [];
  for (const region of walkRegions(content)) {
    if (region.type === "math") {
      inputs.push({
        id: region.id,
        source: region.source,
        unit: region.unit,
        format: region.format,
        conditional: region.conditional,
        display: region.display,
        disabled: region.disabled,
      });
    } else if (region.type === "table") {
      const exp = tableExports?.get(region.id);
      if (exp) {
        for (const [name, source] of Object.entries(exp)) {
          inputs.push({ id: `${SYNTHETIC_PREFIX}${region.id}:${name}`, source: `${name} := ${source}` });
        }
      }
    }
  }
  return inputs;
}

/* ------------------------------------------------------------------ *
 * Scope-bridge settle loop (Functional Brief §6.3)
 *
 * Pure and engine-agnostic so it is unit-testable: tables read the worksheet
 * scope from the engine's results and fold their named outputs back as synthetic
 * definitions the UNMODIFIED engine evaluates. We iterate to a fixpoint so a
 * table→downstream-math chain settles, bounded by a hard cap and an oscillation
 * guard (a repeated export snapshot) so it can never spin.
 * ------------------------------------------------------------------ */

const MAX_SETTLE_ITERS = 8;
const SYNTHETIC_PREFIX = "tbl:";

/** The minimal slice of `CalcEngine` the settle loop drives. */
export interface TableEngine {
  setRegions(inputs: RegionInput[]): void;
  getResult(): SheetResult;
}

/** Deterministic snapshot of per-table serialized exports, for the settle guard. */
function snapshotExports(map: Map<string, Record<string, string>>): string {
  const obj: Record<string, Record<string, string>> = {};
  for (const key of [...map.keys()].sort()) {
    const inner: Record<string, string> = {};
    const src = map.get(key)!;
    for (const name of Object.keys(src).sort()) inner[name] = src[name];
    obj[key] = inner;
  }
  return JSON.stringify(obj);
}

/** Drop synthetic table-export regions so results reflect real regions only. */
function stripSynthetic(sheet: SheetResult): SheetResult {
  const regions = sheet.regions.filter((r) => !r.id.startsWith(SYNTHETIC_PREFIX));
  if (regions.length === sheet.regions.length) return sheet;
  const errorCount = regions.filter((r) => r.status === "error").length;
  const hasStale = regions.some((r) => r.status === "stale");
  return { regions, errorCount, status: errorCount > 0 ? "error" : hasStale ? "stale" : "current" };
}

/**
 * Run the engine + tables to a settled fixpoint. Tables read the worksheet scope
 * from the engine's results; their serialized named exports are folded back as
 * synthetic definitions and the engine re-runs, until the export snapshot stops
 * changing (or the cap / oscillation guard trips). Returns the real-region sheet
 * (synthetic defs stripped) and the per-table results, keyed by region id.
 */
export function settleTables(
  content: WorksheetContent,
  engine: TableEngine,
): {
  sheet: SheetResult;
  tables: Map<string, TableResult>;
  plots: Map<string, PlotResult>;
} {
  const plotSpecs = plotRegions(content);
  const specs = tableRegions(content);
  if (specs.length === 0) {
    engine.setRegions(buildEngineInputs(content));
    const sheet = engine.getResult();
    const plots = evaluatePlotsWith(plotSpecs, worksheetScopeFromResults(sheet.regions));
    return { sheet, tables: new Map(), plots };
  }

  let exportsBySource = new Map<string, Record<string, string>>();
  let exportsRaw: Record<string, unknown> = {};
  let sheet = engine.getResult();
  let tables = new Map<string, TableResult>();
  const seen = new Set<string>();

  for (let iter = 0; iter < MAX_SETTLE_ITERS; iter += 1) {
    engine.setRegions(buildEngineInputs(content, exportsBySource));
    sheet = engine.getResult();
    const scope = { ...worksheetScopeFromResults(sheet.regions), ...exportsRaw };

    tables = new Map();
    const nextRaw: Record<string, unknown> = {};
    const nextBySource = new Map<string, Record<string, string>>();
    for (const spec of specs) {
      const result = evaluateTable(spec, scope, SI_SYSTEM);
      tables.set(spec.id, result);
      const sources: Record<string, string> = {};
      for (const [name, value] of Object.entries(result.exports)) {
        nextRaw[name] = value;
        const serialized = serializeForScope(value);
        if (serialized !== null) sources[name] = serialized;
      }
      if (Object.keys(sources).length > 0) nextBySource.set(spec.id, sources);
    }

    const snapshot = snapshotExports(nextBySource);
    const settled = snapshot === snapshotExports(exportsBySource);
    exportsBySource = nextBySource;
    exportsRaw = nextRaw;
    if (settled || seen.has(snapshot)) break; // fixpoint or oscillation guard
    seen.add(snapshot);
  }

  // Plots read the final settled scope (worksheet names + table exports).
  const plotScope = { ...worksheetScopeFromResults(sheet.regions), ...exportsRaw };
  const plots = evaluatePlotsWith(plotSpecs, plotScope);

  return { sheet: stripSynthetic(sheet), tables, plots };
}

/** All region ids in reading order (every type), e.g. for selection navigation. */
export function readingOrderIds(content: WorksheetContent): string[] {
  const ids: string[] = [];
  for (const region of walkRegions(content)) ids.push(region.id);
  return ids;
}

/** The defining math regions in reading order — drives the Variables panel. */
export function mathRegions(content: WorksheetContent): Region[] {
  const out: Region[] = [];
  for (const region of walkRegions(content)) {
    if (region.type === "math") out.push(region);
  }
  return out;
}

/** Find a region anywhere in the tree (including inside areas). */
export function findRegion(
  content: WorksheetContent,
  id: string,
): Region | undefined {
  for (const region of walkRegions(content)) {
    if (region.id === id) return region;
  }
  return undefined;
}

/** True when `id` is one of `regions` or nested inside one of their areas. */
function listHasRegion(regions: Region[], id: string): boolean {
  for (const region of regions) {
    if (region.id === id) return true;
    if (region.type === "area" && listHasRegion(region.regions, id)) return true;
  }
  return false;
}

/**
 * Find the row that owns a region id (descending into areas), or null. Drives
 * the ribbon's column controls — `SET_COLUMNS`/`TOGGLE_SPAN` operate on the row
 * holding the current selection, and the column picker reflects its count.
 */
export function findRowOf(content: WorksheetContent, id: string): Row | null {
  for (const row of content.rows) {
    for (const cell of row.cells) {
      if (listHasRegion(cell.regions, id)) return row;
    }
  }
  return null;
}
