/**
 * Export request runner (Functional Brief §4.10) — NODE ONLY.
 *
 * Shared by the `exportWorksheet` Server Action (docx/xlsx/html) and the PDF
 * route handler: authenticate, load the worksheet (RLS), enforce the export gate
 * (view+ access; viewers/commenters only when the workspace allows it), evaluate
 * the sheet deterministically, generate the artifact, upload it to the private
 * `exports` bucket, and hand back a short-lived signed URL.
 *
 * Gating is enforced HERE on every request — never trusting a client flag.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Density } from "@/lib/preferences/cookies";
import { parseContent } from "@/lib/worksheet/content";
import { parseLayoutSettings } from "@/lib/schema/page";
import { parseWorkspaceSettings } from "@/lib/schema/settings";
import type { ExportDocumentProps } from "./document";
import { evaluateForExport } from "./evaluate";
import { generateExport, uploadExport, type UploadedExport } from "./generate";
import type { ExportFormat, ExportOptions } from "./options";

/** An error whose `message` is already in the app's voice (safe to surface). */
export class ExportError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = "ExportError";
  }
}

const EDIT_ROLES = new Set(["owner", "editor"]);
const VIEW_ROLES = new Set(["owner", "editor", "commenter", "viewer"]);

/**
 * Pure export gate (Func §4.10): owners/editors may always export; viewers and
 * commenters only when the workspace opts in; anyone without a role is denied.
 */
export function isExportAllowed(role: string | null, allowViewerExport: boolean): boolean {
  if (!role || !VIEW_ROLES.has(role)) return false;
  if (EDIT_ROLES.has(role)) return true;
  return allowViewerExport;
}

/**
 * Run a non-print export end to end. Throws {@link ExportError} with a friendly
 * message on any gate/auth/generation failure.
 */
export async function runExport(
  supabase: SupabaseClient,
  worksheetId: string,
  options: ExportOptions,
  density: Density = "compact",
): Promise<UploadedExport> {
  if (options.format === "print") {
    throw new ExportError("Print is handled in the browser, not on the server.", 400);
  }
  const format: Exclude<ExportFormat, "print"> = options.format;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ExportError("You're signed out. Sign in and try again.", 401);

  const { data: worksheet } = await supabase
    .from("worksheets")
    .select("id, title, content, workspace_id, layout_settings")
    .eq("id", worksheetId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!worksheet) throw new ExportError("That worksheet couldn't be found.", 404);

  // Effective worksheet role decides access; RLS already gated the read above.
  const { data: role } = await supabase.rpc("worksheet_effective_role", { sheet: worksheetId });
  const roleStr = typeof role === "string" ? role : null;

  // Viewers/commenters need the workspace opt-in; editors/owners always may.
  let allowViewerExport = false;
  if (roleStr && !EDIT_ROLES.has(roleStr)) {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("settings")
      .eq("id", worksheet.workspace_id)
      .maybeSingle();
    allowViewerExport = parseWorkspaceSettings(ws?.settings).allowViewerExport;
  }

  if (!isExportAllowed(roleStr, allowViewerExport)) {
    throw new ExportError(
      roleStr && VIEW_ROLES.has(roleStr)
        ? "Exporting is turned off for viewers in this workspace. Ask an admin to enable it."
        : "You don't have access to export this worksheet.",
      403,
    );
  }

  const content = parseContent(worksheet.content);
  const results = evaluateForExport(content, parseLayoutSettings(worksheet.layout_settings).unitSystem);
  const props: ExportDocumentProps = { title: worksheet.title, content, results, options, density };

  try {
    const artifact = await generateExport(format, props);
    return await uploadExport(supabase, {
      workspaceId: worksheet.workspace_id,
      worksheetId: worksheet.id,
      title: worksheet.title,
      artifact,
    });
  } catch (error) {
    if (error instanceof ExportError) throw error;
    const detail = format === "pdf" ? "Couldn't render the PDF." : "Couldn't build the export.";
    throw new ExportError(`${detail} Try again, or pick another format.`, 500);
  }
}
