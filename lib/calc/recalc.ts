/**
 * Recalculation orchestrator (Functional Brief §2, steps 1–8).
 *
 * `evaluateSheet` runs the full pure pipeline over a reading-order region list:
 * parse → dependency graph → cycle check → topological sort → evaluate in order
 * (maintaining a unit-aware scope) → convert to display units → format → render
 * TeX (+ show-steps) → conditional formatting → typed errors. A failed region
 * does not crash the sweep; its dependents are reported `blocked`.
 *
 * `CalcEngine` wraps that core for incremental editing: it caches parsed ASTs,
 * marks edited regions and their transitive dependents dirty, and supports the
 * Auto / Manual / recalc-to-here modes. The engine stays synchronous and pure —
 * debouncing lives in the UI — so it behaves identically on client, worker, Node.
 */
import { math } from "./math";
import { parseRegion, filterUnitLiterals, type ParsedRegion } from "./parse";
import {
  analyzeDependencies,
  type DepAnalysis,
  type RegionNode,
} from "./graph";
import { toDisplayUnit, SI_SYSTEM } from "./units";
import { formatValue } from "./format";
import { buildSubstitutedTex } from "./show-steps";
import { applyConditional } from "./conditional";
import {
  blockedBy,
  classifyThrow,
  cycle as cycleError,
  definedLater,
  undefinedSymbol,
} from "./errors";
import type {
  RegionInput,
  RegionResult,
  SheetResult,
  UnitSystem,
} from "./types";

export interface EvaluateOptions {
  unitSystem?: UnitSystem;
}

/* ------------------------------------------------------------------ *
 * Pure full-sheet evaluation
 * ------------------------------------------------------------------ */

export function evaluateSheet(
  regions: RegionInput[],
  options: EvaluateOptions = {},
): SheetResult {
  const parsed = regions.map((r) => parseRegion(r.source));
  return evaluateParsed(regions, parsed, options);
}

/**
 * Build dependency-graph nodes from parsed regions, dropping unit literals
 * (references no region defines that are valid mathjs units). Definitions shadow
 * units, so a defined name is always kept as a dependency.
 */
function buildNodes(parsed: ParsedRegion[]): RegionNode[] {
  const definedNames = new Set(
    parsed.map((p) => p.name).filter((n): n is string => n != null),
  );
  return parsed.map((p, index) => ({
    index,
    name: p.name,
    deps: p.node ? filterUnitLiterals(p.deps, definedNames) : [],
  }));
}

export function evaluateParsed(
  regions: RegionInput[],
  parsed: ParsedRegion[],
  options: EvaluateOptions = {},
): SheetResult {
  const system = options.unitSystem ?? SI_SYSTEM;

  const analysis = analyzeDependencies(buildNodes(parsed));

  const results: (RegionResult | undefined)[] = new Array(regions.length);
  // Raw (true-unit) values of successfully defined names, for downstream math.
  const scope: Record<string, unknown> = {};
  const scopeMap = new Map<string, unknown>();
  const failed = new Set<number>(); // indices that errored ⇒ block dependents

  // 1) Disabled regions are inert: parsed but neither evaluated nor exported.
  regions.forEach((region, index) => {
    if (region.disabled) {
      results[index] = inert(region.id, parsed[index].name);
    }
  });

  // 2) Cyclic regions get a typed cycle error naming the loop.
  if (analysis.cyclic.size > 0) {
    const cycleFor = (index: number): string[] =>
      analysis.cycles.find((names) =>
        names.includes(parsed[index].name ?? ""),
      ) ?? [parsed[index].name ?? `region ${index}`];
    for (const index of analysis.cyclic) {
      if (results[index]) continue;
      results[index] = errorResult(
        regions[index].id,
        parsed[index].name,
        cycleError(cycleFor(index)),
      );
      failed.add(index);
    }
  }

  // 3) Evaluate live regions in dependency order.
  for (const index of analysis.order) {
    if (results[index]) continue; // disabled / already handled
    const region = regions[index];
    const p = parsed[index];

    if (p.error) {
      results[index] = errorResult(region.id, p.name, p.error);
      failed.add(index);
      continue;
    }

    const depError = checkDeps(index, analysis, scope, failed);
    if (depError) {
      results[index] = errorResult(region.id, p.name, depError);
      failed.add(index);
      continue;
    }

    results[index] = evaluateRegion(region, p, scope, scopeMap, system);
    if (results[index]!.status === "error") {
      failed.add(index);
    } else if (p.name) {
      scope[p.name] = results[index]!.value;
      scopeMap.set(p.name, results[index]!.value);
    }
  }

  // 4) Any region the topo sort never reached (shouldn't happen) ⇒ stale.
  regions.forEach((region, index) => {
    if (!results[index]) {
      results[index] = {
        id: region.id,
        name: parsed[index].name,
        value: undefined,
        formatted: "",
        tex: "",
        status: "stale",
      };
    }
  });

  const final = results as RegionResult[];
  const errorCount = final.filter((r) => r.status === "error").length;
  return {
    regions: final,
    status: errorCount > 0 ? "error" : "current",
    errorCount,
  };
}

