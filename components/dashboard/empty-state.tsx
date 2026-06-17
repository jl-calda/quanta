import { Button } from "@/components/ds";
import { QuantaMark } from "@/components/quanta-mark";
import { NewWorksheetButton } from "./new-worksheet-button";
import { TemplateCard } from "./template-card";
import { ImportIcon } from "./icons";
import type { TemplateSummary } from "@/server/queries/dashboard";

/**
 * Brand-new account state (§4.2): a single clear call to action plus template
 * suggestions, rather than an empty grid.
 */
export function EmptyState({
  workspaceId,
  canCreate,
  templates,
}: {
  workspaceId: string;
  canCreate: boolean;
  templates: TemplateSummary[];
}) {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col items-center px-8 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-hairline bg-chrome">
        <QuantaMark size={34} className="text-accent" />
      </div>

      <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.01em] text-ink">
        Create your first worksheet
      </h1>
      <p className="mt-2 max-w-[440px] text-[13.5px] leading-relaxed text-muted">
        Write live math that tracks units and recalculates like a spreadsheet.
        Start from a blank page or a pre-built calculation below.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <NewWorksheetButton workspaceId={workspaceId} canCreate={canCreate} />
        <Button
          variant="secondary"
          disabled
          iconLeft={<ImportIcon size={16} />}
          title="Coming soon"
          style={{ height: 38 }}
        >
          Import a file
        </Button>
      </div>

      {templates.length > 0 && (
        <>
          <div className="mt-12 flex w-full items-center gap-4">
            <span className="h-px flex-1 bg-hairline" />
            <span className="text-[12.5px] text-muted">
              Or start from a template
            </span>
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <div className="mt-6 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {templates.slice(0, 3).map((template) => (
              <div key={template.id} className="flex justify-center">
                <TemplateCard
                  template={template}
                  workspaceId={workspaceId}
                  canCreate={canCreate}
                  scale={0.78}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
