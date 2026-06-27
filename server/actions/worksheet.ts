"use server";

import { revalidatePath } from "next/cache";
import {
  createActionClient,
  createClient,
  rpcAsUser,
} from "@/lib/supabase/server";
import {
  createWorksheetSchema,
  nameWorksheetVersionSchema,
  renameWorksheetSchema,
  restoreWorksheetVersionSchema,
  saveWorksheetSchema,
  saveWorksheetVersionSchema,
  searchWorksheetsSchema,
  setCalcModeSchema,
} from "@/lib/schema/worksheet";
import type { CalcStatus, Json } from "@/lib/supabase/types";
import { parseContent, validateContent } from "@/lib/worksheet/content";
import { applyFillIns, withOrigin } from "@/lib/worksheet/template";
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
  fillIns?: Record<string, string>;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = createWorksheetSchema.safeParse(input);
  if (!parsed.success) {
    return err("We couldn't start that worksheet. Try again.");
  }
  const { workspaceId, projectId, templateId, fillIns } = parsed.data;

  // Use the token-pinned action client: the cookie client's per-request token
  // resolution races inside a Server Action and lets the insert reach Postgres
  // as `anon` (RLS then rejects it, 42501). See `createActionClient`.
  const { db: supabase, user } = await createActionClient();
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
      // Seed from the template: substitute the user's fill-in values into the
      // `{{token}}` placeholders, then stamp the source-template link (id +
      // revision) so the editor can later flag when a newer revision ships.
      const seed = parseContent(template.content);
      const filled = withOrigin(applyFillIns(seed, fillIns ?? {}), {
        templateId,
        revision: seed.template?.revision ?? 1,
        appliedAt: new Date().toISOString(),
      });
      content = (validateContent(filled) ?? filled) as unknown as Json;
      // Bump the template's usage_count. A SECURITY DEFINER RPC handles this
      // because `templates_update` RLS would block a member from updating a
      // public template they don't own. Routed through `rpcAsUser` for the same
      // reason as the create below — supabase-js doesn't authenticate the write
      // POST here. Best-effort: never fail the create on it.
      await rpcAsUser("increment_template_usage", { tpl: templateId });
    }
  }

  // Create via the SECURITY DEFINER RPC (migration 0009_create_worksheet_rpc).
  // A direct `.insert()` — and even `supabase.rpc()` — reached Postgres without
  // the user's JWT here: reads carried it, but the write POST did not, so RLS
  // rejected the insert (42501) for owners/admins alike. `rpcAsUser` pins the
  // token onto the POST itself; the RPC then authorizes auth.uid() + workspace
  // role as definer and inserts.
  const { data: worksheetId, error: rpcError } = await rpcAsUser<string>(
    "create_worksheet",
    {
      p_workspace_id: workspaceId,
      p_project_id: projectId ?? null,
      p_title: title,
      p_content: content,
    },
  );

  if (rpcError || !worksheetId) {
    console.error("[createWorksheet] rpc failed", {
      code: rpcError?.code ?? null,
      message: rpcError?.message ?? null,
      details: rpcError?.details ?? null,
      hint: rpcError?.hint ?? null,
    });
    if (rpcError?.code === "28000") {
      // auth.uid() was null inside the RPC — the request reached Postgres
      // unauthenticated. Surface a session error, not a permission one.
      return err(
        "Your session didn't reach the server. Refresh the page and try again.",
      );
    }
    if (rpcError?.code === "42501") {
      return err(
        "You don't have permission to create worksheets in this workspace. Ask an admin for engineer access.",
      );
    }
    return err("We couldn't create the worksheet. Try again.");
  }

  revalidatePath("/app");
  return ok({ id: worksheetId });
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

/** A read-only role tried to mutate — surfaced in the app's voice. */
const READ_ONLY =
  "This worksheet is read-only for your role. Ask an editor or owner for access.";

/**
 * Autosave the worksheet: persist the content tree plus the engine-derived
 * calc status and error count. RLS (`worksheets_update`) restricts this to the
 * owner/editor; a viewer's update matches no row, which we surface as a
 * read-only message rather than a silent failure. Last-write-wins for now
 * (a Yjs CRDT merge path is noted for later).
 */
