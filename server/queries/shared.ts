import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CalcStatus,
  ShareScope,
  WorksheetRole,
  WorkspaceRole,
} from "@/lib/supabase/types";
import { effectiveWorksheetRole } from "@/lib/worksheet/roles";
import {
  buildActivityItems,
  type ActivityItem,
  type RawAudit,
} from "@/lib/worksheet/activity";

/**
 * Shared-page reads (Func §3.8 / §4.8). Every query runs through the RLS-scoped
 * server client and is narrowed to the active workspace; worksheet reads exclude
 * soft-deleted rows. Owner/recipient/actor profiles are resolved in a single
 * `.in(...)` hop and stitched in JS (the proven `files.ts` pattern — the
 * hand-written types don't model embedded selects). The viewer's *effective*
 * role is computed in code (mirroring `worksheet_effective_role`) to avoid an
 * N+1 of RPC calls; RLS remains the real gate.
 */

type Client = Awaited<ReturnType<typeof createClient>>;

type ProfileLite = { name: string | null; avatarUrl: string | null; email: string | null };

export type SharedWithMeRow = {
  collaboratorId: string;
  worksheetId: string;
  title: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  /** Effective worksheet role for the current viewer. */
  role: WorksheetRole;
  shareScope: ShareScope;
  calcStatus: CalcStatus;
  errorCount: number;
  updatedAt: string;
};

export type SharedRecipient = {
  /** Profile id (active) or invited email / row id (pending) — stable React key. */
  id: string;
  name: string;
  avatarUrl: string | null;
  pending: boolean;
};

export type SharedByMeRow = {
  worksheetId: string;
  title: string;
  recipients: SharedRecipient[];
  recipientCount: number;
  calcStatus: CalcStatus;
  errorCount: number;
  updatedAt: string;
  /** True when the sheet carries a link-scoped grant. */
  linkShared: boolean;
};

export type CollaboratorEntry = {
  /** Collaborator row id; null for the owner pseudo-row. */
  id: string | null;
  userId: string | null;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: WorksheetRole;
  status: "active" | "pending";
  shareScope: ShareScope;
  isOwner: boolean;
};

/** Resolve display name / avatar / email for a set of profile ids in one hop. */
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

const byUpdatedDesc = (a: { updatedAt: string }, b: { updatedAt: string }) =>
  a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;

/**
 * Worksheets explicitly shared *with* the current user in this workspace — their
 * own grant, the owner, their effective role, calc status, and last activity.
 * Sheets the viewer owns are excluded (those live under "Shared by me").
 */
export async function getSharedWithMe(
  workspaceId: string,
  workspaceRole: WorkspaceRole,
): Promise<SharedWithMeRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: grants } = await supabase
    .from("worksheet_collaborators")
    .select("id, worksheet_id, role, share_scope")
    .eq("user_id", user.id);
  const grantRows = grants ?? [];
  if (grantRows.length === 0) return [];

  const sheetIds = [...new Set(grantRows.map((g) => g.worksheet_id))];
  const { data: sheets } = await supabase
    .from("worksheets")
    .select("id, title, owner_id, calc_status, error_count, updated_at")
    .in("id", sheetIds)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);
  const sheetById = new Map((sheets ?? []).map((s) => [s.id, s]));

  const owners = await resolveProfiles(
    supabase,
    (sheets ?? []).map((s) => s.owner_id),
  );

  const out: SharedWithMeRow[] = [];
  for (const g of grantRows) {
    const s = sheetById.get(g.worksheet_id);
    if (!s) continue; // not in this workspace, or soft-deleted
    if (s.owner_id === user.id) continue; // own sheet → "Shared by me"
    const owner = s.owner_id ? owners.get(s.owner_id) : undefined;
    out.push({
      collaboratorId: g.id,
      worksheetId: s.id,
      title: s.title,
      ownerId: s.owner_id,
      ownerName: owner?.name ?? null,
      ownerAvatarUrl: owner?.avatarUrl ?? null,
      role: effectiveWorksheetRole(g.role, workspaceRole) ?? g.role,
      shareScope: g.share_scope,
      calcStatus: s.calc_status,
      errorCount: s.error_count,
      updatedAt: s.updated_at,
    });
  }
  out.sort(byUpdatedDesc);
  return out;
}

/**
 * Worksheets the current user owns that they've shared with at least one person
 * (or via a link). Each row carries its recipients (resolved profiles or pending
 * email invites), calc status, and last activity.
 */
