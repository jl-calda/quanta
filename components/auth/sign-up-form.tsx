"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Checkbox } from "@/components/ds";
import { signUpWithPassword } from "@/server/actions/auth";
import type { ActionResult } from "@/server/result";
import {
  Divider,
  FormErrorInline,
  PasswordField,
  SuccessNote,
  TextField,
  primaryBtn,
} from "./fields";
import { SocialButtons } from "./social-buttons";

type State = ActionResult<{ needsConfirmation: boolean }> | null;

export function SignUpForm({ next }: { next: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);

  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => signUpWithPassword(formData),
    null,
  );

  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setDismissed(false);
  }, [state]);

  if (state?.ok && state.data.needsConfirmation) {
    return (
      <SuccessNote>
        Almost there — we sent a confirmation link to {email || "your email"}. Open
        it to finish creating your account.
      </SuccessNote>
    );
  }

  const errs = !dismissed && state && !state.ok ? state : null;
  const fieldErrors = errs?.fieldErrors;
  const generalError =
    errs && !fieldErrors?.fullName && !fieldErrors?.email && !fieldErrors?.password
      ? errs.error
      : undefined;

  const edit = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setDismissed(true);
  };

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="next" value={next} />

      {generalError ? <FormErrorInline>{generalError}</FormErrorInline> : null}

      <TextField
        id="ca-name"
        name="fullName"
        label="Full name"
        value={name}
        onChange={edit(setName)}
        placeholder="Nadia Brunel"
        autoComplete="name"
        required
        error={fieldErrors?.fullName}
      />

      <TextField
        id="ca-email"
        name="email"
        label="Work email"
        type="email"
        value={email}
        onChange={edit(setEmail)}
        placeholder="you@firm.com"
        autoComplete="email"
        required
        error={fieldErrors?.email}
      />

      <TextField
        id="ca-company"
        name="company"
        label="Company"
        value={company}
        onChange={edit(setCompany)}
        placeholder="Brunel Partners"
        autoComplete="organization"
        error={fieldErrors?.company}
      />

      <PasswordField
        id="ca-password"
        name="password"
        label="Password"
        value={password}
        onChange={edit(setPassword)}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        required
        error={fieldErrors?.password}
      />

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          cursor: "pointer",
          marginTop: 2,
        }}
      >
        <span style={{ marginTop: 1 }}>
          <Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        </span>
        <span style={{ font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
          I agree to Quanta&rsquo;s{" "}
          <Link href="/terms" className="auth-link">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="auth-link">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={!agree || pending}
        style={primaryBtn}
      >
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <Divider />
      <SocialButtons next={next} />
    </form>
  );
}
