import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createTokenClient } from "@supabase/supabase-js";
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

/**
 * Client for **mutations** in Server Actions, with the caller's access token
 * pinned into the Authorization header.
 *
 * Why this exists: the cookie-session client (`createClient`) resolves the
 * user's JWT lazily, once per PostgREST request, via `auth.getSession()` —
 * falling back to the anon key when that resolve comes back empty. Inside a
 * single Server Action that per-request resolve can race: an earlier read is
 * authenticated, but a following write reaches PostgREST as `anon`, so RLS
 * rejects it (e.g. `worksheets_insert` → 42501) even for an owner/admin.
 *
 * Reading the session **once** and pinning `access_token` onto a plain client
 * makes every data call deterministically carry the user's JWT. The pinned
 * client is stateless (no cookie storage, no refresh) — auth stays the cookie
 * client's job; this one only talks to the database as the signed-in user.
 *
 * Returns `{ user: null }` when there is no session — callers treat that as
 * signed out, exactly as they did with `getUser()`.
 */
export async function createActionClient() {
  const cookieClient = await createClient();
  const {
    data: { user },
  } = await cookieClient.auth.getUser();
  if (!user) return { db: cookieClient, user: null };

  const {
    data: { session },
  } = await cookieClient.auth.getSession();
  if (!session?.access_token) return { db: cookieClient, user };

  const { url, anonKey } = getSupabaseEnv();
  const db = createTokenClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return { db, user };
}
