"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  inviteCollaboratorSchema,
  changeCollaboratorRoleSchema,
  revokeCollaboratorSchema,
  createShareLinkSchema,
} from "@/lib/schema/share";
import { getCollaborators, type CollaboratorEntry } from "@/server/queries/shared";
import type { Json } from "@/lib/supabase/types";
import { ok, err, type ActionResult } from "@/server/result";

/**
 * Sharing mutations (Func §3.8 / §4.8). Each validates with Zod, runs through
 * the RLS-scoped server client (only the sheet owner / workspace admin may write
 * grants — `worksheet_collaborators_write`), and surfaces denials in the app's
 * voice. Every successful change is recorded to `audit_log` (best-effort, so a
 * logging hiccup never fails the action) which in turn feeds the activity feed.
 */

type Client = Awaited<ReturnType<typeof createClient>>;

const NO_PERMISSION =
  "You don't have permission to manage sharing for this worksheet. Ask the owner or an admin.";
const ALREADY_SHARED = "That person already has access to this worksheet.";

/** Append an activity row. Best-effort: failures are swallowed so the primary
 * mutation (already committed) is never reported as failed over an audit hiccup. */
async function logAudit(
  supabase: Client,
  entry: {
    workspaceId: string;
    actorId: string;
    action: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      workspace_id: entry.workspaceId,
      actor_id: entry.actorId,
      action: entry.action,
      target_type: "worksheet",
      target_id: entry.targetId,
      metadata: (entry.metadata ?? {}) as Json,
    });
  } catch {
    // audit is non-critical
  }
}

/**
 * Invite someone to a worksheet by email. A workspace co-member resolves to a
 * real grant (`user_id`); anyone else becomes a *pending* invite keyed by
 * `invited_email` and is claimed by the sign-up trigger when they join.
 */
export async function inviteCollaborator(input: {
  worksheetId: string;
  email: string;
  role: "editor" | "commenter" | "viewer";
}): Promise<ActionResult<{ pending: boolean }>> {
  const parsed = inviteCollaboratorSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "We couldn't send that invite.");
  }
  const { worksheetId, email, role } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  const { data: sheet } = await supabase
    .from("worksheets")
    .select("workspace_id, owner_id")
    .eq("id", worksheetId)
    .maybeSingle();
  if (!sheet) return err("We couldn't find that worksheet.");

  // Resolve an existing person by email, case-insensitively (RLS limits this to
  // shared-workspace profiles — anyone else stays a pending email invite). LIKE
  // wildcards are escaped so the address matches literally.
  const escapedEmail = email.replace(/[%_\\]/g, "\\$&");
  const { data: matches } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", escapedEmail)
    .limit(1);
  const matchId = matches?.[0]?.id ?? null;
  if (matchId && matchId === sheet.owner_id) {
    return err("That person already owns this worksheet.");
  }

  const { error } = await supabase.from("worksheet_collaborators").insert(
    matchId
      ? { worksheet_id: worksheetId, user_id: matchId, role, share_scope: "restricted" }
      : { worksheet_id: worksheetId, invited_email: email, role, share_scope: "restricted" },
  );
  if (error) {
    if (error.code === "42501") return err(NO_PERMISSION);
    if (error.code === "23505") return err(ALREADY_SHARED);
    return err("We couldn't add that person. Try again.");
  }

  await logAudit(supabase, {
    workspaceId: sheet.workspace_id,
    actorId: user.id,
    action: "share",
    targetId: worksheetId,
    metadata: { role, pending: !matchId },
  });
  revalidatePath("/shared");
  return ok({ pending: !matchId });
}

