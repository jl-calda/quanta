/**
 * Formatting glue (Func §7.8 / §7.18) — pure helpers that write a result format
 * or a set of conditional rules into the content tree, at either region or
 * worksheet scope. The dialogs apply the returned tree through the editor
 * reducer (so it autosaves + recomputes); the live preview formats the region's
 * real value with the SAME `formatValue` / `applyConditional` the canvas uses, so
 * the preview is exactly the committed output.
 */
import { applyConditional, formatValue } from "@/lib/calc";
import type { CondRule, ResultFormat, WorksheetContent } from "./content";
import { walkRegions } from "./flatten";

export type FormatScope = "region" | "worksheet";

/** Whether a math region is in scope for the write. */
function inScope(scope: FormatScope, id: string, regionId?: string): boolean {
  return scope === "worksheet" || id === regionId;
}

/** Set the result format on one region or every math region. Returns a new tree. */
export function applyResultFormat(
  content: WorksheetContent,
  scope: FormatScope,
  format: ResultFormat,
  regionId?: string,
): WorksheetContent {
  const next = structuredClone(content);
  for (const region of walkRegions(next)) {
    if (region.type !== "math") continue;
    if (inScope(scope, region.id, regionId)) region.format = { ...format };
  }
  return next;
}

/** Set the conditional rules on one region or every math region. New tree. */
export function applyConditionalRules(
  content: WorksheetContent,
  scope: FormatScope,
  rules: CondRule[],
  regionId?: string,
): WorksheetContent {
  const next = structuredClone(content);
  for (const region of walkRegions(next)) {
    if (region.type !== "math") continue;
    if (!inScope(scope, region.id, regionId)) continue;
    region.conditional = rules.length
      ? rules.map((r) => ({ ...r, style: { ...r.style } }))
      : undefined;
  }
  return next;
}

/** Format a value with a candidate format — the same renderer the canvas uses. */
export function previewResult(value: unknown, format: ResultFormat): string {
  return formatValue(value, format);
}

/** The conditional style a value would take — the same evaluator the engine uses. */
export { applyConditional as previewConditionalStyle };
