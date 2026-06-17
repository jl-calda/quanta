"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createWorksheetSchema,
  searchWorksheetsSchema,
} from "@/lib/schema/worksheet";
import type { CalcStatus, Json } from "@/lib/supabase/types";
import { ok, err, type ActionResult } from "@/server/result";

const EMPTY_CONTENT: Json = { version: 1, rows: [] };

/**
 * Open a new worksheet — blank, or seeded from a template's content — and return
 * its id so the caller can navigate to the editor (`/w/[id]`). Creating requires
 * an engineer-or-above role; RLS enforces this (`worksheets_insert`), and we
 * surface the denial in the app's voice rather than as a raw Postgres error.
 */
export async function createWorksheet(input: {
  workspaceId: string;
  projectId?: string;
  templateId?: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = createWorksheetSchema.safeParse(input);
  if (!parsed.success) {
    return err("We couldn't start that worksheet. Try again.");
  }
  const { workspaceId, projectId, templateId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  // Seed from the template when one was chosen; fall back to a blank page if the
  // template can't be read (RLS hides it, or it was deleted).
  let title = "Untitled worksheet";
  let content: Json = EMPTY_CONTENT;
  if (templateId) {
    const { data: template } = await supabase
      .from("templates")
      .select("title, content")
      .eq("id", templateId)
      .maybeSingle();
    if (template) {
      title = template.title;
      content = template.content;
    }
  }

  const { data: worksheet, error: insertError } = await supabase
    .from("worksheets")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId ?? null,
      title,
      content,
      owner_id: user.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !worksheet) {
    // 42501 = insufficient privilege (RLS check failed) — the member's role is
    // below engineer, so they may not create worksheets here.
    if (insertError?.code === "42501") {
      return err(
        "You don't have permission to create worksheets in this workspace. Ask an admin for engineer access.",
      );
    }
    return err("We couldn't create the worksheet. Try again.");
  }

  revalidatePath("/app");
  return ok({ id: worksheet.id });
}

export type SearchHit = {
  id: string;
  title: string;
  calc_status: CalcStatus;
  updated_at: string;
};

/** Escape LIKE wildcards so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/**
 * Global search across worksheet titles (trigram-indexed) and tag names, scoped
 * to the active workspace and excluding trashed sheets. Returns up to `limit`
 * de-duplicated hits, most-recently-touched first.
 */
export async function searchWorksheets(
  workspaceId: string,
  q: string,
  limit = 8,
): Promise<ActionResult<SearchHit[]>> {
  const parsed = searchWorksheetsSchema.safeParse({ workspaceId, q });
  if (!parsed.success) return ok([]);

  const supabase = await createClient();
  const pattern = `%${escapeLike(parsed.data.q)}%`;
  const cols = "id, title, calc_status, updated_at";

  // Title hits (primary, gin_trgm indexed).
  const titleHits = supabase
    .from("worksheets")
    .select(cols)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .ilike("title", pattern)
    .order("updated_at", { ascending: false })
    .limit(limit);

  // Tag hits: matching tags → worksheet ids → sheets. Resolved in explicit steps
  // so the result stays fully typed and RLS-safe at each hop.
  const tagHits = (async (): Promise<SearchHit[]> => {
    const { data: tags } = await supabase
      .from("tags")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", pattern)
      .limit(50);
    const tagIds = (tags ?? []).map((t) => t.id);
    if (tagIds.length === 0) return [];

    const { data: links } = await supabase
      .from("worksheet_tags")
      .select("worksheet_id")
      .in("tag_id", tagIds)
      .limit(200);
    const sheetIds = [...new Set((links ?? []).map((l) => l.worksheet_id))];
    if (sheetIds.length === 0) return [];

    const { data: sheets } = await supabase
      .from("worksheets")
      .select(cols)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .in("id", sheetIds)
      .order("updated_at", { ascending: false })
      .limit(limit);
    return sheets ?? [];
  })();

  const [titleResult, tagResult] = await Promise.all([titleHits, tagHits]);

  const byId = new Map<string, SearchHit>();
  for (const row of titleResult.data ?? []) byId.set(row.id, row);
  for (const row of tagResult) if (!byId.has(row.id)) byId.set(row.id, row);

  const hits = [...byId.values()]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit);

  return ok(hits);
}
