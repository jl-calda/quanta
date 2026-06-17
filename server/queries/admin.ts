import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MemberStatus, WorkspaceRole } from "@/lib/supabase/types";
import { workspaceRoleRank } from "@/lib/workspace/capabilities";
import {
  formatAuditEntries,
  type AuditEntry,
  type RawAuditEntry,
} from "@/lib/workspace/audit";

/**
 * Workspace-admin reads (Func §4.11). Every query runs through the RLS-scoped
 * server client (members + audit_log are readable by any active member; the
 * mutations stay owner/admin-only). Profiles are resolved in one `.in(...)` hop
 * and stitched in JS (the proven `shared.ts` pattern — the hand-written types
 * don't model embedded selects).
 */

type Client = Awaited<ReturnType<typeof createClient>>;

type ProfileLite = { name: string | null; avatarUrl: string | null; email: string | null };

export type AdminMember = {
  /** workspace_members row id. */
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: WorkspaceRole;
  status: MemberStatus;
  invitedBy: string | null;
  createdAt: string;
  /** Count of non-deleted worksheets this member owns in the workspace. */
  worksheetsOwned: number;
  /** ISO of the member's most recent audit entry, or null. */
  lastActiveAt: string | null;
};

export type SeatUsage = { used: number; total: number };

async function resolveProfiles(
  supabase: Client,
  ids: (string | null)[],
): Promise<Map<string, ProfileLite>> {
  const out = new Map<string, ProfileLite>();
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return out;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email")
    .in("id", unique);
  for (const row of data ?? []) {
    out.set(row.id, { name: row.full_name, avatarUrl: row.avatar_url, email: row.email });
  }
  return out;
}

/** actor_id → latest audit `created_at`, over a bounded recent window. */
async function lastActiveByUser(
  supabase: Client,
  workspaceId: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const { data } = await supabase
    .from("audit_log")
    .select("actor_id, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1000);
  for (const row of data ?? []) {
    // Rows arrive newest-first, so the first time we see an actor is their latest.
    if (row.actor_id && !out.has(row.actor_id)) out.set(row.actor_id, row.created_at);
  }
  return out;
}

/**
 * Everyone in the workspace — active members, pending invites, and suspended —
 * with their profile, role, owned-worksheet count, and last-active time. Sorted
 * strongest role first, then name.
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<AdminMember[]> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("workspace_members")
    .select("id, user_id, role, status, invited_email, invited_by, created_at")
    .eq("workspace_id", workspaceId);
  const members = rows ?? [];
  if (members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);

  const [profiles, lastActive, ownedCounts] = await Promise.all([
    resolveProfiles(supabase, userIds),
    lastActiveByUser(supabase, workspaceId),
    ownedWorksheetCounts(supabase, workspaceId, userIds),
  ]);

  const out: AdminMember[] = members.map((m) => {
    const p = m.user_id ? profiles.get(m.user_id) : undefined;
    const name = p?.name ?? m.invited_email ?? "Pending invite";
    return {
      id: m.id,
      userId: m.user_id,
      name,
      email: p?.email ?? m.invited_email,
      avatarUrl: p?.avatarUrl ?? null,
      role: m.role,
      status: m.status,
      invitedBy: m.invited_by,
      createdAt: m.created_at,
      worksheetsOwned: m.user_id ? (ownedCounts.get(m.user_id) ?? 0) : 0,
      lastActiveAt: m.user_id ? (lastActive.get(m.user_id) ?? null) : null,
    };
  });

  out.sort((a, b) => {
    const r = workspaceRoleRank(b.role) - workspaceRoleRank(a.role);
    if (r !== 0) return r;
    return a.name.localeCompare(b.name);
  });
  return out;
}

/** user_id → count of non-deleted worksheets they own in the workspace. */
async function ownedWorksheetCounts(
  supabase: Client,
  workspaceId: string,
  userIds: (string | null)[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = [...new Set(userIds.filter((id): id is string => !!id))];
  if (unique.length === 0) return out;
  const { data } = await supabase
    .from("worksheets")
    .select("owner_id")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .in("owner_id", unique);
  for (const row of data ?? []) {
    if (row.owner_id) out.set(row.owner_id, (out.get(row.owner_id) ?? 0) + 1);
  }
  return out;
}

/** Seats consumed (active members) vs the workspace's seat allowance. */
export async function getSeatUsage(workspaceId: string): Promise<SeatUsage> {
  const supabase = await createClient();
  const [{ count }, { data: ws }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
    supabase.from("workspaces").select("seats").eq("id", workspaceId).maybeSingle(),
  ]);
  return { used: count ?? 0, total: ws?.seats ?? 0 };
}

/** Recent workspace audit entries, formatted for the Audit log section. */
export async function getAuditLog(
  workspaceId: string,
  limit = 100,
): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, actor_id, action, target_type, target_id, metadata, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []).map(
    (a): RawAuditEntry => ({
      id: a.id,
      actor_id: a.actor_id,
      action: a.action,
      target_type: a.target_type,
      target_id: a.target_id,
      metadata: (a.metadata as Record<string, unknown> | null) ?? null,
      created_at: a.created_at,
    }),
  );

  const names = await resolveProfiles(
    supabase,
    rows.map((r) => r.actor_id),
  );
  const namesById = new Map<string, string>();
  for (const [id, p] of names) namesById.set(id, p.name ?? "Someone");

  return formatAuditEntries(rows, namesById);
}

export type OwnershipImpact = {
  ownedCount: number;
  eligibleOwners: { id: string; name: string }[];
};

/**
 * For the ownership-transfer prompt: how many worksheets a member owns, and the
 * other active owner/admin members they could be transferred to.
 */
export async function getOwnershipImpact(
  memberId: string,
  workspaceId: string,
): Promise<OwnershipImpact> {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!member?.user_id) return { ownedCount: 0, eligibleOwners: [] };

  const [{ count }, { data: admins }] = await Promise.all([
    supabase
      .from("worksheets")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .eq("owner_id", member.user_id),
    supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .neq("user_id", member.user_id),
  ]);

  const candidateIds = (admins ?? [])
    .map((a) => a.user_id)
    .filter((id): id is string => !!id);
  const profiles = await resolveProfiles(supabase, candidateIds);
  const eligibleOwners = candidateIds.map((id) => ({
    id,
    name: profiles.get(id)?.name ?? "Member",
  }));

  return { ownedCount: count ?? 0, eligibleOwners };
}
