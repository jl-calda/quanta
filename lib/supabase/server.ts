import "server-only";
import {
  createServerClient,
  combineChunks,
  stringFromBase64URL,
  type CookieOptions,
} from "@supabase/ssr";
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

  // Pin the user's access token onto every PostgREST data request. supabase-js
  // and @supabase/ssr attach the session token to reads, but in this Next.js
  // Server Action runtime they do NOT attach it to write POSTs — confirmed in
  // production, where inserts/updates reached Postgres as `anon` and RLS rejected
  // them (42501) even for owners/admins. Overriding the Authorization header at
  // the outermost fetch layer is verb-agnostic and deterministic, so reads AND
  // writes go out authenticated. Scoped to `/rest/` so auth calls (`/auth/v1`,
  // getUser/refresh) keep using the cookie session untouched; reads are
  // unaffected because the pinned token equals the session's own.
  const accessToken = await readAccessTokenFromCookies(cookieStore);
  const authedFetch: typeof fetch = (input, init) => {
    const target =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (accessToken && target.includes("/rest/")) {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      headers.set("apikey", anonKey);
      return fetch(input, { ...init, headers });
    }
    return fetch(input, init);
  };

  return createServerClient<Database>(url, anonKey, {
    global: { fetch: authedFetch },
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
 * Convenience for Server Action mutations: the standard cookie client — which
 * now pins the user's JWT onto every PostgREST request, reads AND writes (see
 * `createClient`) — together with the authenticated user, in one call. Returns
 * `{ user: null }` when signed out, so callers bail exactly as they did with a
 * bare `getUser()`.
 */
export async function createActionClient() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  return { db, user: user ?? null };
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
