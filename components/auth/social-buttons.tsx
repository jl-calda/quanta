"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Input } from "@/components/ds";
import { signInWithOAuth, signInWithSSO } from "@/server/actions/auth";
import type { ActionResult } from "@/server/result";
import { GoogleIcon, KeyIcon } from "./icons";
import { Field, fieldContainer, fieldInput, socialBtn } from "./fields";

/**
 * Google OAuth + enterprise SSO. Google redirects the browser to the provider
 * via a Server Action; SSO expands to collect the organization's email domain
 * (`signInWithSSO` resolves the IdP URL, then we hand the browser off to it).
 */

type SsoState = ActionResult<{ url: string }> | null;

function SsoButton({ next }: { next: string }) {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [state, action, pending] = useActionState<SsoState, FormData>(
    async (_prev, formData) => signInWithSSO(formData),
    null,
  );

  useEffect(() => {
    if (state?.ok) window.location.href = state.data.url;
  }, [state]);

  if (!open) {
    return (
      <Button
        variant="secondary"
        fullWidth
        iconLeft={<KeyIcon />}
        style={socialBtn}
        onClick={() => setOpen(true)}
      >
        Continue with SSO
      </Button>
    );
  }

  const error = state && !state.ok ? state.fieldErrors?.domain ?? state.error : undefined;

  return (
    <form
      action={action}
      className="auth-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <input type="hidden" name="next" value={next} />
      <Field label="Organization domain" htmlFor="sso-domain" error={error}>
        <Input
          id="sso-domain"
          name="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="acme.com"
          autoComplete="off"
          autoFocus
          invalid={!!error}
          containerStyle={fieldContainer}
          style={fieldInput}
        />
      </Field>
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          type="submit"
          variant="primary"
          disabled={pending}
          style={{ ...socialBtn, flex: 1 }}
        >
          {pending ? "Connecting…" : "Continue with SSO"}
        </Button>
        <Button type="button" variant="ghost" style={socialBtn} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function SocialButtons({ next }: { next: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <form action={signInWithOAuth}>
        <input type="hidden" name="provider" value="google" />
        <input type="hidden" name="next" value={next} />
        <Button
          type="submit"
          variant="secondary"
          fullWidth
          iconLeft={<GoogleIcon />}
          style={socialBtn}
        >
          Continue with Google
        </Button>
      </form>
      <SsoButton next={next} />
    </div>
  );
}
