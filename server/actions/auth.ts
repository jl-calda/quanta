"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import {
  signInSchema,
  signUpSchema,
  magicLinkSchema,
  oauthProviderSchema,
  ssoSchema,
} from "@/lib/schema/auth";
import { ok, err, fieldErrorsFromZod, type ActionResult } from "@/server/result";

/**
 * Translate a Supabase auth error into the app's voice. We never surface the
 * raw provider message verbatim for the common cases.
 */
function authMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password don't match.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the link.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "That email already has an account. Sign in instead.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  return message;
}

// --- Email + password ------------------------------------------------------

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "/app";
  return next.startsWith("/") ? next : "/app";
}

export async function signInWithPassword(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error.issues),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return err(authMessage(error.message));

  // Session cookies are set on the response; land the user where they headed.
  redirect(safeNext(formData.get("next")));
}

export async function signUpWithPassword(
  formData: FormData,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName") || undefined,
  });
  if (!parsed.success) {
    return err(
      "Check the highlighted fields.",
      fieldErrorsFromZod(parsed.error.issues),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: parsed.data.fullName ? { full_name: parsed.data.fullName } : undefined,
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
    },
  });
  if (error) return err(authMessage(error.message));

  // When email confirmation is off, a session is returned immediately — land
  // the user in the app. Otherwise tell them to check their inbox.
  if (data.session) {
    redirect(safeNext(formData.get("next")));
  }
  return ok({ needsConfirmation: true });
}

// --- Magic link ------------------------------------------------------------

export async function signInWithMagicLink(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return err(
      "Check your email address.",
      fieldErrorsFromZod(parsed.error.issues),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/confirm` },
  });
  if (error) return err(authMessage(error.message));

  return ok(undefined);
}

// --- OAuth (Google) --------------------------------------------------------

export async function signInWithOAuth(formData: FormData): Promise<void> {
  const provider = oauthProviderSchema.parse(formData.get("provider"));
  const next = (formData.get("next") as string) || "/app";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    redirect(`/sign-in?error=${encodeURIComponent("Couldn't start Google sign-in. Try again.")}`);
  }
  redirect(data.url);
}

// --- Enterprise SSO (SAML) -------------------------------------------------

export async function signInWithSSO(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const parsed = ssoSchema.safeParse({ domain: formData.get("domain") });
  if (!parsed.success) {
    return err(
      "Check your organization domain.",
      fieldErrorsFromZod(parsed.error.issues),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithSSO({
    domain: parsed.data.domain,
    options: { redirectTo: `${getSiteUrl()}/auth/callback` },
  });
  if (error || !data?.url) {
    return err(
      "We couldn't find single sign-on for that domain. Check with your admin.",
    );
  }
  // The client redirects the browser to the IdP using the returned URL.
  return ok({ url: data.url });
}

// --- Sign out --------------------------------------------------------------

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
