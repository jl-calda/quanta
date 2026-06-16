import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

type CookiesToSet = { name: string; value: string; options: CookieOptions }[];

/**
 * Refresh the Supabase auth session on every request and forward the rotated
 * cookies to both the request (for this render) and the response (for the
 * browser). Call this from the root middleware.
 *
 * IMPORTANT: do not run logic between creating the client and calling
 * `getUser()` — that is what keeps the session token fresh.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh the session. Keep this call immediately after client creation.
  await supabase.auth.getUser();

  return supabaseResponse;
}
