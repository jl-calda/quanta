import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / SSO callback. The provider redirects here with a `code` we exchange
 * for a session (PKCE). On success, continue to `next` (default /app); on
 * failure, return to sign-in with a friendly message.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";
  const safeNext = next.startsWith("/") ? next : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  const url = new URL("/sign-in", origin);
  url.searchParams.set(
    "error",
    "We couldn't finish signing you in. Try again.",
  );
  return NextResponse.redirect(url);
}
