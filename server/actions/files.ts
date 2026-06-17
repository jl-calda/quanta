"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createFolderSchema,
  renameProjectSchema,
  deleteFolderSchema,
  moveWorksheetSchema,
  moveProjectSchema,
  duplicateWorksheetSchema,
  softDeleteWorksheetSchema,
  restoreWorksheetSchema,
  bulkMoveSchema,
  bulkTagSchema,
  bulkSoftDeleteSchema,
} from "@/lib/schema/files";
import type { Json } from "@/lib/supabase/types";
import { isSelfOrDescendant, descendantIds } from "@/components/files/format";
import { ok, err, type ActionResult } from "@/server/result";

/**
 * File browser mutations (§4.5). Each validates with Zod, runs through the
 * RLS-scoped server client, and surfaces a denial in the app's voice rather than
 * a raw Postgres error. Project writes require engineer+ at the workspace level;
 * worksheet writes require editor/owner on the sheet — both enforced by RLS,
 * mirrored here as friendly messages. `renameWorksheet` and `createWorksheet`
 * already live in `worksheet.ts` and are reused unchanged.
 */

const NO_PERMISSION =
  "You don't have permission to do that here. Ask an admin for engineer access.";
const READ_ONLY =
  "This worksheet is read-only for your role. Ask an editor or owner for access.";

/** Create a folder (a project, optionally nested under `parentId`). */
export async function createFolder(input: {
  workspaceId: string;
  parentId?: string | null;
  name: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = createFolderSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "We couldn't create the folder.");
  }
  const { workspaceId, parentId, name } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      parent_id: parentId ?? null,
      name,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "42501") return err(NO_PERMISSION);
    return err("We couldn't create the folder. Try again.");
  }

  revalidatePath("/worksheets");
  return ok({ id: data.id });
}

/** Rename a folder (project). Engineer+ via RLS. */
export async function renameProject(input: {
  id: string;
  name: string;
}): Promise<ActionResult<{ name: string }>> {
  const parsed = renameProjectSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "We couldn't rename the folder.");
  }
  const { id, name } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", id)
    .select("name")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(NO_PERMISSION);
    return err("We couldn't rename the folder. Try again.");
  }
  if (!data) return err(NO_PERMISSION);

  revalidatePath("/worksheets");
  return ok({ name: data.name });
}

/**
 * Delete a folder and everything under it. Because `worksheets.project_id` is
 * `ON DELETE SET NULL`, a raw delete would orphan worksheets to the root rather
 * than trashing them — so we first soft-delete every contained sheet (across the
 * whole subtree) to Trash, then delete the folder, letting the `parent_id`
 * cascade remove the descendant folders. Worksheets stay restorable from Trash.
 */
export async function deleteFolder(input: {
  id: string;
}): Promise<ActionResult<{ trashedCount: number }>> {
  const parsed = deleteFolderSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't delete the folder.");
  const { id } = parsed.data;

  const supabase = await createClient();

  // Resolve the folder's workspace, then the whole subtree of folder ids.
  const { data: target } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", id)
    .maybeSingle();
  if (!target) return err(NO_PERMISSION);

  const { data: all } = await supabase
    .from("projects")
    .select("id, name, parent_id")
    .eq("workspace_id", target.workspace_id);
  const subtree = descendantIds(
    (all ?? []).map((p) => ({ id: p.id, name: p.name, parent_id: p.parent_id })),
    id,
  );

  // 1) Soft-delete contained worksheets → Trash. Count what actually moved
  //    (RLS may exclude sheets the user can't edit).
  const { data: trashed, error: trashError } = await supabase
    .from("worksheets")
    .update({ deleted_at: new Date().toISOString() })
    .in("project_id", subtree)
    .is("deleted_at", null)
    .select("id");
  if (trashError && trashError.code === "42501") return err(READ_ONLY);

  // 2) Delete the folder; the parent_id cascade removes descendant folders.
  const { error: delError } = await supabase.from("projects").delete().eq("id", id);
  if (delError) {
    if (delError.code === "42501") return err(NO_PERMISSION);
    return err("We couldn't delete the folder. Try again.");
  }

  revalidatePath("/worksheets");
  return ok({ trashedCount: (trashed ?? []).length });
}

/** Move a worksheet into a folder (or to the root with `projectId: null`). */
export async function moveWorksheet(input: {
  id: string;
  projectId: string | null;
}): Promise<ActionResult<undefined>> {
  const parsed = moveWorksheetSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't move the worksheet.");
  const { id, projectId } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksheets")
    .update({ project_id: projectId })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't move the worksheet. Try again.");
  }
  if (!data) return err(READ_ONLY);

  revalidatePath("/worksheets");
  return ok(undefined);
}

