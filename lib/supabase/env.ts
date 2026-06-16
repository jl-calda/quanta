/**
 * Supabase environment configuration.
 *
 * Read lazily (never at module load) so the app builds without secrets and
 * only fails — with a fixable message in the app's voice — when a Supabase
 * client is actually constructed without configuration.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (copy from .env.example).",
    );
  }

  return { url, anonKey };
}
