import { redirect } from "next/navigation";
import { getActiveWorkspace, getCurrentUser } from "@/server/queries/workspace";
import { firstName } from "@/components/dashboard/format";
import {
  parseUserPreferences,
  parseWorkspaceSettings,
} from "@/lib/schema/settings";
import { SettingsApp } from "@/components/settings/settings-app";

/**
 * Settings (§4.7). Per-user prefs live on `profiles.preferences`; per-workspace
 * defaults (new-worksheet seed) live on `workspaces.settings` and are editable by
 * owner/admin only. Server Component reads the data and RLS-scoped role; the
 * interactive surface is the client island.
 */
export default async function SettingsPage() {
  const active = await getActiveWorkspace();
  if (!active) redirect("/onboarding");

  const user = await getCurrentUser();

  const workspaceSettings = parseWorkspaceSettings(active.workspace.settings);
  const userPrefs = parseUserPreferences(user?.profile?.preferences);
  const canEditWorkspace = active.role === "owner" || active.role === "admin";

  const userName =
    user?.profile?.full_name ?? firstName(user?.email) ?? "You";

  return (
    <SettingsApp
      workspaceId={active.workspace.id}
      workspaceName={active.workspace.name}
      userName={userName}
      canEditWorkspace={canEditWorkspace}
      initialWorkspace={workspaceSettings}
      initialKeymap={userPrefs.keymap}
    />
  );
}
