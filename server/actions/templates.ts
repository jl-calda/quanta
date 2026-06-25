"use server";

import { revalidatePath } from "next/cache";
import { createClient, rpcAsUser } from "@/lib/supabase/server";
import {
  saveAsTemplateSchema,
  scopeToVisibility,
  templateCurationSchema,
} from "@/lib/schema/templates";
import { ok, err, type ActionResult } from "@/server/result";

/**
 * Save a worksheet as a reusable template (§4.4). Snapshots the source sheet's
 * content into a new `templates` row authored by the caller. The thumbnail is
 * generated at render time from the content/id (the gallery's deterministic
 * math preview), so no image is stored — `thumbnail_url` stays null for a future
 * stored-image path. RLS (`templates_insert`) enforces author + membership; we
 * surface a denial in the app's voice rather than a raw Postgres error.
 */
export async function saveAsTemplate(input: {
  workspaceId: string;
  worksheetId: string;
  title: string;
  description?: string;
  discipline?: string;
  standard?: string;
  templateType?: string;
  scope: "author" | "workspace" | "public";
}): Promise<ActionResult<{ id: string }>> {
  const parsed = saveAsTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      parsed.error.issues[0]?.message ?? "We couldn't save that template. Check the form and try again.",
    );
  }
  const {
    workspaceId,
    worksheetId,
    title,
    description,
    discipline,
    standard,
    templateType,
    scope,
  } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  // Snapshot the source worksheet's content (RLS guarantees the caller can read
  // it). If it's gone or hidden, ask them to pick another rather than failing dark.
  const { data: worksheet } = await supabase
    .from("worksheets")
    .select("content")
    .eq("id", worksheetId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!worksheet) {
    return err("We couldn't read that worksheet. Pick another and try again.");
  }

  const { data: template, error: insertError } = await supabase
    .from("templates")
    .insert({
      workspace_id: scope === "workspace" ? workspaceId : null,
      title,
      description: description ?? null,
      discipline: discipline ?? null,
      standard: standard ?? null,
      template_type: templateType ?? null,
      content: worksheet.content,
      visibility: scopeToVisibility(scope),
      author_id: user.id,
    })
    .select("id")
    .single();

  if (insertError || !template) {
    if (insertError?.code === "42501") {
      return err(
        "You don't have permission to save templates here. Ask an admin for access.",
      );
    }
    return err("We couldn't save the template. Try again.");
  }

  revalidatePath("/templates");
  return ok({ id: template.id });
}

/**
 * Curate a workspace template (§4.4, Phase 2) — feature it to the top of the
 * gallery, archive it (soft-retire), or restore it. Curation is admins-only and
 * enforced *server-side*: the write goes through the `set_template_curation`
 * SECURITY DEFINER RPC, which re-checks `auth.uid()` + `is_workspace_admin` and
 * rejects global/public starters. We route it via `rpcAsUser` (not
 * `supabase.rpc`) because writes otherwise reach Postgres as `anon` in this
 * runtime — the same proven path `create_worksheet` uses. A null flag is a no-op,
 * so feature and archive compose. SQLSTATEs surface in the app's voice.
 */
async function setCuration(input: {
  templateId: string;
  isFeatured?: boolean;
  archived?: boolean;
}): Promise<ActionResult<undefined>> {
  const parsed = templateCurationSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      parsed.error.issues[0]?.message ?? "We couldn't update that template.",
    );
  }
  const { templateId, isFeatured, archived } = parsed.data;

  const { error } = await rpcAsUser("set_template_curation", {
    p_template_id: templateId,
    p_is_featured: isFeatured ?? null,
    p_archived: archived ?? null,
  });

  if (error) {
    if (error.code === "28000") {
      return err("You're signed out. Sign in and try again.");
    }
    if (error.code === "42501") {
      return err("Only workspace admins can curate templates here.");
    }
    if (error.code === "P0002") {
      return err("That template no longer exists.");
    }
    return err("We couldn't update the template. Try again.");
  }

  revalidatePath("/templates");
  return ok(undefined);
}

/** Feature (or un-feature) a workspace template — pins it to the top of the
 * gallery. Admins only (enforced by the RPC). */
export async function featureTemplate(
  templateId: string,
  isFeatured: boolean,
): Promise<ActionResult<undefined>> {
  return setCuration({ templateId, isFeatured });
}

/** Archive (or restore) a workspace template. Archived templates leave the
 * default gallery but stay restorable. Admins only (enforced by the RPC). */
export async function archiveTemplate(
  templateId: string,
  archived: boolean,
): Promise<ActionResult<undefined>> {
  return setCuration({ templateId, archived });
}
