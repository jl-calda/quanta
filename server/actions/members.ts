"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  inviteMembersSchema,
  changeMemberRoleSchema,
  setMemberStatusSchema,
  memberIdSchema,
} from "@/lib/schema/workspace-members";
import { workspaceRoleRank } from "@/lib/workspace/capabilities";
import {
  getWorkspaceMembers,
  getAuditLog,
  getOwnershipImpact,
  type AdminMember,
  type OwnershipImpact,
} from "@/server/queries/admin";
import type { AuditEntry } from "@/lib/workspace/audit";
import type { Json, WorkspaceRole } from "@/lib/supabase/types";
import { ok, err, type ActionResult } from "@/server/result";

/**
 * Workspace-member mutations (Func §4.11). Each validates with Zod, runs through
 * the RLS-scoped server client (only owner/admin may write members —
 * `workspace_members_insert/update/delete`), and surfaces denials in the app's
 * voice. The `protect_last_owner` trigger is the real guard against orphaning a
 * workspace; we translate its violation into a fixable message. Every successful
 * change is recorded to `audit_log` (best-effort).
 */

type Client = Awaited<ReturnType<typeof createClient>>;

const NO_PERMISSION =
  "You don't have permission to manage members. Ask a workspace owner or admin.";
const LAST_OWNER =
  "A workspace must keep at least one owner. Make someone else an owner first.";
const SIGNED_OUT = "You're signed out. Sign in and try again.";

/** Postgres SQLSTATE for the `protect_last_owner` check violation. */
const CHECK_VIOLATION = "23514";

/** Append an activity row. Best-effort: a logging hiccup never fails the action. */
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
      target_type: "workspace_member",
      target_id: entry.targetId,
      metadata: (entry.metadata ?? {}) as Json,
    });
  } catch {
    // audit is non-critical
  }
}

/** The signed-in user, or an error result. */
async function requireUser(
  supabase: Client,
): Promise<{ id: string } | { error: ActionResult<never> }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: err(SIGNED_OUT) };
  return { id: user.id };
}

/** The caller's active role in a workspace (null when not an active member). */
async function actorRole(
  supabase: Client,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return data?.role ?? null;
}

type MemberRow = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  role: WorkspaceRole;
  status: "active" | "invited" | "suspended";
  invited_email: string | null;
};

async function loadMember(supabase: Client, memberId: string): Promise<MemberRow | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("id, workspace_id, user_id, role, status, invited_email")
    .eq("id", memberId)
    .maybeSingle();
  return (data as MemberRow | null) ?? null;
}

/** A display email for a member row, for audit metadata. */
async function memberEmail(supabase: Client, m: MemberRow): Promise<string | null> {
  if (m.invited_email) return m.invited_email;
  if (!m.user_id) return null;
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", m.user_id)
    .maybeSingle();
  return data?.email ?? null;
}

// ---------------------------------------------------------------------------
// Invite
// ---------------------------------------------------------------------------

export type InviteSummary = {
  invited: string[];
  skipped: { email: string; reason: string }[];
};

/**
 * Invite people by email. Each becomes a *pending* member (`status='invited'`,
 * `user_id=null`) claimed by the sign-up trigger (`handle_new_user`) when they
 * join. People already in the workspace (active/suspended/invited) are skipped.
 */
export async function inviteMembers(
  input: unknown,
): Promise<ActionResult<InviteSummary>> {
  const parsed = inviteMembersSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Check the invite details.");
  }
  const { workspaceId, invites } = parsed.data;

  const supabase = await createClient();
  const auth = await requireUser(supabase);
  if ("error" in auth) return auth.error;

  const role = await actorRole(supabase, workspaceId, auth.id);
  if (role !== "owner" && role !== "admin") return err(NO_PERMISSION);

  // Existing emails in the workspace (member profiles + pending invites).
  const existing = await existingEmails(supabase, workspaceId);

  const summary: InviteSummary = { invited: [], skipped: [] };
  for (const invite of invites) {
    const email = invite.email;
    if (existing.has(email.toLowerCase())) {
      summary.skipped.push({ email, reason: "Already in this workspace" });
      continue;
    }
    const { data: row, error } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        invited_email: email,
        role: invite.role,
        status: "invited",
        invited_by: auth.id,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "42501") return err(NO_PERMISSION);
      if (error.code === "23505") {
        summary.skipped.push({ email, reason: "Already invited" });
        continue;
      }
      summary.skipped.push({ email, reason: "Couldn't send" });
      continue;
    }
    existing.add(email.toLowerCase());
    summary.invited.push(email);
    if (row) {
      await logAudit(supabase, {
        workspaceId,
        actorId: auth.id,
        action: "invite_member",
        targetId: row.id,
        metadata: { email, role: invite.role },
      });
    }
  }

  if (summary.invited.length === 0 && summary.skipped.length > 0) {
    return err(
      summary.skipped.length === 1
        ? `${summary.skipped[0].email}: ${summary.skipped[0].reason.toLowerCase()}.`
        : "Those people are already in this workspace.",
    );
  }

  revalidatePath("/admin");
  return ok(summary);
}

