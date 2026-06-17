"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ds";
import {
  signInWithPassword,
  signInWithMagicLink,
  requestPasswordReset,
} from "@/server/actions/auth";
import type { ActionResult } from "@/server/result";
import {
  Divider,
  FormErrorInline,
  PasswordField,
  SuccessNote,
  TextField,
  primaryBtn,
} from "./fields";
import { ArrowIcon } from "./icons";
import { SocialButtons } from "./social-buttons";

type State = ActionResult | null;

export function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [pwState, pwAction, pwPending] = useActionState<State, FormData>(
    async (_prev, formData) => signInWithPassword(formData),
    null,
  );
  const [magicState, magicAction, magicPending] = useActionState<State, FormData>(
    async (_prev, formData) => signInWithMagicLink(formData),
    null,
  );
  const [resetState, resetAction, resetPending] = useActionState<State, FormData>(
    async (_prev, formData) => requestPasswordReset(formData),
    null,
  );

  // Errors clear the moment the user edits the credentials (mockup behavior).
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setDismissed(false);
  }, [pwState]);

  const onEditEmail = (v: string) => {
    setEmail(v);
    setDismissed(true);
  };
  const onEditPassword = (v: string) => {
    setPassword(v);
    setDismissed(true);
  };

  const pwErr = !dismissed && pwState && !pwState.ok ? pwState : null;
  const emailError = pwErr?.fieldErrors?.email;
  const generalError =
    pwErr && !pwErr.fieldErrors?.email && !pwErr.fieldErrors?.password
      ? pwErr.error
      : undefined;
  const isMismatch = generalError ? /match/i.test(generalError) : false;
  const topError = generalError && !isMismatch ? generalError : undefined;

  const sendMagic = () => {
    const fd = new FormData();
    fd.set("email", email);
    fd.set("next", next);
    magicAction(fd);
  };
  const sendReset = () => {
    const fd = new FormData();
    fd.set("email", email);
    resetAction(fd);
  };

  const passwordError =
    pwErr?.fieldErrors?.password ??
    (isMismatch ? (
      <span>
        {generalError}{" "}
        <button
          type="button"
          className="auth-link"
          onClick={sendReset}
          style={{ color: "var(--status-error)", fontWeight: 500 }}
        >
          Reset it
        </button>
      </span>
    ) : undefined);

  const forgotLink = (
    <button
      type="button"
      className="auth-link"
      onClick={sendReset}
      disabled={resetPending}
      style={{ font: "12px/1 var(--font-sans)" }}
    >
      Forgot password
    </button>
  );

  const magicSent = magicState?.ok === true;
  const magicError =
    magicState && !magicState.ok
      ? magicState.fieldErrors?.email ?? magicState.error
      : undefined;

  const resetSent = resetState?.ok === true;
  const resetError =
    resetState && !resetState.ok
      ? resetState.fieldErrors?.email ?? resetState.error
      : undefined;

  return (
    <form action={pwAction} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <input type="hidden" name="next" value={next} />

      {topError ? <FormErrorInline>{topError}</FormErrorInline> : null}

      <TextField
        id="si-email"
        name="email"
        label="Work email"
        type="email"
        value={email}
        onChange={onEditEmail}
        placeholder="you@firm.com"
        autoComplete="email"
        required
        error={emailError}
      />

      <PasswordField
        id="si-password"
        name="password"
        label="Password"
        value={password}
        onChange={onEditPassword}
        placeholder="Enter your password"
        autoComplete="current-password"
        required
        error={passwordError}
        link={forgotLink}
      />

      <Button type="submit" variant="primary" fullWidth disabled={pwPending} style={primaryBtn}>
        {pwPending ? "Signing in…" : "Sign in"}
      </Button>

      {resetSent ? (
        <SuccessNote>
          If an account exists for {email || "that address"}, a reset link is on its
          way. Check your inbox to set a new password.
        </SuccessNote>
      ) : resetError ? (
        <FormErrorInline>{resetError}</FormErrorInline>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginTop: -4,
        }}
      >
        {magicSent ? (
          <SuccessNote>Magic link sent to {email}. Check your inbox.</SuccessNote>
        ) : (
          <>
            <button
              type="button"
              className="auth-link"
              onClick={sendMagic}
              disabled={magicPending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                font: "13px/1 var(--font-sans)",
              }}
            >
              {magicPending ? (
                "Sending…"
              ) : (
                <>
                  Sign in with magic link <ArrowIcon />
                </>
              )}
            </button>
            {magicError ? (
              <span style={{ color: "var(--status-error)", font: "12px/1.4 var(--font-sans)" }}>
                {magicError}
              </span>
            ) : null}
          </>
        )}
      </div>

      <Divider />
      <SocialButtons next={next} />
    </form>
  );
}
