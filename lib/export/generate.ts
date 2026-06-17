/**
 * Export orchestration + storage (Functional Brief §4.10) — NODE ONLY.
 *
 * `generateExport` turns a worksheet + options into a downloadable artifact
 * (pdf / docx / xlsx / html); `uploadExport` writes it to the private `exports`
 * bucket under the workspace-scoped path the RLS policy expects and hands back a
 * short-lived signed URL. The `print` format never reaches here — it is a
 * client-only `window.print()` path.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExportDocumentProps } from "./document";
import { buildExportHtml } from "./html";
import { buildDocx } from "./docx";
import { buildXlsx } from "./xlsx";
import { FORMAT_FILE, type ExportFormat } from "./options";

export interface GeneratedArtifact {
  buffer: Buffer;
  ext: string;
  contentType: string;
}

/** Generate the artifact for a non-print format. */
export async function generateExport(
  format: Exclude<ExportFormat, "print">,
  props: ExportDocumentProps,
): Promise<GeneratedArtifact> {
  const meta = FORMAT_FILE[format];
  switch (format) {
    case "html":
      return { buffer: Buffer.from(await buildExportHtml(props), "utf8"), ...meta };
    case "pdf": {
      // Chromium is loaded behind this dynamic import so it never enters the
      // client/edge bundle.
      const { renderPdf } = await import("./pdf");
      return { buffer: await renderPdf(props), ...meta };
    }
    case "docx":
      return { buffer: await buildDocx(props), ...meta };
    case "xlsx":
      return { buffer: buildXlsx(props), ...meta };
    default: {
      const exhaustive: never = format;
      throw new Error(`Unsupported export format: ${String(exhaustive)}`);
    }
  }
}

/** A filesystem-safe slug for the download filename. */
function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "worksheet"
  );
}

export interface UploadedExport {
  path: string;
  signedUrl: string;
  filename: string;
}

/**
 * Upload an artifact to the `exports` bucket and return a signed URL. The path's
 * first segment MUST be the workspace id — the bucket's RLS policy authorizes on
 * it. Uses the caller's authed (RLS) client, never the service role.
 */
export async function uploadExport(
  supabase: SupabaseClient,
  args: {
    workspaceId: string;
    worksheetId: string;
    title: string;
    artifact: GeneratedArtifact;
  },
): Promise<UploadedExport> {
  const { workspaceId, worksheetId, title, artifact } = args;
  const stamp = Date.now();
  const path = `${workspaceId}/${worksheetId}/${stamp}.${artifact.ext}`;
  const filename = `${slug(title)}.${artifact.ext}`;

  const { error: uploadError } = await supabase.storage
    .from("exports")
    .upload(path, artifact.buffer, { contentType: artifact.contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error: signError } = await supabase.storage
    .from("exports")
    .createSignedUrl(path, 300, { download: filename });
  if (signError || !data) throw signError ?? new Error("Could not sign the export URL.");

  return { path, signedUrl: data.signedUrl, filename };
}
