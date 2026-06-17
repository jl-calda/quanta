import Link from "next/link";

export const metadata = { title: "Privacy Policy · Quanta" };

/**
 * Placeholder Privacy Policy. The real policy lands before launch; this keeps the
 * sign-up footer/consent links honest in the meantime.
 */
export default function PrivacyPage() {
  return (
    <main className="q-grid flex-1 bg-paper px-6 py-[var(--d-section)]">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header className="flex flex-col gap-1">
          <span className="q-eyebrow">Legal</span>
          <h1 className="text-28 font-semibold tracking-[-0.01em] text-ink">
            Privacy Policy
          </h1>
        </header>
        <p className="max-w-prose text-14 text-muted">
          Our full privacy policy is being finalized. In short: we collect only what
          we need to run your workspace — your account details and the worksheets you
          create — and we never sell your data. A complete policy will be published
          here before general availability.
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
