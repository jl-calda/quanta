/**
 * Tree ↔ engine bridge (pure). The calc engine consumes a flat, reading-order
 * `RegionInput[]`; this module walks the worksheet content tree (rows top→bottom,
 * cells left→right, regions top→bottom, descending into areas) to produce it, and
 * maps `RegionResult`s back onto region ids for O(1) render lookup. Reading order
 * is what enforces "a name must be defined earlier than it is used".
 */
import {
  compileProgram,
  evaluatePlot,
  evaluateProgram,
  evaluateSolve,
  evaluateTable,
  serializeForScope,
  syncPrograms,
  SI_SYSTEM,
} from "@/lib/calc";
import { DISPATCH_NAME } from "@/lib/calc/program-registry";
import type {
  PlotResult,
  ProgramFn,
  ProgramResult,
  RegionInput,
  RegionResult,
  SheetResult,
  SolveResult,
  TableResult,
} from "@/lib/calc";
import type {
  ControlRegion,
  PlotRegion,
  ProgramRegion,
  Region,
  Row,
  SolveRegion,
  TableRegion,
  WorksheetContent,
} from "./content";

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
 * The `bind := value` definition source a control contributes to engine scope,
 * or null when it shouldn't bind (no name, or no value to write). `valueType`
 * decides serialization: text → quoted (matching `serializeForScope`), boolean
 * → true/false, number → `value unit` (unit-aware), expr → verbatim. This is the
 * crux of "an input control writes its bound variable as a definition" (§6.7).
 */
export function controlDefinitionSource(region: ControlRegion): string | null {
  const bind = region.bind?.trim();
  if (!bind || region.value === undefined || region.value === "") return null;
  const type = region.valueType ?? "number";
  let rhs: string;
  if (type === "boolean") {
    rhs = region.value ? "true" : "false";
  } else if (type === "text") {
    rhs = JSON.stringify(String(region.value));
  } else if (type === "expr") {
    rhs = String(region.value);
  } else {
    rhs = region.unit ? `${region.value} ${region.unit}` : String(region.value);
  }
  return `${bind} := ${rhs}`;
}

/**
 * Flatten the tree to the engine's reading-order input list. `math` regions and
 * configured `control` regions are evaluables this pass; their order in the list
 * is the reading order the engine uses for name visibility and recalc.
 */
export function flattenToRegionInputs(content: WorksheetContent): RegionInput[] {
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
    } else if (region.type === "control") {
      const source = controlDefinitionSource(region);
      if (source) inputs.push({ id: region.id, source });
    }
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

/** Every solve block, in reading order — drives the provider's solve evaluation. */
export function solveRegions(content: WorksheetContent): SolveRegion[] {
  const out: SolveRegion[] = [];
  for (const region of walkRegions(content)) {
    if (region.type === "solve") out.push(region);
  }
  return out;
}

/** Every program block, in reading order — drives the provider's program evaluation. */
export function programRegions(content: WorksheetContent): ProgramRegion[] {
  const out: ProgramRegion[] = [];
  for (const region of walkRegions(content)) {
    if (region.type === "program") out.push(region);
  }
  return out;
}

/** A program region is a callable function when it has a name and ≥1 parameter. */
function isFunctionProgram(region: ProgramRegion): boolean {
  return !!region.name?.trim() && (region.params ?? []).some((p) => p.trim());
}

/**
 * The synthetic engine input that makes a function program callable from ordinary
 * math regions: a mathjs function-assignment whose body delegates to the static
 * dispatcher (`name(p1, p2) = __quantaProgram("id", p1, p2)`). Evaluating it
 * defines `name` in the engine's scope; calling `name(…)` later routes through the
 * registry to the compiled closure. Null when the program isn't a function.
 */
