"use server";

/**
 * Export Server Action (Functional Brief §4.10). Handles the lightweight formats
 * — Word, Excel, and HTML — generated on the Node runtime. PDF goes through a
 * dedicated route handler instead (headless Chromium is too heavy for the action
 * path); see `app/api/worksheets/[id]/export/route.ts`. Print never reaches the
 * server.
 */
import { createClient } from "@/lib/supabase/server";
import { ok, err, type ActionResult } from "@/server/result";
import { exportOptionsSchema } from "@/lib/export/options";
import { ExportError, runExport } from "@/lib/export/run";
import { readPreferences } from "@/lib/preferences/server";
import { z } from "zod";

const exportInputSchema = z.object({
  worksheetId: z.string().uuid(),
  options: exportOptionsSchema,
});

export async function exportWorksheet(
  raw: unknown,
): Promise<ActionResult<{ url: string; filename: string }>> {
  const parsed = exportInputSchema.safeParse(raw);
  if (!parsed.success) return err("Those export options don't look right. Check and try again.");

  const { worksheetId, options } = parsed.data;
  if (options.format === "pdf" || options.format === "print") {
    // PDF is served by the route handler; print is client-only.
    return err("That format is handled elsewhere.");
  }

  const supabase = await createClient();
  try {
    // Match the user's on-screen density in the generated artifact.
    const { density } = await readPreferences();
    const { signedUrl, filename } = await runExport(supabase, worksheetId, options, density);
    return ok({ url: signedUrl, filename });
  } catch (error) {
    if (error instanceof ExportError) return err(error.message);
    return err("Couldn't build the export. Try again in a moment.");
  }
}
