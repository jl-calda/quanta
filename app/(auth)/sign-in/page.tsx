import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";
import { FormError } from "@/components/auth/controls";

export const metadata = { title: "Sign in · Quanta" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/app";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-20 font-semibold tracking-[-0.01em] text-ink">
          Sign in to Quanta
        </h1>
        <p className="text-13 text-muted">
          Pick up your worksheets where you left off.
        </p>
      </header>

      {error ? <FormError message={error} /> : null}

      <SignInForm next={safeNext} />

      <p className="text-12 text-muted">
        New to Quanta?{" "}
        <Link
          href="/sign-up"
          className="text-link underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
