"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updateLayoutSettingsSchema,
  updatePageSettingsSchema,
  type LayoutSettings,
  type PageSettings,
} from "@/lib/schema/page";
import type { Json } from "@/lib/supabase/types";
import { ok, err, type ActionResult } from "@/server/result";

/**
 * Page & layout settings mutations (Func §7.11 / §7.12 / §7.19). The page-setup,
 * headers/footers, and text-styles dialogs persist here — to the worksheet's
 * `page_settings` / `layout_settings` jsonb. RLS (`worksheets_update`) is the
 * hard gate, restricting writes to the owner/editor; a read-only role's update
 * matches no row, which we surface in the app's voice rather than as a silent
 * failure. Inputs are Zod-validated before they reach the DB.
 */

const READ_ONLY =
  "This worksheet is read-only for your role. Ask an editor or owner for access.";

/** Persist page setup + headers/footers. Editor/owner only, via RLS. */
export async function updatePageSettings(input: {
  id: string;
  pageSettings: PageSettings;
}): Promise<ActionResult<undefined>> {
  const parsed = updatePageSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return err("Those page settings don't look right. Check the highlighted fields.");
  }
  const { id, pageSettings } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksheets")
    .update({ page_settings: pageSettings as Json })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't save the page settings. Try again.");
  }
  if (!data) return err(READ_ONLY);

  revalidatePath(`/w/${id}`);
  return ok(undefined);
}

/** Persist columns/indent + text styles. Editor/owner only, via RLS. */
export async function updateLayoutSettings(input: {
  id: string;
  layoutSettings: LayoutSettings;
}): Promise<ActionResult<undefined>> {
  const parsed = updateLayoutSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return err("Those layout settings don't look right. Check the highlighted fields.");
  }
  const { id, layoutSettings } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worksheets")
    .update({ layout_settings: layoutSettings as Json })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return err(READ_ONLY);
    return err("We couldn't save the layout settings. Try again.");
  }
  if (!data) return err(READ_ONLY);

  revalidatePath(`/w/${id}`);
  return ok(undefined);
}
