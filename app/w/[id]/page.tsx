import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseContent } from "@/lib/worksheet/content";
import { parseWorkspaceSettings } from "@/lib/schema/settings";
import { parseLayoutSettings, parsePageSettings } from "@/lib/schema/page";
import { getWorksheetComments } from "@/server/queries/comments";
import { getEditorProjectTree } from "@/server/queries/editor";
import { getTemplateUpdateStatus } from "@/server/queries/templates";
import { EditorApp } from "@/components/editor/editor-app";
import { avatarColor, initialsOf, type PresenceUser } from "@/components/editor/presence";

export const metadata = { title: "Worksheet · Quanta" };

/**
 * Worksheet editor (/w/[id]). A Server Component loads the sheet (RLS-checked)
 * and the caller's effective worksheet role, then hydrates the client editor
 * with the content tree + an edit/read-only flag. The editor owns its own
 * chrome, so the global AppBar is suppressed on `/w` (see ConditionalAppBar).
 */
export default async function WorksheetEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: worksheet } = await supabase
    .from("worksheets")
    .select("id, title, content, calc_mode, units_system, workspace_id, project_id, page_settings, layout_settings")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!worksheet || !user) notFound();

  // Effective worksheet role decides read-only vs. full editing (UI gate; RLS
  // enforces the same on every mutation).
  const { data: role } = await supabase.rpc("worksheet_effective_role", { sheet: id });
  const canEdit = role === "owner" || role === "editor";
  // Commenting (the comments panel) is open to commenter+ — mirrors
  // `comments_insert` RLS.
  const canComment = canEdit || role === "commenter";

  // Managing sharing (the Share dialog) is reserved for the sheet owner or a
  // workspace admin — mirrors `worksheet_collaborators_write`.
  let canManage = role === "owner";
  if (!canManage) {
    const { data: admin } = await supabase.rpc("is_workspace_admin", {
      ws: worksheet.workspace_id,
    });
    canManage = admin === true;
  }

  // Export/print is gated to view+ access (Func §4.10). Editors/owners always
  // may; plain viewers/commenters only when the workspace enables it.
  let canExport = canEdit;
  if (!canExport && (role === "viewer" || role === "commenter")) {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("settings")
      .eq("id", worksheet.workspace_id)
      .maybeSingle();
    canExport = parseWorkspaceSettings(ws?.settings).allowViewerExport;
  }

  const meta = user.user_metadata as { full_name?: string } | null;
  const name = meta?.full_name || user.email || "You";
  const me: PresenceUser = {
    userId: user.id,
    name,
    initials: initialsOf(name),
    color: avatarColor(user.id),
  };

  // Comments for the app-bar comments panel + its open-count badge (RLS-scoped),
  // and the project tree for the left panel's Files tab — fetched together.
  const [initialComments, projectTree] = await Promise.all([
    getWorksheetComments(id),
    getEditorProjectTree(worksheet.workspace_id),
  ]);

  // The worksheet's display unit-system is persisted in layout_settings (the
  // status-bar selector writes it there); legacy sheets fall back to SI, which is
  // what they displayed before the selector was wired to re-convert.
  const layoutSettings = parseLayoutSettings(worksheet.layout_settings);

  const content = parseContent(worksheet.content);
  // When the sheet was created from a template, check whether that template has
  // since published a newer revision (notify-only banner). RLS-scoped read.
  const templateUpdate = content.origin
    ? await getTemplateUpdateStatus(content.origin)
    : null;

  return (
    <EditorApp
      worksheet={{
        id: worksheet.id,
        title: worksheet.title,
        content,
        calcMode: worksheet.calc_mode,
        unitsSystem: layoutSettings.unitSystem,
        projectId: worksheet.project_id,
        workspaceId: worksheet.workspace_id,
        pageSettings: parsePageSettings(worksheet.page_settings),
        layoutSettings,
      }}
      projectTree={projectTree}
      canEdit={canEdit}
      canManage={canManage}
      canExport={canExport}
      canComment={canComment}
      initialComments={initialComments}
      me={me}
      templateUpdate={templateUpdate}
    />
  );
}
