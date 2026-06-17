import { AuthScreen } from "@/components/auth/auth-screen";

export const metadata = { title: "Sign in · Quanta" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/app";

  return <AuthScreen initialTab="signin" next={safeNext} error={error} />;
}