/** Move a folder under another folder (or to the root). Rejects cycles. */
export async function moveProject(input: {
  id: string;
  parentId: string | null;
}): Promise<ActionResult<undefined>> {
  const parsed = moveProjectSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't move the folder.");
  const { id, parentId } = parsed.data;

  const supabase = await createClient();

  if (parentId) {
    const { data: target } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", id)
      .maybeSingle();
    if (!target) return err(NO_PERMISSION);

    const { data: all } = await supabase
      .from("projects")
      .select("id, name, parent_id")
      .eq("workspace_id", target.workspace_id);
    const projects = (all ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      parent_id: p.parent_id,
    }));
    if (isSelfOrDescendant(projects, id, parentId)) {
      return err("You can't move a folder into itself or one of its subfolders.");
    }
  }

  const { data, error } = await supabase
    .from("projects")
    .update({ parent_id: parentId })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(NO_PERMISSION);
    return err("We couldn't move the folder. Try again.");
  }
  if (!data) return err(NO_PERMISSION);

  revalidatePath("/worksheets");
  return ok(undefined);
}

/** Duplicate a worksheet — a deep copy of its content under the same folder. */
export async function duplicateWorksheet(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = duplicateWorksheetSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't duplicate the worksheet.");
  const { id } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  const { data: source, error: readError } = await supabase
    .from("worksheets")
    .select("workspace_id, project_id, title, content")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (readError || !source) {
    return err("We couldn't find that worksheet to duplicate.");
  }

  const { data, error } = await supabase
    .from("worksheets")
    .insert({
      workspace_id: source.workspace_id,
      project_id: source.project_id,
      title: `${source.title} (copy)`,
      content: structuredClone(source.content) as Json,
      owner_id: user.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "42501") return err(NO_PERMISSION);
    return err("We couldn't duplicate the worksheet. Try again.");
  }

  revalidatePath("/worksheets");
  return ok({ id: data.id });
}

/** Soft-delete a worksheet → Trash (sets `deleted_at`). Editor/owner via RLS. */
export async function softDeleteWorksheet(input: {
  id: string;
}): Promise<ActionResult<undefined>> {
  const parsed = softDeleteWorksheetSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't move the worksheet to Trash.");
  const { id } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksheets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't move the worksheet to Trash. Try again.");
  }
  if (!data) return err(READ_ONLY);

  revalidatePath("/worksheets");
  return ok(undefined);
}

/** Restore a worksheet from Trash (clears `deleted_at`). Editor/owner via RLS. */
export async function restoreWorksheet(input: {
  id: string;
}): Promise<ActionResult<undefined>> {
  const parsed = restoreWorksheetSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't restore the worksheet.");
  const { id } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksheets")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't restore the worksheet. Try again.");
  }
  if (!data) return err(READ_ONLY);

  revalidatePath("/worksheets");
  return ok(undefined);
}

/* -------------------------------- bulk ---------------------------------- */

/** Move several worksheets into a folder (or to the root). */
export async function bulkMove(input: {
  ids: string[];
  projectId: string | null;
}): Promise<ActionResult<{ moved: number }>> {
  const parsed = bulkMoveSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't move those worksheets.");
  const { ids, projectId } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksheets")
    .update({ project_id: projectId })
    .in("id", ids)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't move those worksheets. Try again.");
  }
  revalidatePath("/worksheets");
  return ok({ moved: (data ?? []).length });
}

/** Apply a tag to several worksheets (idempotent — ignores existing links). */
export async function bulkTag(input: {
  ids: string[];
  tagId: string;
}): Promise<ActionResult<{ tagged: number }>> {
  const parsed = bulkTagSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't tag those worksheets.");
  const { ids, tagId } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksheet_tags")
    .upsert(
      ids.map((worksheet_id) => ({ worksheet_id, tag_id: tagId })),
      { onConflict: "worksheet_id,tag_id", ignoreDuplicates: true },
    )
    .select("worksheet_id");

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't tag those worksheets. Try again.");
  }
  revalidatePath("/worksheets");
  return ok({ tagged: (data ?? []).length });
}

/** Soft-delete several worksheets → Trash. */
export async function bulkSoftDelete(input: {
  ids: string[];
}): Promise<ActionResult<{ trashed: number }>> {
  const parsed = bulkSoftDeleteSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't move those worksheets to Trash.");
  const { ids } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksheets")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't move those worksheets to Trash. Try again.");
  }
  revalidatePath("/worksheets");
  return ok({ trashed: (data ?? []).length });
}
