import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/server/queries/workspace";
import {
  listFolderContents,
  getProjectTree,
  getFolderCounts,
  getWorkspaceTags,
  getWorkspaceMembers,
} from "@/server/queries/files";
import { filesFiltersSchema } from "@/lib/schema/files";
import { FileBrowser } from "@/components/files/file-browser";
import type { WorkspaceRole } from "@/lib/supabase/types";

export const metadata = { title: "Worksheets · Quanta" };

const CAN_EDIT_ROLES: WorkspaceRole[] = ["owner", "admin", "engineer"];

type SearchParams = Record<string, string | string[] | undefined>;

/** Read the first value of a (possibly repeated) searchParam. */
function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * File browser (§4.5). A Server Component resolves the active workspace, parses
 * the folder/view/sort/search/facet state from the URL, and runs the RLS-scoped
 * reads in parallel before handing them to the client browser. Mutations are
 * Server Actions; RLS is the real gate, with the UI gated by role on top.
 */
export default async function WorksheetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const active = await getActiveWorkspace();
  if (!active) redirect("/onboarding");

  const workspaceId = active.workspace.id;
  const canEdit = CAN_EDIT_ROLES.includes(active.role);

  const sp = await searchParams;
  const filters = filesFiltersSchema.parse({
    folder: one(sp.folder),
    view: one(sp.view),
    sort: one(sp.sort),
    dir: one(sp.dir),
    q: one(sp.q),
    owner: one(sp.owner),
    status: one(sp.status),
    tag: one(sp.tag),
  });

  const [contents, projects, folderCounts, tags, members] = await Promise.all([
    listFolderContents(workspaceId, filters),
    getProjectTree(workspaceId),
    getFolderCounts(workspaceId),
    getWorkspaceTags(workspaceId),
    getWorkspaceMembers(workspaceId),
  ]);

  return (
    <FileBrowser
      workspaceId={workspaceId}
      canCreate={canEdit}
      canEdit={canEdit}
      folders={contents.folders}
      files={contents.files}
      projects={projects}
      folderCounts={folderCounts}
      tags={tags}
      members={members}
      filters={filters}
    />
  );
}
