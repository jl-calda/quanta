"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorksheet } from "@/server/actions/worksheet";
import { MiniPreview } from "./mini-preview";
import type { TemplateSummary } from "@/server/queries/dashboard";

/**
 * "Start from a template" card. Clicking creates a worksheet seeded from the
 * template's content and opens it in the editor. Disabled when the member can't
 * create worksheets. `scale` lets the empty-state grid render slightly smaller.
 */
export function TemplateCard({
  template,
  workspaceId,
  canCreate,
  scale = 0.95,
}: {
  template: TemplateSummary;
  workspaceId: string;
  canCreate: boolean;
  scale?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const category = template.discipline ?? template.standard ?? "Template";

  function create() {
    if (!canCreate) return;
    startTransition(async () => {
      const result = await createWorksheet({
        workspaceId,
        templateId: template.id,
      });
      if (result.ok) router.push(`/w/${result.data.id}`);
    });
  }

  return (
    <button
      type="button"
      onClick={create}
      disabled={!canCreate || pending}
      title={
        canCreate
          ? `Start from “${template.title}”`
          : "Ask an admin for engineer access to create worksheets."
      }
      className="tpl-card group w-[210px] flex-none cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-70"
    >
      <div
        className="tpl-thumb card-lift relative overflow-hidden rounded-md border border-hairline bg-raised"
        style={{ height: "var(--d-thumb)" }}
      >
        <MiniPreview seed={template.id} scale={scale} />
        <span className="absolute right-2 top-2 rounded-sm bg-accent-tint px-1.5 py-[3px] text-[10px] leading-none text-accent">
          Template
        </span>
      </div>
      <div className="px-0.5 pt-2.5">
        <div className="truncate text-13 font-semibold leading-snug text-ink">
          {template.title}
        </div>
        <div className="truncate text-[11.5px] leading-tight text-muted">
          {category}
        </div>
      </div>
    </button>
  );
}
