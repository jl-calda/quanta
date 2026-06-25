import { z } from "zod";

/**
 * Template gallery input schemas (§4.4). `templateFilters` coerces the URL
 * searchParams that drive the filterable grid (server-rendered, shareable);
 * `saveAsTemplate` validates the "Save as template" dialog before snapshotting a
 * worksheet into a new `templates` row.
 */

/** Which slice of the gallery to show. `all` = public + workspace shared
 * templates; `mine` = templates the signed-in user authored; `public` = the
 * cross-workspace public gallery (`visibility = 'public'` only). */
export const templateTabSchema = z.enum(["all", "mine", "public"]).catch("all");
export type TemplateTab = z.infer<typeof templateTabSchema>;

/** Filters parsed from searchParams — every field optional, blanks dropped.
 * `archived` ("1"/"0") drives the curator-only archived view; it is only ever
 * honoured server-side for workspace admins, never for ordinary readers. */
export const templateFiltersSchema = z.object({
  tab: templateTabSchema,
  q: z.string().trim().max(120).optional().catch(undefined),
  discipline: z.string().trim().max(80).optional().catch(undefined),
  standard: z.string().trim().max(80).optional().catch(undefined),
  type: z.string().trim().max(80).optional().catch(undefined),
  archived: z
    .union([z.literal("1"), z.literal("0")])
    .transform((v) => v === "1")
    .optional()
    .catch(undefined),
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

/** Curation input for the admins-only feature/archive controls. Either flag may
 * be omitted (a no-op for that field); the RPC re-checks the caller is a
 * workspace admin, so this only shapes the request, never grants permission. */
export const templateCurationSchema = z.object({
  templateId: z.string().uuid("Pick a template to curate."),
  isFeatured: z.boolean().optional(),
  archived: z.boolean().optional(),
});
export type TemplateCurationInput = z.infer<typeof templateCurationSchema>;
