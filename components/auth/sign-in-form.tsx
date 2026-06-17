"use client";

import { useActionState, useState } from "react";
import {
  signInWithPassword,
  signInWithMagicLink,
  signInWithOAuth,
} from "@/server/actions/auth";
import type { ActionResult } from "@/server/result";
import { TextField, SubmitButton, FormError } from "./controls";
import { GoogleMark } from "./google-mark";

type State = ActionResult | null;

const initial: State = null;

export function SignInForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");

  const [pwState, pwAction] = useActionState(
    async (_prev: State, formData: FormData) => signInWithPassword(formData),
    initial,
  );
  const [magicState, magicAction] = useActionState(
    async (_prev: State, formData: FormData) => signInWithMagicLink(formData),
    initial,
  );

  const magicSent = magicState?.ok === true;

  return (
    <div className="flex flex-col gap-4">
      {/* Google OAuth — the action redirects the browser to the provider. */}
      <form action={signInWithOAuth}>
        <input type="hidden" name="provider" value="google" />
        <input type="hidden" name="next" value={next} />
        <SubmitButton variant="secondary">
          <GoogleMark /> Continue with Google
        </SubmitButton>
      </form>

      <div className="flex items-center gap-3 text-11 text-muted">
        <span className="h-px flex-1 bg-hairline" />
        or
        <span className="h-px flex-1 bg-hairline" />
      </div>

      {mode === "password" ? (
        <form action={pwAction} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          {!pwState?.ok && pwState?.error ? (
            <FormError message={pwState.error} />
          ) : null}
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            error={!pwState?.ok ? pwState?.fieldErrors?.email : undefined}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={!pwState?.ok ? pwState?.fieldErrors?.password : undefined}
          />
          <SubmitButton>Sign in</SubmitButton>
          <button
            type="button"
            onClick={() => setMode("magic")}
            className="self-start text-12 text-link underline-offset-2 hover:underline"
          >
            Email me a sign-in link instead
          </button>
        </form>
      ) : (
        <form action={magicAction} className="flex flex-col gap-3">
          {magicSent ? (
            <p className="rounded-sm border border-hairline bg-pass-bg px-3 py-2 text-12 text-pass">
              Check your inbox for a sign-in link.
            </p>
          ) : (
            <>
              {!magicState?.ok && magicState?.error ? (
                <FormError message={magicState.error} />
              ) : null}
              <TextField
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
                error={
                  !magicState?.ok ? magicState?.fieldErrors?.email : undefined
                }
              />
              <SubmitButton>Send sign-in link</SubmitButton>
            </>
          )}
          <button
            type="button"
            onClick={() => setMode("password")}
            className="self-start text-12 text-link underline-offset-2 hover:underline"
          >
            Use a password instead
          </button>
        </form>
      )}
    </div>
  );
}
