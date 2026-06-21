import Link from "next/link";

export const metadata = { title: "Terms of Service · Quanta" };

/**
 * Placeholder Terms of Service. The real policy lands before launch; this keeps
 * the sign-up footer/consent links honest in the meantime.
 */
export default function TermsPage() {
  return (
    <main className="q-grid flex-1 bg-paper px-6 py-[var(--d-section)]">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header className="flex flex-col gap-1">
          <span className="q-eyebrow">Legal</span>
          <h1 className="text-28 font-semibold tracking-[-0.01em] text-ink">
            Terms of Service
          </h1>
        </header>
        <p className="max-w-prose text-14 text-muted">
          Our full terms are being finalized. By creating an account you agree to use
          Quanta lawfully and accept that the service is provided as-is during this
          pre-release period. A complete agreement will be published here before
          general availability.
        </p>
        <p className="text-13 text-muted">
          Questions?{" "}
          <Link href="/sign-in" className="text-link underline-offset-2 hover:underline">
            Back to sign in
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
