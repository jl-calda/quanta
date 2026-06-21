"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addCommentSchema, setCommentResolvedSchema } from "@/lib/schema/comment";
import { ok, err, type ActionResult } from "@/server/result";

/** A role without comment rights tried to write — surfaced in the app's voice. */
const NO_COMMENT =
  "You don't have permission to comment on this worksheet. Ask for commenter access.";

/**
 * Post a comment anchored to a region (or the sheet). RLS (`comments_insert`)
 * requires owner/editor/commenter and `author_id = auth.uid()`; a denied write
 * matches no row, which we surface as a permission message rather than a silent
 * failure. Returns the new id + timestamp so the panel can reconcile its
 * optimistic row.
 */
export async function addComment(input: {
  worksheetId: string;
  regionId: string;
  body: string;
}): Promise<ActionResult<{ id: string; createdAt: string }>> {
  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "We couldn't post that comment.");
  }
  const { worksheetId, regionId, body } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  const { data, error } = await supabase
    .from("comments")
    .insert({
      worksheet_id: worksheetId,
      region_id: regionId,
      author_id: user.id,
      body,
    })
    .select("id, created_at")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(NO_COMMENT);
    return err("We couldn't post that comment. Check your connection and try again.");
  }
  if (!data) return err(NO_COMMENT);

  revalidatePath(`/w/${worksheetId}`);
  return ok({ id: data.id, createdAt: data.created_at });
}

/**
 * Resolve or reopen a comment thread. RLS (`comments_update`) restricts this to
 * the author or the worksheet owner; a denied update matches no row.
 */
export async function setCommentResolved(input: {
  id: string;
  resolved: boolean;
}): Promise<ActionResult<{ resolved: boolean }>> {
  const parsed = setCommentResolvedSchema.safeParse(input);
  if (!parsed.success) return err("We couldn't update that comment.");
  const { id, resolved } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .update({ resolved })
    .eq("id", id)
    .select("resolved, worksheet_id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return err("Only the comment's author or the worksheet owner can resolve it.");
    }
    return err("We couldn't update that comment. Try again.");
  }
  if (!data) {
    return err("Only the comment's author or the worksheet owner can resolve it.");
  }

  revalidatePath(`/w/${data.worksheet_id}`);
  return ok({ resolved: data.resolved });
}