export async function getSharedByMe(workspaceId: string): Promise<SharedByMeRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sheets } = await supabase
    .from("worksheets")
    .select("id, title, calc_status, error_count, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("owner_id", user.id)
    .is("deleted_at", null);
  const sheetRows = sheets ?? [];
  if (sheetRows.length === 0) return [];

  const ids = sheetRows.map((s) => s.id);
  const { data: collabs } = await supabase
    .from("worksheet_collaborators")
    .select("id, worksheet_id, user_id, invited_email, share_scope")
    .in("worksheet_id", ids);
  const collabRows = collabs ?? [];

  const byWorksheet = new Map<string, typeof collabRows>();
  for (const c of collabRows) {
    const arr = byWorksheet.get(c.worksheet_id) ?? [];
    arr.push(c);
    byWorksheet.set(c.worksheet_id, arr);
  }

  const profiles = await resolveProfiles(
    supabase,
    collabRows.map((c) => c.user_id),
  );

  const out: SharedByMeRow[] = [];
  for (const s of sheetRows) {
    const cs = byWorksheet.get(s.id) ?? [];
    if (cs.length === 0) continue; // not shared
    const recipients: SharedRecipient[] = [];
    for (const c of cs) {
      if (c.user_id) {
        const p = profiles.get(c.user_id);
        recipients.push({
          id: c.user_id,
          name: p?.name ?? "Member",
          avatarUrl: p?.avatarUrl ?? null,
          pending: false,
        });
      } else if (c.invited_email) {
        recipients.push({
          id: c.invited_email,
          name: c.invited_email,
          avatarUrl: null,
          pending: true,
        });
      }
      // link-scope rows carry no person — they only flip `linkShared` below.
    }
    out.push({
      worksheetId: s.id,
      title: s.title,
      recipients,
      recipientCount: recipients.length,
      calcStatus: s.calc_status,
      errorCount: s.error_count,
      updatedAt: s.updated_at,
      linkShared: cs.some((c) => c.share_scope === "link"),
    });
  }
  out.sort(byUpdatedDesc);
  return out;
}

/**
 * Everyone with access to a worksheet — the owner first, then each collaborator
 * grant (active members + pending email invites). Drives the Share dialog. Skips
 * link-scope rows (those aren't people). RLS lets anyone with access read this.
 */
export async function getCollaborators(worksheetId: string): Promise<CollaboratorEntry[]> {
  const supabase = await createClient();
  const { data: sheet } = await supabase
    .from("worksheets")
    .select("id, owner_id")
    .eq("id", worksheetId)
    .maybeSingle();
  if (!sheet) return [];

  const { data: collabs } = await supabase
    .from("worksheet_collaborators")
    .select("id, user_id, invited_email, role, share_scope")
    .eq("worksheet_id", worksheetId);
  const collabRows = (collabs ?? []).filter(
    (c) => c.share_scope !== "link" && (c.user_id || c.invited_email),
  );

  const profiles = await resolveProfiles(supabase, [
    sheet.owner_id,
    ...collabRows.map((c) => c.user_id),
  ]);

  const out: CollaboratorEntry[] = [];
  if (sheet.owner_id) {
    const p = profiles.get(sheet.owner_id);
    out.push({
      id: null,
      userId: sheet.owner_id,
      name: p?.name ?? "Owner",
      email: p?.email ?? null,
      avatarUrl: p?.avatarUrl ?? null,
      role: "owner",
      status: "active",
      shareScope: "restricted",
      isOwner: true,
    });
  }
  for (const c of collabRows) {
    if (c.user_id && c.user_id === sheet.owner_id) continue; // owner already listed
    if (c.user_id) {
      const p = profiles.get(c.user_id);
      out.push({
        id: c.id,
        userId: c.user_id,
        name: p?.name ?? "Member",
        email: p?.email ?? null,
        avatarUrl: p?.avatarUrl ?? null,
        role: c.role,
        status: "active",
        shareScope: c.share_scope,
        isOwner: false,
      });
    } else {
      out.push({
        id: c.id,
        userId: null,
        name: c.invited_email as string,
        email: c.invited_email,
        avatarUrl: null,
        role: c.role,
        status: "pending",
        shareScope: c.share_scope,
        isOwner: false,
      });
    }
  }
  return out;
}

/**
 * Recent collaboration activity across the given worksheets — comments, version
 * snapshots, and share/role audit events — folded into one time-sorted feed.
 */
export async function getSharedActivity(
  workspaceId: string,
  worksheetIds: string[],
  titlesById: Map<string, string>,
): Promise<ActivityItem[]> {
  if (worksheetIds.length === 0) return [];
  const supabase = await createClient();

  const [{ data: comments }, { data: versions }, { data: audits }] = await Promise.all([
    supabase
      .from("comments")
      .select("id, worksheet_id, author_id, body, resolved, created_at")
      .in("worksheet_id", worksheetIds)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("worksheet_versions")
      .select("id, worksheet_id, created_by, label, created_at")
      .in("worksheet_id", worksheetIds)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("audit_log")
      .select("id, actor_id, action, target_id, metadata, created_at")
      .eq("workspace_id", workspaceId)
      .eq("target_type", "worksheet")
      .in("target_id", worksheetIds)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const commentRows = comments ?? [];
  const versionRows = versions ?? [];
  const auditRows = (audits ?? []).map(
    (a): RawAudit => ({
      id: a.id,
      actor_id: a.actor_id,
      action: a.action,
      target_id: a.target_id,
      metadata: (a.metadata as Record<string, unknown> | null) ?? null,
      created_at: a.created_at,
    }),
  );

  const actorIds = [
    ...commentRows.map((c) => c.author_id),
    ...versionRows.map((v) => v.created_by),
    ...auditRows.map((a) => a.actor_id),
  ];
  const profiles = await resolveProfiles(supabase, actorIds);
  const namesById = new Map<string, string>();
  for (const [id, p] of profiles) namesById.set(id, p.name ?? "Someone");

  return buildActivityItems({
    comments: commentRows,
    versions: versionRows,
    audits: auditRows,
    titlesById,
    namesById,
  });
}
