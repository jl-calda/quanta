"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace } from "@/server/actions/workspace";
import type { ActionResult } from "@/server/result";
import { SubmitButton, FormError } from "@/components/auth/controls";

type State = ActionResult<{ workspaceId: string; slug: string }> | null;

/** Slugify a workspace name the same way the server's generator does. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateWorkspaceForm({
  defaultName = "",
}: {
  defaultName?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState(slugify(defaultName));

  const [state, action] = useActionState(
    async (_prev: State, formData: FormData) => createWorkspace(formData),
    null as State,
  );

  useEffect(() => {
    if (state?.ok) router.push("/app");
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {!state?.ok && state?.error ? <FormError message={state.error} /> : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-12 font-medium text-ink">Workspace name</span>
        <input
          name="name"
          required
          value={name}
          placeholder="Acme Structural"
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className="h-9 rounded-sm border border-strong bg-raised px-2.5 text-14 text-ink outline-none placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
        />
        {!state?.ok && state?.fieldErrors?.name ? (
          <span className="text-12 text-error">{state.fieldErrors.name}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-12 font-medium text-ink">Handle</span>
        <div className="flex items-center gap-1.5 text-13 text-muted">
          <span>quanta.app/</span>
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="h-9 flex-1 rounded-sm border border-strong bg-raised px-2.5 text-14 text-ink outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </div>
        {!state?.ok && state?.fieldErrors?.slug ? (
          <span className="text-12 text-error">{state.fieldErrors.slug}</span>
        ) : null}
      </label>

      <SubmitButton>Create workspace</SubmitButton>
    </form>
  );
}
