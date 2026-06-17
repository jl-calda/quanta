import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuantaMark } from "@/components/quanta-mark";

export const metadata = { title: "Worksheet · Quanta" };

/**
 * Placeholder worksheet editor. The full editor (math regions, calc engine,
 * ribbon) is a later milestone; for now this confirms that `createWorksheet`
 * navigates to a real, RLS-scoped worksheet so the dashboard create flow is
 * verifiable end to end.
 */
export default async function WorksheetEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: worksheet } = await supabase
    .from("worksheets")
    .select("id, title")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!worksheet) notFound();

  return (
    <main className="q-grid flex flex-1 items-center justify-center bg-paper px-6 py-16">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-hairline bg-chrome">
          <QuantaMark size={28} className="text-accent" />
        </div>
        <span className="q-eyebrow">Worksheet</span>
        <h1 className="text-20 font-semibold tracking-[-0.01em] text-ink">
          {worksheet.title}
        </h1>
        <p className="max-w-sm text-13 text-muted">
          The worksheet editor is coming soon. Your new sheet is saved — live
          math regions, units, and recalculation land in the next milestone.
        </p>
        <Link
          href="/app"
          className="mt-2 inline-flex h-9 items-center rounded-sm border border-strong bg-raised px-3 text-13 font-medium text-ink transition-colors hover:bg-hover"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
