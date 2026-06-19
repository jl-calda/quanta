"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ds";
import type { ButtonVariant } from "@/components/ds";
import { createWorksheet } from "@/server/actions/worksheet";

/**
 * Client action wrappers for the empty-state cards. Each card's one action is
 * wired to the relevant real behavior — a Server Action where one exists, real
 * navigation otherwise — never a dead end (Mockup 4.12).
 */

/**
 * "New worksheet" — calls the `createWorksheet` Server Action and opens the new
 * sheet (mirrors `components/dashboard/new-worksheet-button.tsx`). Signed-out
 * (no workspace) routes to sign-in; a role that can't create renders disabled
 * with the same guidance tooltip the dashboard uses.
 */
export function NewWorksheetAction({
  workspaceId,
  canCreate,
}: {
  workspaceId: string | null;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    if (!workspaceId) {
      router.push("/sign-in");
      return;
    }
    startTransition(async () => {
      const result = await createWorksheet({ workspaceId });
      if (result.ok) router.push(`/w/${result.data.id}`);
      else setError(result.error);
    });
  }

  const blocked = workspaceId !== null && !canCreate;
  const disabled = blocked || pending;

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <Button
        variant="primary"
        onClick={create}
        disabled={disabled}
        title={
          blocked
            ? "Ask an admin for engineer access to create worksheets."
            : undefined
        }
      >
        New worksheet
      </Button>
      {error && (
        <span
          role="alert"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 240,
            font: "12px/1.45 var(--font-sans)",
            color: "var(--status-error)",
            background: "var(--surface-raised)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 10px",
            boxShadow: "var(--shadow-popover)",
            zIndex: 10,
          }}
        >
          {error}
        </span>
      )}
    </span>
  );
}

/**
 * A `Button` that navigates on click — a single focusable control, avoiding a
 * focusable `<button>` nested inside a focusable `<a>`.
 */
export function LinkButton({
  href,
  variant = "secondary",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Button variant={variant} onClick={() => router.push(href)}>
      {children}
    </Button>
  );
}
