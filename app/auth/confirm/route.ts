import { NextResponse, type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Email confirmation / magic-link landing. Supabase appends `token_hash` and
 * `type`; we verify the OTP to establish a session, then continue. An expired
 * or already-used link returns to sign-in with a re-request hint.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/app";
  const safeNext = next.startsWith("/") ? next : "/app";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  const url = new URL("/sign-in", origin);
  url.searchParams.set(
    "error",
    "That link has expired. Request a new one and try again.",
  );
  return NextResponse.redirect(url);
}
