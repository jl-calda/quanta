import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";
import type { Database } from "./types";

type CookiesToSet = { name: string; value: string; options: CookieOptions }[];

/**
 * Server-side Supabase client for Server Components, Server Actions, and Route
 * Handlers. This is the default for reads and mutations; RLS gates every
 * query/mutation and the UI gates by role on top.
 *
 * The cookie `setAll` is wrapped in try/catch: writing cookies from a Server
 * Component render throws, and that is fine — the session is refreshed in
 * middleware (see lib/supabase/middleware.ts), so the failed write is a no-op.
 */
export async function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — ignore; middleware refreshes the
          // session cookie on the next request.
        }
      },
    },
  });
}
