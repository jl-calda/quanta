/**
 * Pure helpers for the file browser (§4.5) — dependency-free and deterministic
 * so they're trivially unit-testable and safe to share across server and client
 * components. Tree building, breadcrumb resolution, and cycle detection all
 * operate on a flat project list; the rest are display formatters.
 */

/** The minimal project shape these helpers need (a subset of `ProjectSummary`). */
export interface ProjectLike {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface ProjectNode extends ProjectLike {
  children: ProjectNode[];
}

/** Build a parent→children tree from a flat project list, children sorted by
 * name. Orphans (parent missing / hidden by RLS) surface as roots. */
export function buildTree<T extends ProjectLike>(projects: T[]): (T & { children: ProjectNode[] })[] {
  const byId = new Map<string, ProjectNode>();
  for (const p of projects) byId.set(p.id, { ...p, children: [] });

  const roots: ProjectNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: ProjectNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots as (T & { children: ProjectNode[] })[];
}

/** Ordered ancestor chain from the root project down to `folderId` (inclusive).
 * Empty at the workspace root. Guards against pre-existing cycles. */
export function folderPath(
  projects: ProjectLike[],
  folderId: string | undefined | null,
): { id: string; name: string }[] {
  if (!folderId) return [];
  const byId = new Map(projects.map((p) => [p.id, p]));
  const out: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  let cur = byId.get(folderId);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.unshift({ id: cur.id, name: cur.name });
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return out;
}

/** True when `candidateId` is `rootId` itself or lives in `rootId`'s subtree —
 * used to reject folder moves that would create a cycle (§4.5 edge case). */
export function isSelfOrDescendant(
  projects: ProjectLike[],
  rootId: string,
  candidateId: string,
): boolean {
  if (candidateId === rootId) return true;
  const byId = new Map(projects.map((p) => [p.id, p]));
  const seen = new Set<string>();
  let cur = byId.get(candidateId);
  while (cur && cur.parent_id && !seen.has(cur.id)) {
    if (cur.parent_id === rootId) return true;
    seen.add(cur.id);
    cur = byId.get(cur.parent_id);
  }
  return false;
}

/** Collect `rootId` plus every descendant project id (BFS) — the folder subtree
 * whose worksheets get trashed and whose folders get deleted. */
export function descendantIds(projects: ProjectLike[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const p of projects) {
    if (!p.parent_id) continue;
    const arr = childrenOf.get(p.parent_id) ?? [];
    arr.push(p.id);
    childrenOf.set(p.parent_id, arr);
  }
  const out: string[] = [];
  const queue = [rootId];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    for (const child of childrenOf.get(id) ?? []) queue.push(child);
  }
  return out;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Compact "modified" label matching the mockup: "Today, 14:22" for today,
 * "Yesterday", then a calendar date ("12 Jun", or "12 Jun 2024" across years).
 * `now` is injectable for testing.
 */
export function fmtModified(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();
  if (sameDay) return `Today, ${pad(then.getHours())}:${pad(then.getMinutes())}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    then.getFullYear() === yesterday.getFullYear() &&
    then.getMonth() === yesterday.getMonth() &&
    then.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";

  const date = `${then.getDate()} ${MONTHS[then.getMonth()]}`;
  return then.getFullYear() === now.getFullYear()
    ? date
    : `${date} ${then.getFullYear()}`;
}

/** Up to two uppercase initials for an owner avatar ("Maya Okafor" → "MO"). */
export function ownerInitials(name: string): string {
  const parts = name
    .replace(/[^A-Za-z. ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Stable avatar color for an owner — "You" is always blueprint; everyone else
 * gets a deterministic hue from a small technical palette. */
const OWNER_PALETTE = ["#1E8E5A", "#7A5BBF", "#B5722B", "#2E7D9A", "#A8456B"];
export function ownerColor(name: string): string {
  if (name === "You") return "var(--accent)";
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return OWNER_PALETTE[sum % OWNER_PALETTE.length];
}

/** Humanized byte size derived from a serialized content tree — a stand-in for
 * the mockup's "Size" column (worksheets don't persist a file size). */
export function deriveSize(content: unknown): string {
  let bytes: number;
  try {
    bytes = JSON.stringify(content ?? "").length;
  } catch {
    bytes = 0;
  }
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