/* ------------------------------------------------------------------ *
 * Per-region evaluation
 * ------------------------------------------------------------------ */

function evaluateRegion(
  region: RegionInput,
  parsed: ParsedRegion,
  scope: Record<string, unknown>,
  scopeMap: Map<string, unknown>,
  system: UnitSystem,
): RegionResult {
  const node = parsed.node!;
  const tex = definitionTex(parsed.name, node);

  let rawValue: unknown;
  try {
    rawValue = node.evaluate(scope);
  } catch (error) {
    return errorResult(region.id, parsed.name, classifyThrow(error), tex);
  }

  let displayValue: unknown;
  let formatted: string;
  try {
    displayValue = toDisplayUnit(rawValue, region.unit, system);
    formatted = formatValue(displayValue, region.format);
  } catch (error) {
    return errorResult(region.id, parsed.name, classifyThrow(error), tex);
  }

  let substitutedTex: string | undefined;
  try {
    substitutedTex = buildSubstitutedTex(node, scopeMap);
  } catch {
    substitutedTex = undefined; // show-steps is best-effort, never fatal
  }

  return {
    id: region.id,
    name: parsed.name,
    value: rawValue,
    formatted,
    tex,
    substitutedTex,
    style: applyConditional(displayValue, region.conditional),
    status: "current",
  };
}

/**
 * Validate a region's resolved dependencies before evaluation:
 * forward references ⇒ `defined-later`, unknown names ⇒ `undefined`, and a
 * dependency on a region that errored ⇒ `blocked`.
 */
function checkDeps(
  index: number,
  analysis: DepAnalysis,
  scope: Record<string, unknown>,
  failed: Set<number>,
) {
  for (const dep of analysis.resolved.get(index) ?? []) {
    if (dep.status === "later") return definedLater(dep.name);
    if (dep.status === "unresolved") {
      if (!isMathConstant(dep.name)) return undefinedSymbol(dep.name);
      continue;
    }
    // status === "ok": the dependency resolved to an earlier region.
    if (failed.has(dep.target) || !(dep.name in scope)) {
      return blockedBy(dep.name);
    }
  }
  return undefined;
}

function isMathConstant(name: string): boolean {
  return typeof (math as unknown as Record<string, unknown>)[name] === "number";
}

/* ------------------------------------------------------------------ *
 * Result/TeX helpers
 * ------------------------------------------------------------------ */

function definitionTex(name: string | null, node: ParsedRegion["node"]): string {
  const rhs = node ? node.toTex() : "";
  return name ? `${texName(name)} := ${rhs}` : rhs;
}

/** Render a name with subscripts (`N_Rd` → `N_{Rd}`) for TeX. */
function texName(name: string): string {
  const underscore = name.indexOf("_");
  if (underscore === -1) return name;
  const base = name.slice(0, underscore);
  const sub = name.slice(underscore + 1);
  return `${base}_{${sub}}`;
}

function errorResult(
  id: string,
  name: string | null,
  error: RegionResult["error"],
  tex = "",
): RegionResult {
  return {
    id,
    name,
    value: undefined,
    formatted: "",
    tex,
    error,
    status: "error",
  };
}

function inert(id: string, name: string | null): RegionResult {
  return { id, name, value: undefined, formatted: "", tex: "", status: "current" };
}

/* ------------------------------------------------------------------ *
 * Incremental engine — caching, dirty-tracking, recalc modes
 * ------------------------------------------------------------------ */

export type RecalcMode = "auto" | "manual";

interface CacheEntry {
  source: string;
  parsed: ParsedRegion;
}

