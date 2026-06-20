/**
 * Deterministic server-side evaluation for export (Functional Brief §4.10).
 *
 * Runs the SAME pure pipeline the editor uses — `evaluateSheet` over the flat,
 * reading-order region list, with the SI display system (unit system is a
 * display-only selection this pass; see editor-provider) and per-region format
 * carried in the content tree. Because the engine is pure and deterministic, the
 * results computed here are byte-for-byte the ones shown on screen, which is what
 * lets a PDF/Word/Excel export be trusted against the worksheet.
 *
 * Symbolic (SymPy) regions are the one exception the pure engine can't compute —
 * they need the async Pyodide worker, which the Node export path can't drive. So
 * after the pure pass we overlay each symbolic region's worker-computed result
 * from its cached value in the content tree ({@link applySymbolicCache}). This
 * keeps export on a single deterministic Node path (no Pyodide server-side) while
 * still showing the same symbolic result as the app.
 */
import { evaluateSheet, SI_SYSTEM, type RegionResult } from "@/lib/calc";
import { flattenToRegionInputs, mapResults } from "@/lib/worksheet/flatten";
import { applySymbolicCache } from "@/lib/worksheet/symbolic-cache";
import type { WorksheetContent } from "@/lib/worksheet/content";

/** Evaluate a worksheet's content and index the results by region id. */
export function evaluateForExport(content: WorksheetContent): Map<string, RegionResult> {
  const sheet = evaluateSheet(flattenToRegionInputs(content), { unitSystem: SI_SYSTEM });
  return applySymbolicCache(content, mapResults(sheet));
}