/** Lowercased set of emails already attached to the workspace. */
async function existingEmails(
  supabase: Client,
  workspaceId: string,
): Promise<Set<string>> {
  const out = new Set<string>();
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, invited_email")
    .eq("workspace_id", workspaceId);
  const rows = members ?? [];
  for (const r of rows) {
    if (r.invited_email) out.add(r.invited_email.toLowerCase());
  }
  const userIds = rows
    .map((r) => r.user_id)
    .filter((id): id is string => !!id);
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      if (p.email) out.add(p.email.toLowerCase());
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Change role (with ownership transfer)
// ---------------------------------------------------------------------------

/**
 * Change a member's workspace role. When downgrading an owner who still owns
 * worksheets, an optional `transferTo` reassigns those worksheets first (the
 * client prompts for it). The last-owner trigger blocks orphaning the workspace.
 */
export async function changeMemberRole(input: unknown): Promise<ActionResult> {
  const parsed = changeMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "We couldn't change that role.");
  }
  const { memberId, role, transferTo } = parsed.data;

  const supabase = await createClient();
  const auth = await requireUser(supabase);
  if ("error" in auth) return auth.error;

  const member = await loadMember(supabase, memberId);
  if (!member) return err("That member is no longer in this workspace.");
  if (member.role === role) return ok(undefined);

  const callerRole = await actorRole(supabase, member.workspace_id, auth.id);
  if (callerRole !== "owner" && callerRole !== "admin") return err(NO_PERMISSION);

  const email = await memberEmail(supabase, member);
  const isDemotionFromOwner =
    member.role === "owner" && workspaceRoleRank(role) < workspaceRoleRank("owner");

  // Transfer worksheet ownership before the demotion, when asked to.
  if (isDemotionFromOwner && transferTo && member.user_id) {
    const { data: moved, error: moveError } = await supabase
      .from("worksheets")
      .update({ owner_id: transferTo })
      .eq("workspace_id", member.workspace_id)
      .eq("owner_id", member.user_id)
      .is("deleted_at", null)
      .select("id");
    if (moveError) {
      if (moveError.code === "42501") return err(NO_PERMISSION);
      return err("We couldn't transfer their worksheets. Try again.");
    }
    await logAudit(supabase, {
      workspaceId: member.workspace_id,
      actorId: auth.id,
      action: "transfer_ownership",
      targetId: member.id,
      metadata: { email, count: moved?.length ?? 0, to: transferTo },
    });
  }

  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("id", memberId);
  if (error) {
    if (error.code === "42501") return err(NO_PERMISSION);
    if (error.code === CHECK_VIOLATION) return err(LAST_OWNER);
    return err("We couldn't change that role. Try again.");
  }

  await logAudit(supabase, {
    workspaceId: member.workspace_id,
    actorId: auth.id,
    action: "change_role",
    targetId: member.id,
    metadata: { email, from: member.role, role },
  });
  revalidatePath("/admin");
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Suspend / reactivate
// ---------------------------------------------------------------------------

