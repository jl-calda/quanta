import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseContent } from "@/lib/worksheet/content";
import { getWorksheetVersionHistory } from "@/server/queries/worksheet";
import { avatarColor, initialsOf } from "@/components/editor/use-presence";
import { HistoryApp } from "@/components/editor/history/history-app";
import { CURRENT_ID, type TimelineEntry } from "@/components/editor/history/types";

export const metadata = { title: "Version history · Quanta" };

/** Deterministic, locale-stable timestamp (formatted server-side). */
function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * Version history (/w/[id]/history). A Server Component loads the sheet and its
 * saved versions (RLS-checked), prepends the live worksheet as a synthetic
 * "Current draft" entry, and hydrates the client timeline + diff viewer. The
 * editor owns its own chrome, so the global AppBar is suppressed on `/w/*`.
 */
export default async function WorksheetHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: worksheet } = await supabase
    .from("worksheets")
    .select("id, title, content, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!worksheet || !user) notFound();

  // Effective worksheet role gates Name/Restore (UI; RLS enforces the same).
  const { data: role } = await supabase.rpc("worksheet_effective_role", { sheet: id });
  if (!role) notFound();
  const canEdit = role === "owner" || role === "editor";

  const versions = await getWorksheetVersionHistory(id);

  const meta = user.user_metadata as { full_name?: string } | null;
  const meName = meta?.full_name || user.email || "You";
  const current: TimelineEntry = {
    id: CURRENT_ID,
    isCurrent: true,
    label: null,
    rel: "Current draft",
    content: parseContent(worksheet.content),
    timeLabel: formatTime(worksheet.updated_at),
    author: { name: meName, initials: initialsOf(meName), color: avatarColor(user.id) },
  };

  const entries: TimelineEntry[] = [
    current,
    ...versions.map((v) => ({
      id: v.id,
      isCurrent: false,
      label: v.label,
      rel: v.label ? "Named version" : "Saved version",
      content: v.content,
      timeLabel: formatTime(v.createdAt),
      author: v.author,
    })),
  ];

  return (
    <HistoryApp worksheetId={id} worksheetTitle={worksheet.title} canEdit={canEdit} entries={entries} />
  );
}
