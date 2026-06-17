/**
 * Recent-activity model for the Shared page feed (Func §3.8). Pure and
 * deterministic so it can be unit-tested away from Supabase: `buildActivityItems`
 * folds three real signals — comments, version snapshots, and `audit_log` share
 * events — into one time-sorted, capped list. The server query resolves the rows
 * + actor names and hands them here; the feed component only renders.
 */

export type ActivityTone = "accent" | "pass" | "warning" | "muted";
export type ActivityKind = "comment" | "version" | "share";

export interface ActivityItem {
  id: string;
  actorId: string | null;
  actorName: string;
  /** Lead line after the actor's name, e.g. "commented on Anchor schedule". */
  text: string;
  /** Optional second line (quoted comment, role, version label). */
  detail: string | null;
  /** ISO timestamp. */
  time: string;
  tone: ActivityTone;
  /** Drives the small overlay glyph in the feed. */
  kind: ActivityKind;
}

export interface RawComment {
  id: string;
  worksheet_id: string;
  author_id: string | null;
  body: string;
  resolved: boolean;
  created_at: string;
}

export interface RawVersion {
  id: string;
  worksheet_id: string;
  created_by: string | null;
  label: string | null;
  created_at: string;
}

export interface RawAudit {
  id: number | string;
  actor_id: string | null;
  action: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface BuildArgs {
  comments: RawComment[];
  versions: RawVersion[];
  audits: RawAudit[];
  /** worksheet id → title, for the human-readable line. */
  titlesById: Map<string, string>;
  /** profile id → display name, for the actor. */
  namesById: Map<string, string>;
  limit?: number;
}

/** Trim a comment body to a single short, quoted line. */
function quote(body: string): string {
  const clean = body.replace(/\s+/g, " ").trim();
  const text = clean.length > 80 ? clean.slice(0, 79).trimEnd() + "…" : clean;
  return `“${text}”`;
}

function titleCase(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildActivityItems({
  comments,
  versions,
  audits,
  titlesById,
  namesById,
  limit = 15,
}: BuildArgs): ActivityItem[] {
  const name = (id: string | null) => (id && namesById.get(id)) || "Someone";
  const title = (id: string) => titlesById.get(id) ?? "a worksheet";

  const items: ActivityItem[] = [];

  for (const c of comments) {
    items.push({
      id: `comment:${c.id}`,
      actorId: c.author_id,
      actorName: name(c.author_id),
      text: c.resolved
        ? `resolved a comment on ${title(c.worksheet_id)}`
        : `commented on ${title(c.worksheet_id)}`,
      detail: c.resolved ? "Thread closed" : quote(c.body),
      time: c.created_at,
      tone: c.resolved ? "pass" : "warning",
      kind: "comment",
    });
  }

  for (const v of versions) {
    items.push({
      id: `version:${v.id}`,
      actorId: v.created_by,
      actorName: name(v.created_by),
      text: `saved a version of ${title(v.worksheet_id)}`,
      detail: v.label ?? null,
      time: v.created_at,
      tone: "accent",
      kind: "version",
    });
  }

  for (const a of audits) {
    if (!a.target_id) continue;
    const t = title(a.target_id);
    const role = titleCase(a.metadata?.role);
    let text: string;
    let detail: string | null = null;
    let tone: ActivityTone = "muted";
    switch (a.action) {
      case "share":
        text = `shared ${t}`;
        detail = role ? `Role: ${role}` : null;
        tone = "pass";
        break;
      case "change_role":
        text = `changed access on ${t}`;
        detail = role ? `New role: ${role}` : null;
        tone = "accent";
        break;
      case "revoke_access":
        text = `removed access on ${t}`;
        tone = "muted";
        break;
      case "share_link":
        text = `created a share link for ${t}`;
        tone = "pass";
        break;
      default:
        continue; // ignore unrelated audit actions
    }
    items.push({
      id: `audit:${a.id}`,
      actorId: a.actor_id,
      actorName: name(a.actor_id),
      text,
      detail,
      time: a.created_at,
      tone,
      kind: "share",
    });
  }

  items.sort((x, y) => (x.time < y.time ? 1 : x.time > y.time ? -1 : 0));
  return items.slice(0, limit);
}
