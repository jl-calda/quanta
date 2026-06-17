import { QuantaMark } from "@/components/quanta-mark";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Set a new password · Quanta" };

/**
 * Password-reset completion (§4.1). Reached from the recovery email link, which
 * lands on /auth/confirm (verifies the recovery OTP, establishing a session) and
 * continues here. A calm centered card on the signature dot-grid.
 */
export default function ResetPasswordPage() {
  return (
    <main className="q-grid flex min-h-screen flex-1 items-center justify-center bg-paper px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center text-ink">
          <QuantaMark size={24} className="text-accent" />
          <span className="text-20 font-semibold tracking-[-0.01em]">Quanta</span>
        </div>
        <div className="rounded-lg border border-hairline bg-raised p-6 shadow-[var(--shadow-sm)]">
          <header className="mb-5 flex flex-col gap-1">
            <h1 className="text-20 font-semibold tracking-[-0.01em] text-ink">
              Set a new password
            </h1>
            <p className="text-13 text-muted">
              Choose a new password for your account. You&rsquo;ll be signed in once
              it&rsquo;s saved.
            </p>
          </header>
          <ResetPasswordForm />
        </div>
      </div>
    </main>
  );
}
