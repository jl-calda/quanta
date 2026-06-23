/**
 * Problems collector (pure) — the read side of the bottom Problems toolbar. It
 * folds the recalc results' per-region errors into a flat, reading-order list the
 * `ProblemsBar` renders and the status bar counts. Errors are reused verbatim
 * from the engine (`RegionResult.error`); nothing here changes how they're
 * produced, so this stays a display helper (no `/lib/calc` dependency on it) and
 * is trivially unit-testable.
 *
 * Scope: only the regions whose errors live in the recalc `SheetResult`
 * (`state.results`) — math and control. Solve/program/sweep blocks and symbolic
 * results compute through separate pipelines and keep their own in-region status.
 */
import type { CalcErrorKind, RegionResult } from "@/lib/calc";
import { findRegion, readingOrderIds } from "@/lib/worksheet/flatten";
import type { ControlRegion, WorksheetContent } from "@/lib/worksheet/content";

export interface Problem {
  regionId: string;
  /** Human label for the offending region (assigned name, source snippet, or type). */
  label: string;
  kind: CalcErrorKind;
  message: string;
  fixHint?: string;
}

/** Longest region label before it is truncated with an ellipsis. */
const SNIPPET_MAX = 40;

/** A single-line, length-capped version of a formula source for the list label. */
function snippet(source: string): string {
  const s = source.replace(/\s+/g, " ").trim();
  return s.length > SNIPPET_MAX ? s.slice(0, SNIPPET_MAX - 1) + "…" : s;
}

/**
 * A label for the problem entry: prefer the assigned variable name (what the
 * Variables panel shows), then a source snippet (math) or label/bind (control),
 * then a type-appropriate fallback. Tolerates a result whose region is no longer
 * in the tree (results can lag content by a render).
 */
function deriveLabel(content: WorksheetContent, result: RegionResult): string {
  if (result.name && result.name.trim()) return result.name.trim();
  const region = findRegion(content, result.id);
  if (region?.type === "math") return snippet(region.source) || "Math expression";
  if (region?.type === "control") {
    const control = region as ControlRegion;
    return control.label?.trim() || control.bind?.trim() || "Input control";
  }
  return "Calculation";
}

/**
 * Every region error in reading order. Walks {@link readingOrderIds} (NOT the
 * visible-only order) so an error inside a collapsed area still surfaces — the
 * one place a hidden region must still be reachable. Only regions with an
 * `error` on their result contribute.
 */
export function collectProblems(
  content: WorksheetContent,
  results: Map<string, RegionResult>,
): Problem[] {
  const out: Problem[] = [];
  for (const id of readingOrderIds(content)) {
    const result = results.get(id);
    if (!result?.error) continue;
    out.push({
      regionId: id,
      label: deriveLabel(content, result),
      kind: result.error.kind,
      message: result.error.message,
      fixHint: result.error.fixHint,
    });
  }
  return out;
}
