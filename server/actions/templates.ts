"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  saveAsTemplateSchema,
  scopeToVisibility,
  updateTemplateVersionSchema,
} from "@/lib/schema/templates";
import { parseContent, type TemplateParam } from "@/lib/worksheet/content";
import { autoParams, bumpTemplateMeta, stampTemplateMeta } from "@/lib/worksheet/template";
import type { Json } from "@/lib/supabase/types";
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
  params?: TemplateParam[];
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
    params,
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

  // Snapshot the worksheet's content and stamp the initial template revision
  // (revision 1 + seed changelog). Fill-in params come from the dialog, or are
  // auto-detected from `{{tokens}}` in the content when none were declared. The
  // source `content` is raw JSONB, so parse it before attaching metadata.
  const sourceContent = parseContent(worksheet.content);
  const meta = bumpTemplateMeta(
    undefined,
    { label: "Initial version", at: new Date().toISOString(), by: user.id },
    params ?? autoParams(sourceContent),
  );
  const content = stampTemplateMeta(sourceContent, meta);

  const { data: template, error: insertError } = await supabase
    .from("templates")
    .insert({
      workspace_id: scope === "workspace" ? workspaceId : null,
      title,
      description: description ?? null,
      discipline: discipline ?? null,
      standard: standard ?? null,
      template_type: templateType ?? null,
      content: content as unknown as Json,
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
 * Publish a new revision of an existing template from one of the caller's
 * worksheets (the "Update existing template" mode). Bumps `content.template.revision`
 * and appends a changelog entry, so worksheets created from an earlier revision
 * can surface an "update available" notice.
 *
 * The template read/write and the source-worksheet read are gated by *separate*
 * RLS policies (`templates_update` is author-or-admin; the worksheet read is the
 * caller's worksheet access) — the caller may hold one but not the other, so we
 * surface a denial on each independently in the app's voice.
 */
export async function updateTemplateVersion(input: {
  templateId: string;
  worksheetId: string;
  note?: string;
  params?: TemplateParam[];
}): Promise<ActionResult<{ revision: number }>> {
  const parsed = updateTemplateVersionSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      parsed.error.issues[0]?.message ?? "We couldn't publish that update. Check the form and try again.",
    );
  }
  const { templateId, worksheetId, note, params } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("You're signed out. Sign in and try again.");

  // The template to revise (RLS `templates_select` gates the read; the update
  // below is gated by `templates_update`).
  const { data: template } = await supabase
    .from("templates")
    .select("content")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) {
    return err("We couldn't find that template. It may have been removed.");
  }

  // The source worksheet to publish from (RLS gates this independently).
  const { data: worksheet } = await supabase
    .from("worksheets")
    .select("content")
    .eq("id", worksheetId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!worksheet) {
    return err("We couldn't read that worksheet. Pick another and try again.");
  }

  const prevMeta = parseContent(template.content).template;
  const sourceContent = parseContent(worksheet.content);
  // A template with no prior metadata is implicitly revision 1 (that's the
  // origin.revision worksheets stamped when created from it), so its first
  // published update advances to revision 2. Templates saved via saveAsTemplate
  // already carry revision 1, so they bump the same way.
  const baseline = prevMeta ?? { revision: 1, params: [], changelog: [] };
  const meta = bumpTemplateMeta(
    baseline,
    { label: note, at: new Date().toISOString(), by: user.id },
    params ?? autoParams(sourceContent),
  );
  const content = stampTemplateMeta(sourceContent, meta);

  const { data, error } = await supabase
    .from("templates")
    .update({ content: content as unknown as Json })
    .eq("id", templateId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return err("You don't have permission to update this template. Ask the author or an admin.");
    }
    return err("We couldn't publish the update. Try again.");
  }
  // No row updated despite a readable template ⇒ the caller can't update it.
  if (!data) {
    return err("You don't have permission to update this template. Ask the author or an admin.");
  }

  revalidatePath("/templates");
  return ok({ revision: meta.revision });
}

/**
 * Detect fill-in params from a worksheet's `{{tokens}}` — seeds the fill-in
 * editor in the Save-as-template dialog on demand (read-only; RLS gates the
 * worksheet read, mirroring the `searchWorksheets` client-read pattern).
 */
export async function detectTemplateFillIns(
  worksheetId: string,
): Promise<ActionResult<TemplateParam[]>> {
  const parsed = z.string().uuid().safeParse(worksheetId);
  if (!parsed.success) return err("Pick a worksheet first.");

  const supabase = await createClient();
  const { data: worksheet } = await supabase
    .from("worksheets")
    .select("content")
    .eq("id", parsed.data)
    .is("deleted_at", null)
    .maybeSingle();
  if (!worksheet) {
    return err("We couldn't read that worksheet. Pick another and try again.");
  }
  return ok(autoParams(parseContent(worksheet.content)));
}
