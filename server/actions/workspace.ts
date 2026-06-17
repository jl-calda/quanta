"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createWorkspaceSchema,
  switchWorkspaceSchema,
} from "@/lib/schema/workspace";
import { ok, err, fieldErrorsFromZod, type ActionResult } from "@/server/result";

/**
 * Create a workspace and make the caller its owner. Used by the first-run
 * onboarding flow (§4.1) and by "New workspace". The sign-up trigger already
 * bootstraps a default workspace, so this is for explicit creation / renaming
 * the handle.
 */
export async function createWorkspace(
  formData: FormData,
): Promise<ActionResult<{ workspaceId: string; slug: string }>> {
  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error.issues),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name: parsed.data.name, slug: parsed.data.slug, owner_id: user.id })
    .select("id, slug")
    .single();

  if (wsError || !workspace) {
    if (wsError?.code === "23505") {
      return err("That workspace handle is taken. Try another.", {
        slug: "That handle is taken.",
      });
    }
    return err("We couldn't create the workspace. Try again.");
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    });
  if (memberError) {
    return err("We created the workspace but couldn't add you as owner. Try again.");
  }

  await supabase
    .from("profiles")
    .update({ last_workspace_id: workspace.id })
    .eq("id", user.id);

  revalidatePath("/app");
  return ok({ workspaceId: workspace.id, slug: workspace.slug });
}

/** Switch the active workspace by recording it on the profile. */
export async function switchWorkspace(
  workspaceId: string,
): Promise<ActionResult> {
  const parsed = switchWorkspaceSchema.safeParse({ workspaceId });
  if (!parsed.success) return err("Pick a workspace to switch to.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  // Confirm active membership before recording it (RLS also enforces this).
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("workspace_id", parsed.data.workspaceId)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) return err("You're not a member of that workspace.");

  await supabase
    .from("profiles")
    .update({ last_workspace_id: parsed.data.workspaceId })
    .eq("id", user.id);

  revalidatePath("/app");
  return ok(undefined);
}