/** Change a collaborator's role (never the owner's). */
export async function changeCollaboratorRole(input: {
  collaboratorId: string;
  role: "editor" | "commenter" | "viewer";
}): Promise<ActionResult> {
  const parsed = changeCollaboratorRoleSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "We couldn't change that role.");
  }
  const { collaboratorId, role } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  const { data: collab } = await supabase
    .from("worksheet_collaborators")
    .select("id, worksheet_id, role")
    .eq("id", collaboratorId)
    .maybeSingle();
  if (!collab) return err("That person no longer has access.");

  const { error } = await supabase
    .from("worksheet_collaborators")
    .update({ role })
    .eq("id", collaboratorId);
  if (error) {
    if (error.code === "42501") return err(NO_PERMISSION);
    return err("We couldn't change that role. Try again.");
  }

  const { data: sheet } = await supabase
    .from("worksheets")
    .select("workspace_id")
    .eq("id", collab.worksheet_id)
    .maybeSingle();
  if (sheet) {
    await logAudit(supabase, {
      workspaceId: sheet.workspace_id,
      actorId: user.id,
      action: "change_role",
      targetId: collab.worksheet_id,
      metadata: { role, from: collab.role },
    });
  }
  revalidatePath("/shared");
  return ok(undefined);
}

/** Revoke a grant (delete the collaborator row). Owner / admin only. */
export async function revokeCollaborator(input: {
  collaboratorId: string;
}): Promise<ActionResult> {
  const parsed = revokeCollaboratorSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't update access.");
  const { collaboratorId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  const { data: collab } = await supabase
    .from("worksheet_collaborators")
    .select("id, worksheet_id, role")
    .eq("id", collaboratorId)
    .maybeSingle();
  if (!collab) return ok(undefined); // already gone — treat as success

  const { error } = await supabase
    .from("worksheet_collaborators")
    .delete()
    .eq("id", collaboratorId);
  if (error) {
    if (error.code === "42501") return err(NO_PERMISSION);
    return err("We couldn't remove that access. Try again.");
  }

  const { data: sheet } = await supabase
    .from("worksheets")
    .select("workspace_id")
    .eq("id", collab.worksheet_id)
    .maybeSingle();
  if (sheet) {
    await logAudit(supabase, {
      workspaceId: sheet.workspace_id,
      actorId: user.id,
      action: "revoke_access",
      targetId: collab.worksheet_id,
      metadata: { role: collab.role },
    });
  }
  revalidatePath("/shared");
  return ok(undefined);
}

/**
 * Ensure a link-scoped grant exists for the worksheet and return its token. The
 * client copies a worksheet URL; opening link-shared sheets without sign-in is a
 * separate follow-up (see DECISIONS.md).
 */
export async function createShareLink(input: {
  worksheetId: string;
  role?: "editor" | "commenter" | "viewer";
}): Promise<ActionResult<{ token: string }>> {
  const parsed = createShareLinkSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't create a share link.");
  const { worksheetId, role } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  const { data: sheet } = await supabase
    .from("worksheets")
    .select("workspace_id")
    .eq("id", worksheetId)
    .maybeSingle();
  if (!sheet) return err("We couldn't find that worksheet.");

  const { data: existing } = await supabase
    .from("worksheet_collaborators")
    .select("link_token")
    .eq("worksheet_id", worksheetId)
    .eq("share_scope", "link")
    .limit(1);
  const current = existing?.[0]?.link_token;
  if (current) return ok({ token: current });

  const token = globalThis.crypto.randomUUID();
  const { error } = await supabase.from("worksheet_collaborators").insert({
    worksheet_id: worksheetId,
    share_scope: "link",
    role,
    link_token: token,
  });
  if (error) {
    if (error.code === "42501") return err(NO_PERMISSION);
    return err("We couldn't create a share link. Try again.");
  }

  await logAudit(supabase, {
    workspaceId: sheet.workspace_id,
    actorId: user.id,
    action: "share_link",
    targetId: worksheetId,
    metadata: { role },
  });
  revalidatePath("/shared");
  return ok({ token });
}

/** Read the access list for the Share dialog (client-callable). */
export async function loadCollaborators(
  worksheetId: string,
): Promise<ActionResult<CollaboratorEntry[]>> {
  const parsed = z.string().uuid().safeParse(worksheetId);
  if (!parsed.success) return err("We couldn't load the access list.");
  try {
    const list = await getCollaborators(parsed.data);
    return ok(list);
  } catch {
    return err("We couldn't load the access list. Try again.");
  }
}
