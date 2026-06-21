/**
 * Inputs-summary selection (pure). The "Include inputs summary" option lists the
 * worksheet's *named leaf inputs* — definitions whose right-hand side references
 * no other defined name (e.g. `F_t := 14.5 kN`, not `N_Rd := φ · A_s · f_ub`).
 * We reuse the engine's own parser so the notion of "input" matches evaluation.
 */
import type { RegionResult } from "@/lib/calc";
import { parseRegion, splitDefinition } from "@/lib/calc";
import { walkRegions } from "@/lib/worksheet/flatten";
import type { WorksheetContent } from "@/lib/worksheet/content";

export interface InputRow {
  id: string;
  /** Defined name in engine plain text (e.g. `F_t`). */
  name: string;
  /** Formatted value carrying its unit, from the evaluated result. */
  value: string;
  /** Optional note — the region's tag, when set. */
  note?: string;
}

/**
 * Select the leaf-input rows for the summary table, in reading order. A region
 * qualifies when it defines a name and none of its dependencies is itself a
 * defined name in the sheet (so derived quantities are excluded).
 */
export function selectInputs(
  content: WorksheetContent,
  results: Map<string, RegionResult>,
): InputRow[] {
  const definedNames = new Set<string>();
  for (const region of walkRegions(content)) {
    if (region.type !== "math" || region.disabled) continue;
    const { name } = splitDefinition(region.source);
    if (name) definedNames.add(name);
  }

  const rows: InputRow[] = [];
  for (const region of walkRegions(content)) {
    if (region.type !== "math" || region.disabled) continue;
    const parsed = parseRegion(region.source);
    if (!parsed.name) continue;
    const referencesDefined = parsed.deps.some((dep) => definedNames.has(dep));
    if (referencesDefined) continue;

    const result = results.get(region.id);
    if (!result || result.error) continue;
    rows.push({
      id: region.id,
      name: parsed.name,
      value: result.formatted,
      note: region.tag,
    });
  }
  return rows;
}
