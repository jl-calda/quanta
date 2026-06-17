import { workspaceRoleLabel } from "@/lib/workspace/capabilities";
import type { WorkspaceRole } from "@/lib/supabase/types";

/**
 * Audit-log model for the Workspace admin "Audit log" screen (Func §4.11). Pure
 * and deterministic so it can be unit-tested away from Supabase: the server query
 * resolves the rows + actor names and hands them here; the section component only
 * renders. Mirrors `lib/worksheet/activity.ts` in spirit — one formatter that maps
 * a raw `audit_log` row to a display label + tone + target.
 */

export type AuditTone = "accent" | "pass" | "warning" | "error" | "muted";

export interface RawAuditEntry {
  id: number | string;
  actor_id: string | null;
  action: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  /** ISO timestamp; the section formats it for display. */
  time: string;
  actorName: string;
  /** Human action label, e.g. "Changed member role". */
  label: string;
  /** Right-hand target/detail, e.g. "r.vasquez → Engineer". */
  target: string;
  tone: AuditTone;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function roleLabel(value: unknown): string | null {
  const s = str(value);
  return s ? workspaceRoleLabel(s as WorkspaceRole) : null;
}

/** Map one raw audit row to its display shape. `namesById` resolves actor names. */
export function formatAuditEntry(
  raw: RawAuditEntry,
  namesById: Map<string, string>,
): AuditEntry {
  const actorName = (raw.actor_id && namesById.get(raw.actor_id)) || "System";
  const meta = raw.metadata ?? {};
  const email = str(meta.email);
  const role = roleLabel(meta.role);
  const fromRole = roleLabel(meta.from);

  let label: string;
  let target = "";
  let tone: AuditTone = "muted";

  switch (raw.action) {
    case "invite_member":
      label = "Invited member";
      target = [email, role].filter(Boolean).join(" · ");
      tone = "accent";
      break;
    case "change_role":
      label = "Changed member role";
      target = [email, fromRole && role ? `${fromRole} → ${role}` : role]
        .filter(Boolean)
        .join(" · ");
      tone = "warning";
      break;
    case "transfer_ownership": {
      label = "Transferred ownership";
      const count = typeof meta.count === "number" ? meta.count : null;
      target = [email, count != null ? `${count} worksheet${count === 1 ? "" : "s"}` : null]
        .filter(Boolean)
        .join(" · ");
      tone = "accent";
      break;
    }
    case "suspend_member":
      label = "Suspended member";
      target = email ?? "";
      tone = "warning";
      break;
    case "reactivate_member":
      label = "Reactivated member";
      target = email ?? "";
      tone = "pass";
      break;
    case "remove_member":
      label = "Removed member";
      target = [email, role].filter(Boolean).join(" · ");
      tone = "error";
      break;
    case "revoke_invite":
      label = "Revoked invite";
      target = email ?? "";
      tone = "muted";
      break;
    case "resend_invite":
      label = "Re-sent invite";
      target = email ?? "";
      tone = "muted";
      break;
    // Worksheet-scoped actions also land in audit_log (written by share.ts).
    case "share":
      label = "Shared worksheet";
      target = role ? `Role: ${role}` : "";
      tone = "pass";
      break;
    case "share_link":
      label = "Created share link";
      tone = "pass";
      break;
    case "change_role_worksheet":
      label = "Changed worksheet access";
      target = role ? `New role: ${role}` : "";
      tone = "accent";
      break;
    case "revoke_access":
      label = "Removed worksheet access";
      tone = "muted";
      break;
    default:
      label = str(raw.action) ?? "Activity";
      tone = "muted";
      break;
  }

  return {
    id: `audit:${raw.id}`,
    time: raw.created_at,
    actorName,
    label,
    target,
    tone,
  };
}

/** Format a list of raw rows, newest first. */
export function formatAuditEntries(
  raws: RawAuditEntry[],
  namesById: Map<string, string>,
): AuditEntry[] {
  return raws
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    .map((r) => formatAuditEntry(r, namesById));
}
