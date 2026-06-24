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
  category: z.string().trim().max(80).optional().catch(undefined),
  tag: z.string().trim().max(40).optional().catch(undefined),
});
export type TemplateFilters = z.infer<typeof templateFiltersSchema>;

/** Visibility scope offered in the "Save as template" dialog. `author` is the
 * UI label for the stored `private` visibility (visible only to the author). */
export const templateScopeSchema = z.enum(["author", "workspace", "public"]);
export type TemplateScope = z.infer<typeof templateScopeSchema>;

/** Upper bound on tags per template — keeps the chip row and `tags[]` sane. */
export const MAX_TEMPLATE_TAGS = 12;

export const saveAsTemplateSchema = z.object({
  workspaceId: z.string().uuid("Pick a workspace."),
  worksheetId: z.string().uuid("Pick a worksheet to base the template on."),
  title: z.string().trim().min(1, "Give the template a title.").max(200),
  description: z.string().trim().max(500).optional(),
  discipline: z.string().trim().max(80).optional(),
  standard: z.string().trim().max(80).optional(),
  templateType: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(MAX_TEMPLATE_TAGS, `Use at most ${MAX_TEMPLATE_TAGS} tags.`)
    .optional(),
  scope: templateScopeSchema,
});
export type SaveAsTemplateInput = z.infer<typeof saveAsTemplateSchema>;

/**
 * Parse a comma-separated tag string (from the "Save as template" dialog) into a
 * clean array: trimmed, blanks dropped, case-insensitively de-duplicated, and
 * capped at {@link MAX_TEMPLATE_TAGS}. Pure so it can be unit-tested and shared.
 */
export function parseTagsInput(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TEMPLATE_TAGS) break;
  }
  return out;
}

/** Map the UI scope to the stored `templates.visibility` value. */
export function scopeToVisibility(scope: TemplateScope): string {
  return scope === "author" ? "private" : scope;
}
