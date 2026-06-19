import "server-only";
import {
  createServerClient,
  combineChunks,
  stringFromBase64URL,
  type CookieOptions,
} from "@supabase/ssr";
import { createClient as createTokenClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";
import type { Database } from "./types";

type CookiesToSet = { name: string; value: string; options: CookieOptions }[];
type CookieStore = Awaited<ReturnType<typeof cookies>>;

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
 * Read the access token straight from the auth cookie, the same way
 * `@supabase/ssr`'s own storage does: combine any chunked `sb-*-auth-token`
 * cookies, strip the `base64-` prefix, base64url-decode, then JSON-parse the
 * session. This is deterministic — it never calls `auth.getSession()`.
 *
 * We need that because `getSession()` races inside a Server Action: a first
 * call can return the session while the next returns null, which is exactly
 * what let an earlier read authenticate while the following write went out as
 * `anon`. The cookie itself is stable for the whole request, so reading it
 * directly always yields the signed-in user's token. Returns null if absent.
 */
async function readAccessTokenFromCookies(
  cookieStore: CookieStore,
): Promise<string | null> {
  // Find the auth-token cookie (or its first chunk) and recover the base key.
  const authCookie = cookieStore
    .getAll()
    .find((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));
  if (!authCookie) return null;
  const storageKey = authCookie.name.replace(/\.\d+$/, "");

  const combined = await combineChunks(
    storageKey,
    (name) => cookieStore.get(name)?.value ?? null,
  );
  if (!combined) return null;

  const decoded = combined.startsWith("base64-")
    ? stringFromBase64URL(combined.slice("base64-".length))
    : combined;
  try {
    const session = JSON.parse(decoded) as { access_token?: string } | null;
    return session?.access_token ?? null;
  } catch {
    return null;
  }
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
 * Pinning a single, deterministically-read token onto a plain client makes
 * every data call carry the user's JWT. The token is read straight from the
 * auth cookie (`readAccessTokenFromCookies`) precisely to avoid the racy
 * `getSession()`; `getSession()` remains only as a last-resort fallback. The
 * pinned client is stateless (no cookie storage, no refresh) — auth stays the
 * cookie client's job; this one only talks to the database as the user.
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

  const cookieStore = await cookies();
  let token = await readAccessTokenFromCookies(cookieStore);
  if (!token) {
    // Last resort: getSession() may still race, but try it before giving up.
    const {
      data: { session },
    } = await cookieClient.auth.getSession();
    token = session?.access_token ?? null;
  }
  // TEMP DIAGNOSTIC (remove with the createWorksheet probes): confirms the
  // cookie read recovered a token on a real deploy.
  console.error("[createActionClient]", {
    userId: user.id,
    tokenFound: !!token,
    tokenLength: token?.length ?? 0,
  });
  if (!token) return { db: cookieClient, user };

  const { url, anonKey } = getSupabaseEnv();
  const jwt = token; // narrowed to string after the guard above
  const db = createTokenClient<Database>(url, anonKey, {
    // Pin the user's JWT via supabase-js's official `accessToken` hook so it is
    // attached to EVERY PostgREST request — reads AND writes.
    //
    // A global `Authorization` header is NOT enough: supabase-js wraps fetch so
    // it only sets Authorization when the request doesn't already carry one,
    // otherwise falling back to `accessToken() ?? anonKey`. In practice the
    // header reached SELECTs but not the INSERT's request, so the write fell
    // back to the anon key and RLS rejected it (42501) — exactly what we saw
    // with `tokenFound: true` yet the insert still failing. Routing the token
    // through `accessToken` makes the fallback resolve to the user's JWT, so it
    // lands on the insert too. (`.auth` is unused on this client.)
    accessToken: async () => jwt,
  });
  return { db, user };
}
