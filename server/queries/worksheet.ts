import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseContent, type WorksheetContent } from "@/lib/worksheet/content";
import { avatarColor, initialsOf } from "@/components/editor/use-presence";

/**
 * Worksheet reads for the editor's Version history screen (Func §4.9). RLS
 * (`worksheet_versions_select`) already gates these to viewers of the parent
 * sheet; author identity is stitched in JS in a single `.in(...)` hop (the
 * proven `shared.ts` pattern — the hand-written types don't model embedded
 * selects).
 */

export interface VersionAuthor {
  name: string;
  initials: string;
  color: string;
}

export interface VersionEntry {
  id: string;
  label: string | null;
  content: WorksheetContent;
  createdAt: string;
  author: VersionAuthor;
}

/** All saved versions of a worksheet, newest first, each with parsed content. */
export async function getWorksheetVersionHistory(
  worksheetId: string,
): Promise<VersionEntry[]> {
  const supabase = await createClient();

  const { data: versions } = await supabase
    .from("worksheet_versions")
    .select("id, label, content, created_by, created_at")
    .eq("worksheet_id", worksheetId)
    .order("created_at", { ascending: false });

  const rows = versions ?? [];
  if (rows.length === 0) return [];

  const ids = [
    ...new Set(rows.map((r) => r.created_by).filter((id): id is string => !!id)),
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

  return rows.map((r) => {
    const name = (r.created_by && names.get(r.created_by)) || "Someone";
    return {
      id: r.id,
      label: r.label,
      content: parseContent(r.content),
      createdAt: r.created_at,
      author: {
        name,
        initials: initialsOf(name),
        color: r.created_by ? avatarColor(r.created_by) : "var(--text-muted)",
      },
    };
  });
}
