import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Workspace, WorkspaceRole } from "@/lib/supabase/types";

/**
 * Read-side helpers (Server Components / Server Actions). Every query runs
 * through the RLS-scoped server client, so results are already filtered to what
 * the signed-in user may see.
 */

export type CurrentUser = {
  id: string;
  email: string | null;
  profile: Profile | null;
};

/** The authenticated user + their profile row, or null when signed out. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { id: user.id, email: user.email ?? null, profile: profile ?? null };
}

export type MembershipWithWorkspace = {
  role: WorkspaceRole;
  workspace: Workspace;
};

/** Active workspaces the current user belongs to, with their role in each. */
export async function getMyWorkspaces(): Promise<MembershipWithWorkspace[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  return (data ?? [])
    .filter((row): row is { role: WorkspaceRole; workspace: Workspace } =>
      Boolean(row.workspace),
    )
    .map((row) => ({ role: row.role, workspace: row.workspace }));
}

/**
 * Resolve the workspace to show: the profile's `last_workspace_id` if the user
 * still belongs to it, otherwise their first membership, otherwise null (which
 * means onboarding — no workspace yet).
 */
export async function getActiveWorkspace(): Promise<MembershipWithWorkspace | null> {
  const [user, memberships] = await Promise.all([
    getCurrentUser(),
    getMyWorkspaces(),
  ]);
  if (memberships.length === 0) return null;

  const lastId = user?.profile?.last_workspace_id;
  const last = memberships.find((m) => m.workspace.id === lastId);
  return last ?? memberships[0];
}
