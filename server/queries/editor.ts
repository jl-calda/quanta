import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildWorksheetTree, type ProjectTree } from "@/lib/worksheet/project-tree";
import { getProjectTree } from "./files";

/**
 * Editor reads. The Files tab (Func 5.3) shows the workspace's project tree with
 * the current sheet highlighted, so the editor page loads the projects +
 * worksheets and assembles the tree server-side (the established RLS-scoped
 * pattern; no client Supabase calls). RLS narrows both reads to workspaces the
 * user can see; soft-deleted sheets are excluded. The project read is the same
 * `cache()`d query the file browser uses, so it's shared within a request.
 */
export async function getEditorProjectTree(
  workspaceId: string,
): Promise<ProjectTree> {
  const supabase = await createClient();
  const [projects, { data: sheets }] = await Promise.all([
    getProjectTree(workspaceId),
    supabase
      .from("worksheets")
      .select("id, title, project_id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("title", { ascending: true }),
  ]);
  return buildWorksheetTree(projects, sheets ?? []);
}