export async function saveWorksheet(input: {
  id: string;
  content: unknown;
  calcStatus: CalcStatus;
  errorCount: number;
}): Promise<ActionResult<{ updatedAt: string }>> {
  const parsed = saveWorksheetSchema.safeParse(input);
  if (!parsed.success) {
    return err("We couldn't save your changes. Check the worksheet and try again.");
  }
  const { id, content, calcStatus, errorCount } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksheets")
    // `updated_at` is bumped by the `worksheets_set_updated_at` trigger.
    .update({
      content: content as Json,
      calc_status: calcStatus,
      error_count: errorCount,
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select("updated_at")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't save your changes. Check your connection and try again.");
  }
  // No row updated despite the sheet being loadable ⇒ the role can't edit it.
  if (!data) return err(READ_ONLY);

  return ok({ updatedAt: data.updated_at });
}

/** Rename a worksheet (app-bar title edit). Editor/owner only, via RLS. */
export async function renameWorksheet(input: {
  id: string;
  title: string;
}): Promise<ActionResult<{ title: string }>> {
  const parsed = renameWorksheetSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "We couldn't rename the worksheet.");
  }
  const { id, title } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksheets")
    .update({ title })
    .eq("id", id)
    .is("deleted_at", null)
    .select("title")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't rename the worksheet. Try again.");
  }
  if (!data) return err(READ_ONLY);

  revalidatePath("/app");
  return ok({ title: data.title });
}

/** Persist the Auto/Manual calc mode toggle. Editor/owner only, via RLS. */
export async function setCalcMode(input: {
  id: string;
  mode: "auto" | "manual";
}): Promise<ActionResult<undefined>> {
  const parsed = setCalcModeSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't change the calc mode.");
  const { id, mode } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("worksheets")
    .update({ calc_mode: mode })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't change the calc mode. Try again.");
  }
  return ok(undefined);
}

/**
 * Snapshot the current content as a worksheet version (explicit "Save version"
 * or a session-end save). RLS on `worksheet_versions` requires edit rights on
 * the parent sheet.
 */
export async function saveWorksheetVersion(input: {
  id: string;
  content: unknown;
  label?: string;
}): Promise<ActionResult<{ versionId: string }>> {
  const parsed = saveWorksheetVersionSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't save a version. Try again.");
  const { id, content, label } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  const { data, error } = await supabase
    .from("worksheet_versions")
    .insert({
      worksheet_id: id,
      content: content as Json,
      label: label ?? null,
      created_by: user.id,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't save a version. Try again.");
  }
  if (!data) return err(READ_ONLY);

  return ok({ versionId: data.id });
}

/**
 * Restore a prior version (Version history → "Restore this version"). We first
 * snapshot the present draft as a new version — so nothing is lost (Func §4.9) —
 * then write the chosen version's content back as the current worksheet. Both
 * the snapshot insert and the content update require owner/editor via RLS.
 */
export async function restoreWorksheetVersion(input: {
  id: string;
  versionId: string;
}): Promise<ActionResult<{ restoredAt: string }>> {
  const parsed = restoreWorksheetVersionSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't restore that version. Try again.");
  const { id, versionId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  // The version to restore (RLS: any role with read access to the sheet).
  const { data: version } = await supabase
    .from("worksheet_versions")
    .select("content")
    .eq("id", versionId)
    .eq("worksheet_id", id)
    .maybeSingle();
  if (!version) return err("We couldn't find that version. It may have been removed.");

  // The present draft, captured before we overwrite it.
  const { data: current } = await supabase
    .from("worksheets")
    .select("content")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!current) return err("We couldn't open this worksheet. Try again.");

  // Snapshot the current draft first so the restore is reversible.
  const { error: snapshotError } = await supabase.from("worksheet_versions").insert({
    worksheet_id: id,
    content: current.content,
    label: "Snapshot before restore",
    created_by: user.id,
  });
  if (snapshotError) {
    if (snapshotError.code === "42501") return err(READ_ONLY);
    return err("We couldn't restore that version. Try again.");
  }

  // Write the chosen content back. The editor recomputes on next load.
  const { data, error } = await supabase
    .from("worksheets")
    .update({ content: version.content })
    .eq("id", id)
    .is("deleted_at", null)
    .select("updated_at")
    .maybeSingle();
  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't restore that version. Try again.");
  }
  if (!data) return err(READ_ONLY);

  revalidatePath(`/w/${id}`);
  revalidatePath(`/w/${id}/history`);
  return ok({ restoredAt: data.updated_at });
}

/**
 * Name (or rename) a version (Version history → "Name this version"). An empty
 * label clears the name. Owner/editor only, via the `worksheet_versions_update`
 * RLS policy.
 */
export async function nameWorksheetVersion(input: {
  versionId: string;
  label: string;
}): Promise<ActionResult<{ label: string | null }>> {
  const parsed = nameWorksheetVersionSchema.safeParse(input);
  if (!parsed.success) return err("Keep the version name under 120 characters.");
  const { versionId, label } = parsed.data;
  const value = label.length > 0 ? label : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksheet_versions")
    .update({ label: value })
    .eq("id", versionId)
    .select("label, worksheet_id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't rename this version. Try again.");
  }
  if (!data) return err(READ_ONLY);

  revalidatePath(`/w/${data.worksheet_id}/history`);
  return ok({ label: data.label });
}
