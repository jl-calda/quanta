import { QuantaMark } from "@/components/quanta-mark";

/**
 * Centered, calm shell for the auth screens — paper surface under the signature
 * dot-grid, a single hairline card. No marketing chrome.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="q-grid flex flex-1 items-center justify-center bg-paper px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center text-ink">
          <QuantaMark size={24} className="text-accent" />
          <span className="text-20 font-semibold tracking-[-0.01em]">
            Quanta
          </span>
        </div>
        <div className="rounded-lg border border-hairline bg-raised p-6 shadow-[var(--shadow-sm)]">
          {children}
        </div>
      </div>
    </main>
  );
}
