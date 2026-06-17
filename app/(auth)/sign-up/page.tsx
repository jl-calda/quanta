import { AuthScreen } from "@/components/auth/auth-screen";

export const metadata = { title: "Create account · Quanta" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/app";

  return <AuthScreen initialTab="create" next={safeNext} error={error} />;
}
