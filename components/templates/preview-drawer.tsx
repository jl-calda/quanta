"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { IconButton } from "@/components/ds";
import { parseContent } from "@/lib/worksheet/content";
import type { GalleryTemplate } from "@/server/queries/templates";
import { TemplateThumb } from "./template-thumb";
import { Byline } from "./byline";
import { Chip } from "./chip";
import { UseTemplateButton } from "./use-template-button";
import { fmtUses, variantFor } from "./format";
import { CloseIcon, UsersIcon, LinkIcon, PlusIcon } from "./icons";

// The read-only preview pulls in the editor renderer (mathjs + KaTeX), so it's
// loaded only when a template with real content is actually previewed.
const ReadOnlyPreview = dynamic(
  () => import("./read-only-preview").then((m) => m.ReadOnlyPreview),
  {
    ssr: false,
    loading: () => (
      <div
        className="scroll-y"
        style={{ flex: 1, minHeight: 0, background: "#E7EAEF" }}
      />
    ),
  },
);

/**
 * Preview drawer (§4.4) — a right-side slide-in showing the template read-only.
 * When the template has real content the body renders the editor's read-only
 * Canvas; otherwise it falls back to the seeded math-thumbnail "pages" (the
 * export look, since the starter templates ship empty). Closes on Escape / scrim.
 */
export function PreviewDrawer({
  template,
  workspaceId,
  canCreate,
  onClose,
}: {
  template: GalleryTemplate | null;
  workspaceId: string;
  canCreate: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!template) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [template, onClose]);

  useEffect(() => setCopied(false), [template]);

  if (!template) return null;

  const parsedContent = parseContent(template.content);
  const hasContent = parsedContent.rows.length > 0;
  const meta = parsedContent.template;
  // Newest-first changelog for the preview (most recent revision at the top).
  const changelog = meta ? [...meta.changelog].reverse() : [];
  const v = variantFor(template.id);

  function copyLink() {
    if (!template) return;
    const url = `${window.location.origin}/templates?preview=${template.id}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <>
      <div
        className="overlay"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "color-mix(in srgb, var(--ink) 42%, transparent)",
          zIndex: 80,
        }}
      />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${template.title}`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 540,
          maxWidth: "92vw",
          background: "var(--surface-chrome)",
          borderLeft: "1px solid var(--border-strong)",
          boxShadow: "var(--shadow-modal)",
          zIndex: 81,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "16px 18px",
            borderBottom: "1px solid var(--border-hairline)",
            background: "var(--surface-raised)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                font: "600 11px/1 var(--font-sans)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 6,
              }}
            >
              Template preview
            </div>
            <h2 style={{ margin: 0, font: "600 17px/1.3 var(--font-sans)", color: "var(--text-primary)" }}>
              {template.title}
            </h2>
            {template.description && (
              <p style={{ margin: "7px 0 0", font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
                {template.description}
              </p>
            )}
          </div>
          <IconButton label="Close preview" onClick={onClose}>
            <CloseIcon size={18} />
          </IconButton>
        </div>

        {/* metadata strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            padding: "12px 18px",
            borderBottom: "1px solid var(--border-hairline)",
            background: "var(--surface-raised)",
          }}
        >
          <Byline authorId={template.author_id} authorName={template.authorName} size="lg" />
          <span style={{ width: 1, height: 16, background: "var(--border-hairline)" }} />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              font: "12px/1 var(--font-sans)",
              color: "var(--text-muted)",
            }}
          >
            <UsersIcon size={14} />
            {fmtUses(template.usage_count)} uses
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto", alignItems: "center" }}>
            {meta && (
              <span
                title={`Revision ${meta.revision}`}
                style={{
                  font: "600 11px/1 var(--font-mono)",
                  color: "var(--accent)",
                  background: "var(--accent-tint)",
                  borderRadius: 4,
                  padding: "3px 6px",
                }}
              >
                v{meta.revision}
              </span>
            )}
            {template.category && <Chip tone="accent">{template.category}</Chip>}
            {template.discipline && <Chip tone="accent">{template.discipline}</Chip>}
            {template.standard && <Chip>{template.standard}</Chip>}
            {template.template_type && <Chip>{template.template_type}</Chip>}
            {template.tags.map((tag) => (
              <Chip key={tag}>#{tag}</Chip>
            ))}
          </div>
        </div>

        {/* version history — published revisions, newest first */}
        {changelog.length > 0 && (
          <div
            style={{
              padding: "11px 18px",
              borderBottom: "1px solid var(--border-hairline)",
              background: "var(--surface-raised)",
            }}
          >
            <div
              style={{
                font: "600 11px/1 var(--font-sans)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              Version history
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {changelog.map((c) => (
                <li
                  key={c.revision}
                  style={{ display: "flex", gap: 8, font: "12px/1.4 var(--font-sans)", color: "var(--text-primary)" }}
                >
                  <span style={{ font: "600 11.5px/1.4 var(--font-mono)", color: "var(--accent)", flex: "0 0 auto" }}>
                    v{c.revision}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>{c.label ?? "Updated"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* body — real content read-only, or seeded thumbnail pages */}
        {hasContent ? (
          <ReadOnlyPreview templateId={template.id} title={template.title} content={template.content} />
        ) : (
          <div className="scroll-y" style={{ flex: 1, minHeight: 0, padding: "20px 0", background: "#E7EAEF" }}>
            {[v, (v + 1) % 8].map((variant, i) => (
              <div
                key={i}
                style={{
                  width: 392,
                  margin: "0 auto 18px",
                  background: "var(--surface-paper)",
                  border: "1px solid var(--border-strong)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 18px",
                    borderBottom: "1px solid var(--border-hairline)",
                    font: "8px/1 var(--font-sans)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>Quanta</span>
                  <span>Template</span>
                </div>
                <div style={{ minHeight: 300 }}>
                  <TemplateThumb variant={variant} scale={1.7} />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 18px",
                    borderTop: "1px solid var(--border-hairline)",
                    font: "8px/1 var(--font-sans)",
                    color: "var(--text-muted)",
                  }}
                >
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}
                  >
                    {template.title}
                  </span>
                  <span>Page {i + 1} of 2</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* sticky footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            borderTop: "1px solid var(--border-hairline)",
            background: "var(--surface-raised)",
          }}
        >
          <IconButton label={copied ? "Link copied" : "Copy link"} onClick={copyLink}>
            <LinkIcon size={18} />
          </IconButton>
          {copied && (
            <span style={{ font: "12px/1 var(--font-sans)", color: "var(--status-pass)" }}>Copied</span>
          )}
          <div style={{ flex: 1 }} />
          <UseTemplateButton
            workspaceId={workspaceId}
            templateId={template.id}
            canCreate={canCreate}
            templateContent={template.content}
            templateTitle={template.title}
            iconLeft={<PlusIcon size={16} />}
          >
            Use template
          </UseTemplateButton>
        </div>
      </aside>
    </>
  );
}
