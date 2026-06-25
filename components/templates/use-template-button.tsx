"use client";

import { useMemo, useState, useTransition } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ds";
import { parseContent } from "@/lib/worksheet/content";
import { paramsForContent } from "@/lib/worksheet/template";
import { createWorksheet } from "@/server/actions/worksheet";
import { CreateFromTemplateDialog } from "./create-from-template-dialog";

/**
 * "Use template" — clones the template's content into a new worksheet (bumping
 * its usage_count server-side) and opens the editor. When the template declares
 * fill-in params (`{{tokens}}`), the click instead opens the fill-ins dialog,
 * which collects the values and creates with them. Reuses the shared
 * `createWorksheet` action. Disabled when the member can't create worksheets.
 */
export function UseTemplateButton({
  workspaceId,
  templateId,
  canCreate,
  templateContent,
  templateTitle = "Use template",
  variant = "primary",
  size = "md",
  iconLeft,
  style,
  children,
}: {
  workspaceId: string;
  templateId: string;
  canCreate: boolean;
  /** Raw template content (from GalleryTemplate.content) — used to detect
   * fill-in params. Omit to always create directly. */
  templateContent?: unknown;
  templateTitle?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Declared (or token-derived) fill-ins; an empty list keeps the direct path.
  const params = useMemo(
    () => (templateContent === undefined ? [] : paramsForContent(parseContent(templateContent))),
    [templateContent],
  );

  function activate() {
    if (!canCreate) return;
    if (params.length > 0) {
      setDialogOpen(true);
      return;
    }
    startTransition(async () => {
      const result = await createWorksheet({ workspaceId, templateId });
      if (result.ok) router.push(`/w/${result.data.id}`);
    });
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        iconLeft={iconLeft}
        style={style}
        disabled={!canCreate || pending}
        onClick={(e) => {
          e.stopPropagation();
          activate();
        }}
        title={
          canCreate
            ? undefined
            : "Ask an admin for engineer access to create worksheets."
        }
      >
        {children}
      </Button>
      {params.length > 0 && (
        <CreateFromTemplateDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          workspaceId={workspaceId}
          templateId={templateId}
          templateTitle={templateTitle}
          params={params}
        />
      )}
    </>
  );
}
