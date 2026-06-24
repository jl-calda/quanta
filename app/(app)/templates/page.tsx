import { redirect } from "next/navigation";
import {
  getActiveWorkspace,
  getCurrentUser,
} from "@/server/queries/workspace";
import {
  listTemplates,
  getTemplateFacets,
  getTemplateCounts,
  getMyWorksheets,
} from "@/server/queries/templates";
import { templateFiltersSchema } from "@/lib/schema/templates";
import { TemplateGallery } from "@/components/templates/template-gallery";
import type { WorkspaceRole } from "@/lib/supabase/types";

export const metadata = { title: "Templates · Quanta" };

const CAN_CREATE_ROLES: WorkspaceRole[] = ["owner", "admin", "engineer"];

type SearchParams = Record<string, string | string[] | undefined>;

/** Read the first value of a (possibly repeated) searchParam. */
function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Template gallery (§4.4). A Server Component resolves the active workspace,
 * parses the category/discipline/standard/type/tag/tab/search filters from the
 * URL, and runs the RLS-scoped reads in parallel before handing them to the
 * client gallery.
 */
export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const active = await getActiveWorkspace();
  if (!active) redirect("/onboarding");

  const workspaceId = active.workspace.id;
  const canCreate = CAN_CREATE_ROLES.includes(active.role);

  const sp = await searchParams;
  const filters = templateFiltersSchema.parse({
    tab: one(sp.tab),
    q: one(sp.q),
    discipline: one(sp.discipline),
    standard: one(sp.standard),
    type: one(sp.type),
    category: one(sp.category),
    tag: one(sp.tag),
  });
  const previewId = one(sp.preview);

  const user = await getCurrentUser();
  const userId = user?.id ?? "";

  const [templates, facets, counts, worksheets] = await Promise.all([
    listTemplates(workspaceId, userId, filters),
    getTemplateFacets(workspaceId, userId, filters.tab),
    getTemplateCounts(workspaceId, userId),
    canCreate ? getMyWorksheets(workspaceId) : Promise.resolve([]),
  ]);

  return (
    <TemplateGallery
      workspaceId={workspaceId}
      canCreate={canCreate}
      worksheets={worksheets}
      templates={templates}
      facets={facets}
      counts={counts}
      tab={filters.tab}
      active={{
        discipline: filters.discipline,
        standard: filters.standard,
        type: filters.type,
        category: filters.category,
        tag: filters.tag,
      }}
      query={filters.q ?? ""}
      initialPreviewId={previewId}
    />
  );
}
