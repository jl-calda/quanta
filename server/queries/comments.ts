import "server-only";
import { createClient } from "@/lib/supabase/server";
import { avatarColor, initialsOf } from "@/components/editor/use-presence";
import { sortCommentsAsc, type CommentItem } from "@/lib/worksheet/comments";

/**
 * Comments for the editor's comments panel (Func §5.1). RLS (`comments_select`)
 * already gates these to anyone with access to the parent sheet; author identity
 * is stitched in a single `.in(...)` hop (the proven `shared.ts` pattern — the
 * hand-written types don't model embedded selects). Returned oldest-first so the
 * panel renders the thread top-to-bottom with the newest note at the end.
 */
export async function getWorksheetComments(worksheetId: string): Promise<CommentItem[]> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("comments")
    .select("id, region_id, author_id, body, resolved, created_at")
    .eq("worksheet_id", worksheetId)
    .order("created_at", { ascending: true });

  const comments = rows ?? [];
  if (comments.length === 0) return [];

  const ids = [
    ...new Set(comments.map((c) => c.author_id).filter((id): id is string => !!id)),
  ];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    for (const p of profiles ?? []) {
      names.set(p.id, p.full_name || p.email || "Someone");
    }
  }

  const items: CommentItem[] = comments.map((c) => {
    const name = (c.author_id && names.get(c.author_id)) || "Someone";
    return {
      id: c.id,
      regionId: c.region_id,
      authorId: c.author_id,
      authorName: name,
      authorInitials: initialsOf(name),
      authorColor: c.author_id ? avatarColor(c.author_id) : "var(--text-muted)",
      body: c.body,
      resolved: c.resolved,
      createdAt: c.created_at,
    };
  });

  return sortCommentsAsc(items);
}
