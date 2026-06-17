"use client";

import { useTransition } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ds";
import { createWorksheet } from "@/server/actions/worksheet";

/**
 * "Use template" — clones the template's content into a new worksheet (bumping
 * its usage_count server-side) and opens the editor. Reuses the shared
 * `createWorksheet` action. Disabled when the member can't create worksheets.
 */
export function UseTemplateButton({
  workspaceId,
  templateId,
  canCreate,
  variant = "primary",
  size = "md",
  iconLeft,
  style,
  children,
}: {
  workspaceId: string;
  templateId: string;
  canCreate: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function use() {
    if (!canCreate) return;
    startTransition(async () => {
      const result = await createWorksheet({ workspaceId, templateId });
      if (result.ok) router.push(`/w/${result.data.id}`);
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      iconLeft={iconLeft}
      style={style}
      disabled={!canCreate || pending}
      onClick={(e) => {
        e.stopPropagation();
        use();
      }}
      title={
        canCreate
          ? undefined
          : "Ask an admin for engineer access to create worksheets."
      }
    >
      {children}
    </Button>
  );
}