export class CalcEngine {
  private regions: RegionInput[];
  private readonly system: UnitSystem;
  private mode: RecalcMode;
  private readonly cache = new Map<string, CacheEntry>();
  private dirty = new Set<string>();
  private result: SheetResult;

  constructor(
    regions: RegionInput[] = [],
    options: EvaluateOptions & { mode?: RecalcMode } = {},
  ) {
    this.regions = [...regions];
    this.system = options.unitSystem ?? SI_SYSTEM;
    this.mode = options.mode ?? "auto";
    this.result = this.runFull();
  }

  getResult(): SheetResult {
    return this.result;
  }

  getMode(): RecalcMode {
    return this.mode;
  }

  setMode(mode: RecalcMode): void {
    this.mode = mode;
  }

  /** Replace the whole region list (e.g. on document load). */
  setRegions(regions: RegionInput[]): void {
    this.regions = [...regions];
    this.dirty.clear();
    this.result = this.runFull();
  }

  /** Edit one region's source. Marks it + dependents dirty; Auto mode recomputes. */
  updateRegion(id: string, source: string): void {
    const region = this.regions.find((r) => r.id === id);
    if (!region) return;
    region.source = source;
    this.markDirty(id);
    if (this.mode === "auto") this.recalculate();
    else this.markStale();
  }

  /** Mark a region and everything transitively depending on it dirty. */
  markDirty(id: string): void {
    const dependents = this.transitiveDependents(id);
    this.dirty.add(id);
    for (const dep of dependents) this.dirty.add(dep);
  }

  /** Recompute every dirty region (and clear the dirty set). */
  recalculate(): SheetResult {
    this.result = this.runFull();
    this.dirty.clear();
    return this.result;
  }

  /**
   * Recompute, but only commit results up to and including `id` in reading
   * order; later regions keep their previous (possibly stale) results. Dirty
   * flags are cleared only for the committed prefix.
   */
  recalculateToHere(id: string): SheetResult {
    const upTo = this.regions.findIndex((r) => r.id === id);
    if (upTo === -1) return this.result;

    const fresh = this.runFull();
    const merged = this.regions.map((region, index) =>
      index <= upTo ? fresh.regions[index] : this.result.regions[index],
    );
    for (let i = 0; i <= upTo; i += 1) this.dirty.delete(this.regions[i].id);

    const errorCount = merged.filter((r) => r.status === "error").length;
    const hasStale = merged.some((r) => r.status === "stale");
    this.result = {
      regions: merged,
      errorCount,
      status: errorCount > 0 ? "error" : hasStale ? "stale" : "current",
    };
    return this.result;
  }

  private runFull(): SheetResult {
    const parsed = this.regions.map((region) => this.parseCached(region));
    return evaluateParsed(this.regions, parsed, { unitSystem: this.system });
  }

  /** Parse with the AST cache — reparse only when a region's source changed. */
  private parseCached(region: RegionInput): ParsedRegion {
    const hit = this.cache.get(region.id);
    if (hit && hit.source === region.source) return hit.parsed;
    const parsed = parseRegion(region.source);
    this.cache.set(region.id, { source: region.source, parsed });
    return parsed;
  }

  /** Flag dirty regions visibly stale without recomputing (Manual mode). */
  private markStale(): void {
    const regions = this.result.regions.map((r) =>
      this.dirty.has(r.id) && r.status !== "error"
        ? { ...r, status: "stale" as const }
        : r,
    );
    const hasStale = regions.some((r) => r.status === "stale");
    this.result = {
      ...this.result,
      regions,
      status: this.result.errorCount > 0 ? "error" : hasStale ? "stale" : "current",
    };
  }

  private transitiveDependents(id: string): Set<string> {
    const parsed = this.regions.map((region) => this.parseCached(region));
    const { resolved } = analyzeDependencies(buildNodes(parsed));

    // Reverse edges: defining region index → indices that depend on it.
    const dependentsOf = new Map<number, number[]>();
    for (const [from, deps] of resolved) {
      for (const dep of deps) {
        if (dep.target < 0) continue;
        const arr = dependentsOf.get(dep.target) ?? [];
        arr.push(from);
        dependentsOf.set(dep.target, arr);
      }
    }

    const startIndex = this.regions.findIndex((r) => r.id === id);
    const out = new Set<string>();
    const stack = startIndex === -1 ? [] : [startIndex];
    const seen = new Set<number>();
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const next of dependentsOf.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        out.add(this.regions[next].id);
        stack.push(next);
      }
    }
    return out;
  }
}
