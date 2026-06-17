import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";
import type { Database } from "./types";

/**
 * Browser-side Supabase client, for use inside Client Components.
 *
 * Reads (Server Components) and mutations (Server Actions) should prefer the
 * server client; reach for this only for client-only flows such as Realtime
 * subscriptions or browser-driven auth. RLS still gates every query.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
