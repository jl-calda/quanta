/**
 * Worksheet comments — shared client/server model + pure helpers for the editor
 * comments panel (Func §5.1 "comments button opens a panel"). The server query
 * resolves rows + author identity into `CommentItem`s; the panel + the app-bar
 * count badge read them through the comments provider. Kept pure so the ordering
 * and open-count logic can be unit-tested away from Supabase.
 */

export interface CommentItem {
  id: string;
  /** Region the comment is anchored to ("worksheet" for sheet-level notes). */
  regionId: string;
  authorId: string | null;
  authorName: string;
  authorInitials: string;
  /** Avatar colour token/hex for the author chip. */
  authorColor: string;
  body: string;
  resolved: boolean;
  /** ISO timestamp. */
  createdAt: string;
  /** Optimistic insert not yet acknowledged by the server. */
  pending?: boolean;
}

/** Sentinel region id for a comment that isn't anchored to a specific region. */
export const SHEET_ANCHOR = "worksheet";

/** Number of open (unresolved) comments — the value shown in the app-bar badge. */
export function openCommentCount(items: CommentItem[]): number {
  let count = 0;
  for (const c of items) if (!c.resolved) count += 1;
  return count;
}

/**
 * Oldest-first ordering for the thread (newest at the bottom, chat-style). Stable
 * for equal timestamps; optimistic items (created "now") naturally sort last.
 */
export function sortCommentsAsc(items: CommentItem[]): CommentItem[] {
  return [...items].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
}

/** Upsert by id (replaces an optimistic temp row with the persisted one). */
export function upsertComment(items: CommentItem[], next: CommentItem): CommentItem[] {
  const i = items.findIndex((c) => c.id === next.id);
  if (i === -1) return [...items, next];
  const copy = items.slice();
  copy[i] = next;
  return copy;
}

/** Replace one comment's id (temp → persisted) without disturbing order. */
export function reidComment(items: CommentItem[], fromId: string, to: CommentItem): CommentItem[] {
  return items.map((c) => (c.id === fromId ? to : c));
}
