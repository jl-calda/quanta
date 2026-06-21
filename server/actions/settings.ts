"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  userPreferencesPatchSchema,
  workspaceSettingsSchema,
} from "@/lib/schema/settings";
import { parseUserPreferences } from "@/lib/schema/settings";
import { ok, err, type ActionResult } from "@/server/result";
import type { WorkspaceSettings } from "@/lib/settings/types";
import type { UserPreferences } from "@/lib/settings/types";

/**
 * Settings mutations (Func §4.7). Workspace defaults seed NEW worksheets and are
 * owner/admin-only (RLS `workspaces_update` is the hard gate; we also check the
 * role here to return the message in the app's voice). Per-user prefs write the
 * caller's own profile (RLS `profiles_update` gates to self).
 */

/** Save the workspace's new-worksheet defaults. Owner/admin only. */
export async function updateWorkspaceSettings(
  workspaceId: string,
  settings: WorkspaceSettings,
): Promise<ActionResult> {
  const parsed = workspaceSettingsSchema.safeParse(settings);
  if (!parsed.success) {
    return err("Those settings don't look right. Check the highlighted fields.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  // App-voice role gate on top of RLS.
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return err("Only owners and admins can change workspace defaults.");
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ settings: parsed.data })
    .eq("id", workspaceId);

  if (error) {
    if (error.code === "42501") {
      return err("Only owners and admins can change workspace defaults.");
    }
    return err("We couldn't save the workspace defaults. Try again.");
  }

  revalidatePath("/settings");
  return ok(undefined);
}

/**
 * Save a patch of the caller's per-user preferences (theme / density / keymap),
 * merged over what's already stored on the profile.
 */
export async function updateUserPreferences(
  patch: Partial<UserPreferences>,
): Promise<ActionResult> {
  const parsed = userPreferencesPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return err("That preference value isn't valid.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .maybeSingle();

  const current = parseUserPreferences(profile?.preferences);
  const next = { ...current, ...parsed.data };

  const { error } = await supabase
    .from("profiles")
    .update({ preferences: next })
    .eq("id", user.id);

  if (error) {
    return err("We couldn't save your preferences. Try again.");
  }

  revalidatePath("/settings");
  return ok(undefined);
}
