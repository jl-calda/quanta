import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";
import type { Database } from "./types";

type CookiesToSet = { name: string; value: string; options: CookieOptions }[];

// Routes that require an authenticated user. The editor (/w/[id]), onboarding,
// and account areas all live behind sign-in.
const PROTECTED_PREFIXES = ["/app", "/w", "/worksheets", "/onboarding"];
// Auth screens an already-signed-in user should be bounced away from.
const AUTH_ROUTES = ["/sign-in", "/sign-up"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Refresh the Supabase auth session on every request, forward the rotated
 * cookies, and gate access: unauthenticated users hitting a protected route are
 * redirected to /sign-in (preserving the destination); authenticated users
 * hitting /sign-in or /sign-up are sent to /app.
 *
 * IMPORTANT: do not run logic between creating the client and calling
 * `getUser()` — that is what keeps the session token fresh.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.search = "";
    // Round-trip the originally requested path so we can return after sign-in.
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
