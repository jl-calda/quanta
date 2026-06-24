import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { TemplateFilters, TemplateTab } from "@/lib/schema/templates";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Template gallery reads (§4.4). Every query runs through the RLS-scoped server
 * client, so a user only ever sees public templates, this workspace's shared
 * templates, or templates they authored. The two tabs map to:
 *   - `all`  → public + this workspace's `workspace`-visibility templates,
 *   - `mine` → templates the signed-in user authored (`author_id = me`).
 */

export type GalleryTemplate = {
  id: string;
  title: string;
  description: string | null;
  discipline: string | null;
  standard: string | null;
  template_type: string | null;
  category: string | null;
  tags: string[];
  content: Json;
  visibility: string;
  author_id: string | null;
  authorName: string | null;
  usage_count: number;
};

export type TemplateFacets = {
  discipline: string[];
  standard: string[];
  type: string[];
  category: string[];
  // Distinct tag values across the scope (the singular key mirrors the `type`
  // group-key convention used by the FilterBar).
  tag: string[];
};

export type TemplateCounts = { all: number; mine: number };
export type WorksheetOption = { id: string; title: string };

const LIST_COLS =
  "id, title, description, discipline, standard, template_type, category, tags, content, visibility, author_id, usage_count";

/** The OR predicate for the shared ("all") gallery: public + this workspace's
 * own `workspace`-visibility templates. */
function allScopeFilter(workspaceId: string): string {
  return `visibility.eq.public,and(workspace_id.eq.${workspaceId},visibility.eq.workspace)`;
}

/** Strip characters that have meaning in PostgREST's `or()` / `ilike` grammar so
 * free-text search can't break out of the filter. `*` is the wildcard there. */
function sanitizeSearch(q: string): string {
  return q.replace(/[,()*:]/g, " ").trim();
}

/** Resolve author display names for community templates in one round-trip
 * (avoids an embedded select, which the hand-written types don't model). RLS
 * still gates which profiles are visible; the rest fall back to "Community". */
async function resolveAuthorNames(
  supabase: Client,
  authorIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (authorIds.length === 0) return out;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", authorIds);
  for (const row of data ?? []) {
    if (row.full_name) out.set(row.id, row.full_name);
  }
  return out;
}

/** The filtered, sorted list backing the grid (most-used first). */
export async function listTemplates(
  workspaceId: string,
  userId: string,
  filters: TemplateFilters,
): Promise<GalleryTemplate[]> {
  const supabase = await createClient();
  let query = supabase.from("templates").select(LIST_COLS);

  query =
    filters.tab === "mine"
      ? query.eq("author_id", userId)
      : query.or(allScopeFilter(workspaceId));

  if (filters.discipline) query = query.eq("discipline", filters.discipline);
  if (filters.standard) query = query.eq("standard", filters.standard);
  if (filters.type) query = query.eq("template_type", filters.type);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.tag) query = query.contains("tags", [filters.tag]);

  const safeQ = filters.q ? sanitizeSearch(filters.q) : "";
  if (safeQ) {
    query = query.or(`title.ilike.*${safeQ}*,description.ilike.*${safeQ}*`);
  }

  const { data } = await query
    .order("usage_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(120);

  const rows = data ?? [];
  const names = await resolveAuthorNames(
    supabase,
    [...new Set(rows.map((r) => r.author_id).filter((id): id is string => !!id))],
  );

  return rows.map((row) => ({
    ...row,
    authorName: row.author_id ? names.get(row.author_id) ?? null : null,
  }));
}

/** Distinct discipline / standard / type values present in the tab's scope —
 * the gallery renders these as the filter chip rows (data-driven). */
export async function getTemplateFacets(
  workspaceId: string,
  userId: string,
  tab: TemplateTab,
): Promise<TemplateFacets> {
  const supabase = await createClient();
  let query = supabase
    .from("templates")
    .select("discipline, standard, template_type, category, tags");
  query =
    tab === "mine"
      ? query.eq("author_id", userId)
      : query.or(allScopeFilter(workspaceId));

  const { data } = await query.limit(500);

  const distinct = (values: (string | null)[]): string[] =>
    [...new Set(values.filter((v): v is string => !!v && v.trim() !== ""))].sort(
      (a, b) => a.localeCompare(b),
    );

  const rows = data ?? [];
  return {
    discipline: distinct(rows.map((r) => r.discipline)),
    standard: distinct(rows.map((r) => r.standard)),
    type: distinct(rows.map((r) => r.template_type)),
    category: distinct(rows.map((r) => r.category)),
    tag: distinct(rows.flatMap((r) => r.tags ?? [])),
  };
}

/** Unfiltered totals for the tab labels (All vs Your templates). */
export async function getTemplateCounts(
  workspaceId: string,
  userId: string,
): Promise<TemplateCounts> {
  const supabase = await createClient();

  const allQuery = supabase
    .from("templates")
    .select("id", { count: "exact", head: true })
    .or(allScopeFilter(workspaceId));
  const mineQuery = supabase
    .from("templates")
    .select("id", { count: "exact", head: true })
    .eq("author_id", userId);

  const [all, mine] = await Promise.all([allQuery, mineQuery]);
  return { all: all.count ?? 0, mine: mine.count ?? 0 };
}

/** The user's worksheets in this workspace — feeds the "Save as template"
 * source picker. Excludes trashed sheets. */
export async function getMyWorksheets(
  workspaceId: string,
): Promise<WorksheetOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("worksheets")
    .select("id, title")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  return data ?? [];
}
