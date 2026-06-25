"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch, IconButton } from "@/components/ds";
import { featureTemplate, archiveTemplate } from "@/server/actions/templates";
import { ArchiveIcon, ArchiveRestoreIcon } from "./icons";

/**
 * Admins-only curation row on a template card — feature toggle + archive/restore.
 * Both call the `set_template_curation` RPC (via the server actions), which
 * re-checks the caller is a workspace admin, so this control never grants access;
 * a denial surfaces in the app's voice. On success we `router.refresh()` so the
 * grid re-sorts featured-first and drops/restores the archived row. Rendered only
 * for curatable workspace templates (see `TemplateCard`).
 */
export function CurationControls({
  templateId,
  isFeatured,
  isArchived,
}: {
  templateId: string;
  isFeatured: boolean;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.error ?? "We couldn't update the template. Try again.");
    });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid var(--border-hairline)",
      }}
      // Curation lives below the card's primary actions; keep clicks local.
      onClick={(e) => e.stopPropagation()}
    >
      <Switch
        checked={isFeatured}
        disabled={pending}
        label="Featured"
        onChange={(e) =>
          run(() => featureTemplate(templateId, e.currentTarget.checked))
        }
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {error && (
          <span
            style={{
              font: "11.5px/1.3 var(--font-sans)",
              color: "var(--status-error)",
            }}
          >
            {error}
          </span>
        )}
        <IconButton
          label={isArchived ? "Restore template" : "Archive template"}
          size="sm"
          disabled={pending}
          onClick={() => run(() => archiveTemplate(templateId, !isArchived))}
        >
          {isArchived ? (
            <ArchiveRestoreIcon size={16} />
          ) : (
            <ArchiveIcon size={16} />
          )}
        </IconButton>
      </div>
    </div>
  );
}