/** Suspend (revoke access) or reactivate a member. */
export async function setMemberStatus(input: unknown): Promise<ActionResult> {
  const parsed = setMemberStatusSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't update that member.");
  const { memberId, status } = parsed.data;

  const supabase = await createClient();
  const auth = await requireUser(supabase);
  if ("error" in auth) return auth.error;

  const member = await loadMember(supabase, memberId);
  if (!member) return err("That member is no longer in this workspace.");
  if (member.status === status) return ok(undefined);

  const callerRole = await actorRole(supabase, member.workspace_id, auth.id);
  if (callerRole !== "owner" && callerRole !== "admin") return err(NO_PERMISSION);

  const email = await memberEmail(supabase, member);

  const { error } = await supabase
    .from("workspace_members")
    .update({ status })
    .eq("id", memberId);
  if (error) {
    if (error.code === "42501") return err(NO_PERMISSION);
    if (error.code === CHECK_VIOLATION) return err(LAST_OWNER);
    return err("We couldn't update that member. Try again.");
  }

  await logAudit(supabase, {
    workspaceId: member.workspace_id,
    actorId: auth.id,
    action: status === "suspended" ? "suspend_member" : "reactivate_member",
    targetId: member.id,
    metadata: { email },
  });
  revalidatePath("/admin");
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Remove / revoke invite
// ---------------------------------------------------------------------------

/** Remove a member (or revoke a pending invite) from the workspace. */
export async function removeMember(input: unknown): Promise<ActionResult> {
  const parsed = memberIdSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't remove that member.");
  const { memberId } = parsed.data;

  const supabase = await createClient();
  const auth = await requireUser(supabase);
  if ("error" in auth) return auth.error;

  const member = await loadMember(supabase, memberId);
  if (!member) return ok(undefined); // already gone — treat as success

  const callerRole = await actorRole(supabase, member.workspace_id, auth.id);
  if (callerRole !== "owner" && callerRole !== "admin") return err(NO_PERMISSION);

  const email = await memberEmail(supabase, member);
  const pending = member.status === "invited";

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId);
  if (error) {
    if (error.code === "42501") return err(NO_PERMISSION);
    if (error.code === CHECK_VIOLATION) return err(LAST_OWNER);
    return err("We couldn't remove that member. Try again.");
  }

  await logAudit(supabase, {
    workspaceId: member.workspace_id,
    actorId: auth.id,
    action: pending ? "revoke_invite" : "remove_member",
    targetId: member.id,
    metadata: { email, role: member.role },
  });
  revalidatePath("/admin");
  return ok(undefined);
}

/**
 * Re-send a pending invite. Email delivery is out of scope for now (invites are
 * accepted on sign-in), so this records the intent and confirms in the UI.
 */
export async function resendInvite(input: unknown): Promise<ActionResult> {
  const parsed = memberIdSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't re-send that invite.");
  const { memberId } = parsed.data;

  const supabase = await createClient();
  const auth = await requireUser(supabase);
  if ("error" in auth) return auth.error;

  const member = await loadMember(supabase, memberId);
  if (!member) return err("That invite no longer exists.");
  if (member.status !== "invited") return err("That person has already joined.");

  const callerRole = await actorRole(supabase, member.workspace_id, auth.id);
  if (callerRole !== "owner" && callerRole !== "admin") return err(NO_PERMISSION);

  await logAudit(supabase, {
    workspaceId: member.workspace_id,
    actorId: auth.id,
    action: "resend_invite",
    targetId: member.id,
    metadata: { email: member.invited_email },
  });
  return ok(undefined);
}

// ---------------------------------------------------------------------------
// Client-callable readers (post-mutation refresh)
// ---------------------------------------------------------------------------

export async function loadMembers(
  workspaceId: string,
): Promise<ActionResult<AdminMember[]>> {
  const parsed = z.string().uuid().safeParse(workspaceId);
  if (!parsed.success) return err("We couldn't load the member list.");
  try {
    return ok(await getWorkspaceMembers(parsed.data));
  } catch {
    return err("We couldn't load the member list. Try again.");
  }
}

export async function loadAuditLog(
  workspaceId: string,
): Promise<ActionResult<AuditEntry[]>> {
  const parsed = z.string().uuid().safeParse(workspaceId);
  if (!parsed.success) return err("We couldn't load the audit log.");
  try {
    return ok(await getAuditLog(parsed.data));
  } catch {
    return err("We couldn't load the audit log. Try again.");
  }
}

export async function loadOwnershipImpact(
  memberId: string,
  workspaceId: string,
): Promise<ActionResult<OwnershipImpact>> {
  const parsed = z
    .object({ memberId: z.string().uuid(), workspaceId: z.string().uuid() })
    .safeParse({ memberId, workspaceId });
  if (!parsed.success) return err("We couldn't check ownership.");
  try {
    return ok(await getOwnershipImpact(parsed.data.memberId, parsed.data.workspaceId));
  } catch {
    return err("We couldn't check ownership. Try again.");
  }
}
