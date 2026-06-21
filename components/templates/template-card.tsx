import { Button } from "@/components/ds";
import type { GalleryTemplate } from "@/server/queries/templates";
import { TemplateThumb } from "./template-thumb";
import { Byline } from "./byline";
import { Chip } from "./chip";
import { UseTemplateButton } from "./use-template-button";
import { fmtUses } from "./format";
import { FlameIcon, UsersIcon, EyeIcon, PlusIcon } from "./icons";

/**
 * A single template card — math thumbnail with hover-reveal actions, title +
 * 2-line description, discipline/standard/type chips, and a provenance/uses
 * footer. Ported 1:1 from the export's `Card`. Hover transitions live in CSS
 * (`.tpl-card`) so the card stays render-only.
 */
export function TemplateCard({
  template,
  workspaceId,
  canCreate,
  onPreview,
}: {
  template: GalleryTemplate;
  workspaceId: string;
  canCreate: boolean;
  onPreview: (template: GalleryTemplate) => void;
}) {
  // Curated Quanta-official templates (no author) carry the "Featured" flame.
  const featured = !template.author_id;

  return (
    <div
      className="tpl-gallery-card"
      style={{
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-raised)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* thumbnail */}
      <div style={{ position: "relative", height: 168, borderBottom: "1px solid var(--border-hairline)" }}>
        <TemplateThumb seed={template.id} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, transparent 55%, var(--surface-raised))",
          }}
        />
        {featured && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              font: "10px/1 var(--font-sans)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--status-warning)",
              background: "var(--status-warning-bg)",
              borderRadius: 4,
              padding: "3px 6px",
            }}
          >
            <FlameIcon size={12} />
            Featured
          </span>
        )}
        {/* hover actions */}
        <div
          className="hover-actions"
          style={{ position: "absolute", left: 12, right: 12, bottom: 12, display: "flex", gap: 8, zIndex: 2 }}
        >
          <UseTemplateButton
            workspaceId={workspaceId}
            templateId={template.id}
            canCreate={canCreate}
            size="sm"
            style={{ flex: 1, height: 32 }}
            iconLeft={<PlusIcon size={15} />}
          >
            Use template
          </UseTemplateButton>
          <Button
            variant="secondary"
            size="sm"
            style={{ height: 32 }}
            iconLeft={<EyeIcon size={15} />}
            onClick={() => onPreview(template)}
          >
            Preview
          </Button>
        </div>
      </div>

      {/* body */}
      <div style={{ padding: "13px 15px 14px", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3 style={{ margin: 0, font: "600 14px/1.32 var(--font-sans)", color: "var(--text-primary)" }}>
          {template.title}
        </h3>
        {template.description && (
          <p
            style={{
              margin: "6px 0 0",
              font: "12px/1.45 var(--font-sans)",
              color: "var(--text-muted)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {template.description}
          </p>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 11 }}>
          {template.discipline && <Chip tone="accent">{template.discipline}</Chip>}
          {template.standard && <Chip>{template.standard}</Chip>}
          {template.template_type && <Chip>{template.template_type}</Chip>}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginTop: 13,
            paddingTop: 12,
            borderTop: "1px solid var(--border-hairline)",
          }}
        >
          <Byline authorId={template.author_id} authorName={template.authorName} />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              font: "11.5px/1 var(--font-mono)",
              color: "var(--text-muted)",
            }}
          >
            <UsersIcon size={13} />
            {fmtUses(template.usage_count)}
          </span>
        </div>
      </div>
    </div>
  );
}
