/**
 * Variable symbol table (Func 5.3) — pure and deterministic.
 *
 * Drives the left-panel "Variables" tab: one entry per defining math region, with
 * the name, its section group, and a reference count (how many other regions use
 * it). Values + units are joined in at render time from the live engine results;
 * the *structure* (names, grouping, refcounts) is derived from content alone, so
 * it stays correct in Manual mode before a recalc and is trivially unit-tested.
 *
 * Reference counting reuses the engine's own parse + unit-literal filter so a
 * single-letter unit (`b`, `t`, `kN`) never masquerades as a variable, while a
 * user-defined name that shadows a unit is counted.
 */
import { parseRegion, filterUnitLiterals } from "@/lib/calc";
import { walkRegions } from "./flatten";
import type { WorksheetContent } from "./content";

export interface SymbolEntry {
  /** The defining region's id (for select + scroll-to). */
  id: string;
  /** The defined name, e.g. `N_Rd`. */
  name: string;
  /** Section label this definition sits under (nearest heading/eyebrow). */
  group: string;
  /** Number of other regions that reference this name. */
  refCount: number;
}

/** Group label for definitions that precede any heading. */
const FALLBACK_GROUP = "Variables";

interface ParsedMath {
  id: string;
  name: string | null;
  deps: string[];
  group: string;
}

/** Build the symbol table: one entry per defining math region, in reading order. */
export function buildSymbolTable(content: WorksheetContent): SymbolEntry[] {
  // Pass 1 — parse every math region once, tracking the nearest section label.
  const parsed: ParsedMath[] = [];
  let group = FALLBACK_GROUP;
  for (const region of walkRegions(content)) {
    if (region.type === "text") {
      if (region.heading) group = region.text.trim() || "Untitled heading";
      else if (region.eyebrow) group = region.eyebrow;
      continue;
    }
    if (region.type !== "math") continue;
    const { name, deps } = parseRegion(region.source);
    parsed.push({ id: region.id, name, deps, group });
  }

  const definedNames = new Set<string>();
  for (const p of parsed) if (p.name) definedNames.add(p.name);

  // Pass 2 — count references: each region contributes at most once per name it
  // uses (unit literals dropped, self-references skipped).
  const refCount = new Map<string, number>();
  for (const p of parsed) {
    const used = new Set(filterUnitLiterals(p.deps, definedNames));
    for (const name of used) {
      if (name === p.name) continue;
      refCount.set(name, (refCount.get(name) ?? 0) + 1);
    }
  }

  const entries: SymbolEntry[] = [];
  for (const p of parsed) {
    if (!p.name) continue;
    entries.push({
      id: p.id,
      name: p.name,
      group: p.group,
      refCount: refCount.get(p.name) ?? 0,
    });
  }
  return entries;
}

/**
 * Loose name match for the Variables search box: matches against the raw name
 * (`F_t`) and the underscore-stripped form (`Ft`), so typing `Ft`, `ft`, `F`, or
 * `t` all find `F_t`. An empty query matches everything.
 */
export function matchSymbol(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const raw = name.toLowerCase();
  return raw.includes(q) || raw.replace(/_/g, "").includes(q.replace(/_/g, ""));
}
