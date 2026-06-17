import Link from "next/link";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata = { title: "Create account · Quanta" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/app";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-20 font-semibold tracking-[-0.01em] text-ink">
          Create your account
        </h1>
        <p className="text-13 text-muted">
          Start writing live, unit-aware engineering calculations.
        </p>
      </header>

      <SignUpForm next={safeNext} />

      <p className="text-12 text-muted">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="text-link underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
