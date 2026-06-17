"use client";

import { useActionState } from "react";
import { signUpWithPassword, signInWithOAuth } from "@/server/actions/auth";
import type { ActionResult } from "@/server/result";
import { TextField, SubmitButton, FormError } from "./controls";
import { GoogleMark } from "./google-mark";

type State = ActionResult<{ needsConfirmation: boolean }> | null;

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState(
    async (_prev: State, formData: FormData) => signUpWithPassword(formData),
    null as State,
  );

  if (state?.ok && state.data.needsConfirmation) {
    return (
      <p className="rounded-sm border border-hairline bg-pass-bg px-3 py-3 text-13 text-pass">
        Almost there — we sent a confirmation link to your email. Open it to
        finish creating your account.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        {!state?.ok && state?.error ? <FormError message={state.error} /> : null}
        <TextField
          label="Name"
          name="fullName"
          autoComplete="name"
          error={!state?.ok ? state?.fieldErrors?.fullName : undefined}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={!state?.ok ? state?.fieldErrors?.email : undefined}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="At least 8 characters"
          error={!state?.ok ? state?.fieldErrors?.password : undefined}
        />
        <SubmitButton>Create account</SubmitButton>
      </form>
    </div>
  );
}
