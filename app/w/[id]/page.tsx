import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseContent } from "@/lib/worksheet/content";
import { EditorApp } from "@/components/editor/editor-app";
import { avatarColor, initialsOf, type PresenceUser } from "@/components/editor/use-presence";

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
    .select("id, title, content, calc_mode, units_system, workspace_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!worksheet || !user) notFound();

  // Effective worksheet role decides read-only vs. full editing (UI gate; RLS
  // enforces the same on every mutation).
  const { data: role } = await supabase.rpc("worksheet_effective_role", { sheet: id });
  const canEdit = role === "owner" || role === "editor";

  // Managing sharing (the Share dialog) is reserved for the sheet owner or a
  // workspace admin — mirrors `worksheet_collaborators_write`.
  let canManage = role === "owner";
  if (!canManage) {
    const { data: admin } = await supabase.rpc("is_workspace_admin", {
      ws: worksheet.workspace_id,
    });
    canManage = admin === true;
  }

  const meta = user.user_metadata as { full_name?: string } | null;
  const name = meta?.full_name || user.email || "You";
  const me: PresenceUser = {
    userId: user.id,
    name,
    initials: initialsOf(name),
    color: avatarColor(user.id),
  };

  return (
    <EditorApp
      worksheet={{
        id: worksheet.id,
        title: worksheet.title,
        content: parseContent(worksheet.content),
        calcMode: worksheet.calc_mode,
        unitsSystem: worksheet.units_system,
      }}
      canEdit={canEdit}
      canManage={canManage}
      me={me}
    />
  );
}
