"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TemplateTab } from "@/lib/schema/templates";
import type {
  GalleryTemplate,
  TemplateCounts,
  TemplateFacets,
  TemplateOption,
  WorksheetOption,
} from "@/server/queries/templates";
import { TemplateCard } from "./template-card";
import { GalleryTabs } from "./gallery-tabs";
import { FilterBar, type FilterGroup } from "./filter-bar";
import { SearchInput } from "./search-input";
import { PreviewDrawer } from "./preview-drawer";
import { SaveAsTemplateDialog } from "./save-as-template-dialog";

export interface TemplateGalleryProps {
  workspaceId: string;
  canCreate: boolean;
  worksheets: WorksheetOption[];
  myTemplates: TemplateOption[];
  templates: GalleryTemplate[];
  facets: TemplateFacets;
  counts: TemplateCounts;
  tab: TemplateTab;
  active: Record<FilterGroup, string | undefined>;
  query: string;
  initialPreviewId?: string;
}

/**
 * Template gallery (§4.4) — the filterable grid, tabs, search, and preview
 * drawer. Filters/search/tab live in the URL searchParams (server-rendered,
 * shareable); this client island just translates interactions into URL updates
 * and owns the transient preview-drawer state.
 */
export function TemplateGallery({
  workspaceId,
  canCreate,
  worksheets,
  myTemplates,
  templates,
  facets,
  counts,
  tab,
  active,
  query,
  initialPreviewId,
}: TemplateGalleryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<GalleryTemplate | null>(null);

  // Honour a ?preview=<id> deep link (e.g. a copied preview link).
  useEffect(() => {
    if (!initialPreviewId) return;
    const match = templates.find((t) => t.id === initialPreviewId);
    if (match) setPreview(match);
    // Only on first mount / when the deep-link id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPreviewId]);

  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  const onSearch = (q: string) => setParams({ q: q || null });
  const onSelectTab = (next: TemplateTab) =>
    setParams({ tab: next === "all" ? null : next, discipline: null, standard: null, type: null });
  const onToggle = (group: FilterGroup, value: string) =>
    setParams({ [group]: active[group] === value ? null : value });
  const onClear = () => setParams({ discipline: null, standard: null, type: null });

  return (
    <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column", height: "100%" }}>
      {/* top bar */}
      <header
        style={{
          flex: "0 0 auto",
          padding: "20px 32px 0",
          borderBottom: "1px solid var(--border-hairline)",
          background: "var(--surface-paper)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 16 }}>
          <div style={{ flex: "0 0 auto" }}>
            <h1
              style={{
                margin: 0,
                font: "600 22px/1.2 var(--font-sans)",
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
              }}
            >
              Templates
            </h1>
            <div style={{ font: "12.5px/1.3 var(--font-sans)", color: "var(--text-muted)", marginTop: 3 }}>
              Verified, ready-to-run calculations — start in one click.
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
            {canCreate && (
              <SaveAsTemplateDialog
                workspaceId={workspaceId}
                worksheets={worksheets}
                myTemplates={myTemplates}
              />
            )}
            <SearchInput initialQuery={query} onSearch={onSearch} />
          </div>
        </div>

        <GalleryTabs tab={tab} counts={counts} onSelect={onSelectTab} />
      </header>

      {/* filter bar */}
      <FilterBar facets={facets} active={active} onToggle={onToggle} onClear={onClear} />

      {/* grid */}
      <div className="scroll-y" style={{ flex: 1, minHeight: 0, background: "var(--surface-paper)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "22px 32px 48px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ font: "13px/1 var(--font-sans)", color: "var(--text-muted)" }}>
              {templates.length} {templates.length === 1 ? "template" : "templates"}
              {tab === "mine" ? " saved" : ""}
            </span>
            <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
              Sorted by{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>most used</span>
            </span>
          </div>

          {templates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 0", color: "var(--text-muted)" }}>
              <div
                style={{ font: "600 15px/1.3 var(--font-sans)", color: "var(--text-primary)", marginBottom: 6 }}
              >
                {tab === "mine" ? "No templates yet" : "No templates match those filters"}
              </div>
              <div style={{ font: "13px/1.5 var(--font-sans)" }}>
                {tab === "mine"
                  ? "Save a worksheet as a template to find it here."
                  : "Try clearing a filter to widen the search."}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(286px, 1fr))",
                gap: 18,
                opacity: isPending ? 0.6 : 1,
                transition: "opacity var(--dur-base) var(--ease-out)",
              }}
            >
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  workspaceId={workspaceId}
                  canCreate={canCreate}
                  onPreview={setPreview}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <PreviewDrawer
        template={preview}
        workspaceId={workspaceId}
        canCreate={canCreate}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