function programFunctionInput(region: ProgramRegion): RegionInput | null {
  if (!isFunctionProgram(region)) return null;
  const name = region.name!.trim();
  const params = (region.params ?? []).map((p) => p.trim()).filter(Boolean);
  const args = params.join(", ");
  return {
    id: `${PROG_PREFIX}${region.id}`,
    source: `${name}(${args}) = ${DISPATCH_NAME}(${JSON.stringify(region.id)}, ${args})`,
  };
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
  solveExports?: Map<string, Record<string, string>>,
  programExports?: Map<string, Record<string, string>>,
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
    } else if (region.type === "control") {
      const source = controlDefinitionSource(region);
      if (source) inputs.push({ id: region.id, source });
    } else if (region.type === "table") {
      const exp = tableExports?.get(region.id);
      if (exp) {
        for (const [name, source] of Object.entries(exp)) {
          inputs.push({ id: `${SYNTHETIC_PREFIX}${region.id}:${name}`, source: `${name} := ${source}` });
        }
      }
    } else if (region.type === "solve") {
      // A solve block is an exporter like a table: its solved unknowns are folded
      // back as synthetic definitions at its reading-order position so the
      // UNMODIFIED engine resolves them for downstream regions.
      const exp = solveExports?.get(region.id);
      if (exp) {
        for (const [name, source] of Object.entries(exp)) {
          inputs.push({ id: `${SOLVE_PREFIX}${region.id}:${name}`, source: `${name} := ${source}` });
        }
      }
    } else if (region.type === "program") {
      // A function program emits a synthetic function-assignment delegating to the
      // dispatcher (defined unconditionally — its closure is registered by the
      // settle loop). A value program folds its computed result back like a table.
      const fnInput = programFunctionInput(region);
      if (fnInput) {
        inputs.push(fnInput);
      } else {
        const exp = programExports?.get(region.id);
        if (exp) {
          for (const [name, source] of Object.entries(exp)) {
            inputs.push({ id: `${PROG_PREFIX}${region.id}:${name}`, source: `${name} := ${source}` });
          }
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
const SOLVE_PREFIX = "slv:";
const PROG_PREFIX = "prog:";

/** True for an engine input id that is a folded-back table/solve/program export. */
function isSynthetic(id: string): boolean {
  return (
    id.startsWith(SYNTHETIC_PREFIX) ||
    id.startsWith(SOLVE_PREFIX) ||
    id.startsWith(PROG_PREFIX)
  );
}

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

/**
 * A compact, deterministic signature of the engine result — id, status, and
 * formatted value per region. Function programs change no export snapshot, so the
 * settle loop also compares this to know when the sheet has stopped changing.
 */
function sheetSignature(sheet: SheetResult): string {
  return sheet.regions.map((r) => `${r.id}:${r.status}:${r.formatted}`).join("\n");
}

/** Drop synthetic table/solve export regions so results reflect real regions only. */
function stripSynthetic(sheet: SheetResult): SheetResult {
  const regions = sheet.regions.filter((r) => !isSynthetic(r.id));
  if (regions.length === sheet.regions.length) return sheet;
  const errorCount = regions.filter((r) => r.status === "error").length;
  const hasStale = regions.some((r) => r.status === "stale");
  return { regions, errorCount, status: errorCount > 0 ? "error" : hasStale ? "stale" : "current" };
}

/**
 * Run the engine + its exporters (tables, solve blocks, AND program blocks) to a
 * settled fixpoint. Each reads the worksheet scope from the engine's results;
 * their serialized named outputs are folded back as synthetic definitions and the
 * engine re-runs, until the combined export snapshot stops changing (or the cap /
 * oscillation guard trips). Tables, solves, and value programs are unit-aware
 * exporters; function programs are compiled to closures, registered in the
 * dispatcher registry (so math regions resolve `f(x)` through the UNMODIFIED
 * engine) and injected by name into the shared scope (so tables / solves / plots /
 * other programs can call them too). The pure, synchronous engine modules run
 * here, so the whole loop stays deterministic and Node-safe (programs recompute
 * during server-side PDF export). Returns the real-region sheet (synthetic defs
 * stripped) plus the per-table, per-plot, per-solve, and per-program results.
 */
export function settleTables(
  content: WorksheetContent,
  engine: TableEngine,
): {
  sheet: SheetResult;
  tables: Map<string, TableResult>;
  plots: Map<string, PlotResult>;
  solves: Map<string, SolveResult>;
  programs: Map<string, ProgramResult>;
} {
  const plotSpecs = plotRegions(content);
  const tableSpecs = tableRegions(content);
  const solveSpecs = solveRegions(content);
  const programSpecs = programRegions(content);

  // No exporters ⇒ a single engine pass, then sample plots against its scope.
  if (tableSpecs.length === 0 && solveSpecs.length === 0 && programSpecs.length === 0) {
    syncPrograms(new Map()); // clear any registry left by a previous worksheet
    engine.setRegions(buildEngineInputs(content));
    const sheet = engine.getResult();
    const plots = evaluatePlotsWith(plotSpecs, worksheetScopeFromResults(sheet.regions));
    return { sheet, tables: new Map(), plots, solves: new Map(), programs: new Map() };
  }

  // One combined export map keyed by region id (ids are unique, so it can serve
  // as the table-, solve-, AND program-value export source for `buildEngineInputs`).
  let exportsBySource = new Map<string, Record<string, string>>();
  let exportsRaw: Record<string, unknown> = {};

  // Function-program closures are built ONCE and capture a stable scope reference
  // (`scopeRef.current`), updated each pass. So `f(x)` always sees the latest
  // settled scope — pure functions work from pass 0, scope-capturing ones converge
  // as the loop re-runs — without re-registering closures every pass.
  const scopeRef: { current: Record<string, unknown> } = { current: {} };
  const programFns = new Map<string, ProgramFn>();
  const programNameById = new Map<string, string>();
  for (const spec of programSpecs) {
    if (!isFunctionProgram(spec)) continue;
    const compiled = compileProgram(spec);
    if (compiled.ok && compiled.params.length > 0) {
      programFns.set(spec.id, (...args) => compiled.run(args, scopeRef.current));
      if (compiled.name) programNameById.set(spec.id, compiled.name);
    }
  }
  syncPrograms(programFns); // registered before any engine pass

  let sheet = engine.getResult();
  let tables = new Map<string, TableResult>();
  let solves = new Map<string, SolveResult>();
  let programs = new Map<string, ProgramResult>();
  let prevSheetSig = "";
  const seen = new Set<string>();

  for (let iter = 0; iter < MAX_SETTLE_ITERS; iter += 1) {
    engine.setRegions(buildEngineInputs(content, exportsBySource, exportsBySource, exportsBySource));
    sheet = engine.getResult();
    const scope: Record<string, unknown> = { ...worksheetScopeFromResults(sheet.regions), ...exportsRaw };
    // Inject function closures by name (so tables / solves / plots / programs can
    // call them) and point the closures' shared scope at this pass's scope.
    for (const [id, name] of programNameById) {
      const fn = programFns.get(id);
      if (fn) scope[name] = fn;
    }
    scopeRef.current = scope;

    tables = new Map();
    solves = new Map();
    programs = new Map();
    const nextRaw: Record<string, unknown> = {};
    const nextBySource = new Map<string, Record<string, string>>();

    for (const spec of programSpecs) {
      const result = evaluateProgram(spec, scope, SI_SYSTEM);
      programs.set(spec.id, result);
      // A value program folds its result back like a table/solve export.
      if (result.status === "value" && result.name && result.value !== undefined) {
        const serialized = serializeForScope(result.value);
        if (serialized !== null) {
          nextRaw[result.name] = result.value;
          nextBySource.set(spec.id, { [result.name]: serialized });
        }
      }
    }

    for (const spec of tableSpecs) {
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

    for (const spec of solveSpecs) {
      const result = evaluateSolve(spec, scope, SI_SYSTEM);
      solves.set(spec.id, result);
      const sources: Record<string, string> = {};
      for (const out of result.outputs) {
        nextRaw[out.name] = out.value;
        const serialized = serializeForScope(out.value);
        if (serialized !== null) sources[out.name] = serialized;
      }
      if (Object.keys(sources).length > 0) nextBySource.set(spec.id, sources);
    }

    const snapshot = snapshotExports(nextBySource);
    // A function program changes no export, so also settle on the engine result:
    // re-run while the sheet keeps changing (a scope-capturing program converging).
    const sheetSig = sheetSignature(sheet);
    const settled = snapshot === snapshotExports(exportsBySource) && sheetSig === prevSheetSig;
    exportsBySource = nextBySource;
    exportsRaw = nextRaw;
    prevSheetSig = sheetSig;
    if (settled || seen.has(snapshot + "|" + sheetSig)) break; // fixpoint or oscillation guard
    seen.add(snapshot + "|" + sheetSig);
  }

  // Plots read the final settled scope (worksheet names + table / solve / program
  // value exports + function-program closures), so a plot can call a program too.
  const plotScope: Record<string, unknown> = { ...worksheetScopeFromResults(sheet.regions), ...exportsRaw };
  for (const [id, name] of programNameById) {
    const fn = programFns.get(id);
    if (fn) plotScope[name] = fn;
  }
  const plots = evaluatePlotsWith(plotSpecs, plotScope);

  return { sheet: stripSynthetic(sheet), tables, plots, solves, programs };
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
