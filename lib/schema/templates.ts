import { z } from "zod";

/**
 * Template gallery input schemas (§4.4). `templateFilters` coerces the URL
 * searchParams that drive the filterable grid (server-rendered, shareable);
 * `saveAsTemplate` validates the "Save as template" dialog before snapshotting a
 * worksheet into a new `templates` row.
 */

/** Which slice of the gallery to show. `all` = public + workspace shared
 * templates; `mine` = templates the signed-in user authored. */
export const templateTabSchema = z.enum(["all", "mine"]).catch("all");
export type TemplateTab = z.infer<typeof templateTabSchema>;

/** Filters parsed from searchParams — every field optional, blanks dropped. */
export const templateFiltersSchema = z.object({
  tab: templateTabSchema,
  q: z.string().trim().max(120).optional().catch(undefined),
  discipline: z.string().trim().max(80).optional().catch(undefined),
  standard: z.string().trim().max(80).optional().catch(undefined),
  type: z.string().trim().max(80).optional().catch(undefined),
});
export type TemplateFilters = z.infer<typeof templateFiltersSchema>;

/** Visibility scope offered in the "Save as template" dialog. `author` is the
 * UI label for the stored `private` visibility (visible only to the author). */
export const templateScopeSchema = z.enum(["author", "workspace", "public"]);
export type TemplateScope = z.infer<typeof templateScopeSchema>;

export const saveAsTemplateSchema = z.object({
  workspaceId: z.string().uuid("Pick a workspace."),
  worksheetId: z.string().uuid("Pick a worksheet to base the template on."),
  title: z.string().trim().min(1, "Give the template a title.").max(200),
  description: z.string().trim().max(500).optional(),
  discipline: z.string().trim().max(80).optional(),
  standard: z.string().trim().max(80).optional(),
  templateType: z.string().trim().max(80).optional(),
  scope: templateScopeSchema,
});
export type SaveAsTemplateInput = z.infer<typeof saveAsTemplateSchema>;

/** Map the UI scope to the stored `templates.visibility` value. */
export function scopeToVisibility(scope: TemplateScope): string {
  return scope === "author" ? "private" : scope;
}
