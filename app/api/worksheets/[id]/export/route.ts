/**
 * PDF export route (Functional Brief §4.10). Isolated from the Server Action
 * because PDF generation launches headless Chromium (puppeteer-core +
 * @sparticuz/chromium), which needs the Node runtime, a longer timeout, and
 * stays out of the bundle (see next.config `serverExternalPackages`). POST the
 * `ExportOptions` JSON; returns `{ url, filename }` for the signed download.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportOptionsSchema } from "@/lib/export/options";
import { ExportError, runExport } from "@/lib/export/run";
import { readPreferences } from "@/lib/preferences/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = exportOptionsSchema.safeParse(body);
  if (!parsed.success || parsed.data.format !== "pdf") {
    return NextResponse.json({ error: "Those export options don't look right." }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    // Honour the user's display density so the PDF matches what they see on screen.
    const { density } = await readPreferences();
    const { signedUrl, filename } = await runExport(supabase, id, parsed.data, density);
    return NextResponse.json({ url: signedUrl, filename });
  } catch (error) {
    if (error instanceof ExportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Couldn't render the PDF. Try again." }, { status: 500 });
  }
}
