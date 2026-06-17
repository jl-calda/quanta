"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ds";
import { updatePassword } from "@/server/actions/auth";
import type { ActionResult } from "@/server/result";
import { FormErrorInline, PasswordField, primaryBtn } from "./fields";

type State = ActionResult | null;

/**
 * Set a new password after following the recovery link. The link establishes a
 * recovery session via /auth/confirm; on success `updatePassword` redirects into
 * the app.
 */
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => updatePassword(formData),
    null,
  );

  const fieldError = state && !state.ok ? state.fieldErrors?.password : undefined;
  const generalError =
    state && !state.ok && !state.fieldErrors?.password ? state.error : undefined;

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {generalError ? <FormErrorInline>{generalError}</FormErrorInline> : null}
      <PasswordField
        id="rp-password"
        name="password"
        label="New password"
        value={password}
        onChange={setPassword}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        required
        error={fieldError}
      />
      <Button type="submit" variant="primary" fullWidth disabled={pending} style={primaryBtn}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
