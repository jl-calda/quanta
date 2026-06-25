"use client";

import type { TemplateTab } from "@/lib/schema/templates";
import type { TemplateCounts } from "@/server/queries/templates";

/**
 * The All / Your-templates tab pair with mono count pills and a 2px blueprint
 * underline on the active tab (ported from the export's `Tab`).
 */
export function GalleryTabs({
  tab,
  counts,
  onSelect,
}: {
  tab: TemplateTab;
  counts: TemplateCounts;
  onSelect: (tab: TemplateTab) => void;
}) {
  const items: { id: TemplateTab; label: string; count: number }[] = [
    { id: "all", label: "All templates", count: counts.all },
    { id: "mine", label: "Your templates", count: counts.mine },
    { id: "public", label: "Public gallery", count: counts.public },
  ];

  return (
    <div style={{ display: "flex", gap: 22, marginBottom: -1 }} role="tablist">
      {items.map((it) => {
        const on = tab === it.id;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(it.id)}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "0 2px",
              height: 38,
              border: "none",
              background: "none",
              cursor: "pointer",
              color: on ? "var(--text-primary)" : "var(--text-muted)",
              font: `${on ? "600" : "500"} 13.5px/1 var(--font-sans)`,
            }}
          >
            {it.label}
            <span
              style={{
                font: "11px/1 var(--font-mono)",
                color: "var(--text-muted)",
                background: "var(--surface-chrome)",
                border: "1px solid var(--border-hairline)",
                borderRadius: 99,
                padding: "2px 6px",
              }}
            >
              {it.count}
            </span>
            {on && (
              <span
                style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: "var(--accent)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
