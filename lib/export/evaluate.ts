/**
 * Deterministic server-side evaluation for export (Functional Brief §4.10).
 *
 * Runs the SAME pure pipeline the editor uses — `evaluateSheet` over the flat,
 * reading-order region list, with the SI display system (unit system is a
 * display-only selection this pass; see editor-provider) and per-region format
 * carried in the content tree. Because the engine is pure and deterministic, the
 * results computed here are byte-for-byte the ones shown on screen, which is what
 * lets a PDF/Word/Excel export be trusted against the worksheet.
 */
import { evaluateSheet, SI_SYSTEM, type RegionResult } from "@/lib/calc";
import { flattenToRegionInputs, mapResults } from "@/lib/worksheet/flatten";
import type { WorksheetContent } from "@/lib/worksheet/content";

/** Evaluate a worksheet's content and index the results by region id. */
export function evaluateForExport(content: WorksheetContent): Map<string, RegionResult> {
  const sheet = evaluateSheet(flattenToRegionInputs(content), { unitSystem: SI_SYSTEM });
  return mapResults(sheet);
}
