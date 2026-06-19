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
  if (!token) return { db: cookieClient, user };

  const { url, anonKey } = getSupabaseEnv();
  const jwt = token; // narrowed to string after the guard above
  const db = createTokenClient<Database>(url, anonKey, {
    // Pin the user's JWT via supabase-js's `accessToken` hook. This reliably
    // authenticates READ requests (SELECTs). It does NOT, in this Next.js
    // runtime, attach the token to write POSTs: production logs showed the same
    // client running its read probe as the signed-in user (auth.uid() set) while
    // the worksheet INSERT still reached Postgres as `anon` (auth.uid() null) and
    // tripped `worksheets_insert` (42501). So treat this client as read-capable
    // and route mutations through `rpcAsUser`, which pins the JWT onto the POST
    // itself. (`.auth` is unused on this client.)
    accessToken: async () => jwt,
  });
  return { db, user };
}

/**
 * Call a Postgres function (RPC) as the signed-in user over a raw `fetch`, with
 * the user's access token pinned explicitly onto the POST.
 *
 * This exists because supabase-js's own write path does not attach the recovered
 * token to its POST in this runtime — confirmed in production, where worksheet
 * creation's INSERT reached Postgres as `anon` (auth.uid() null → 42501) even
 * though the same client's reads ran authenticated. Issuing the POST ourselves,
 * with `Authorization: Bearer <jwt>`, guarantees the token lands on the write;
 * paired with a SECURITY DEFINER function that re-checks auth.uid() + role, it is
 * a safe, deterministic mutation path.
 *
 * Returns a Supabase-style `{ data, error }`. `error.code` carries the Postgres
 * SQLSTATE (e.g. `28000` unauthenticated, `42501` insufficient role) so callers
 * branch exactly as they did on a `supabase.rpc()` result. A scalar-returning
 * function (e.g. `returns uuid`) yields that value directly in `data`.
 */
export async function rpcAsUser<T = unknown>(
  fn: string,
  args: Record<string, unknown>,
): Promise<{
  data: T | null;
  error: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  } | null;
}> {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();
  const token = await readAccessTokenFromCookies(cookieStore);
  if (!token) {
    return {
      data: null,
      error: { code: "28000", message: "No access token in request cookies." },
    };
  }

  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(args),
    });
  } catch (e) {
    return {
      data: null,
      error: { message: e instanceof Error ? e.message : "Network error." },
    };
  }

  const raw = await res.text();
  if (!res.ok) {
    // PostgREST error bodies are JSON: { code, message, details, hint }.
    try {
      return { data: null, error: JSON.parse(raw) };
    } catch {
      return {
        data: null,
        error: { code: String(res.status), message: raw || res.statusText },
      };
    }
  }

  try {
    return { data: (raw ? JSON.parse(raw) : null) as T, error: null };
  } catch {
    return { data: raw as unknown as T, error: null };
  }
}
