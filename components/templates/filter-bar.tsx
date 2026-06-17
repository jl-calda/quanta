"use client";

import type { TemplateFacets } from "@/server/queries/templates";

export type FilterGroup = "discipline" | "standard" | "type";
export type ActiveFilters = Record<FilterGroup, string | undefined>;

const GROUPS: { key: FilterGroup; label: string }[] = [
  { key: "discipline", label: "Discipline" },
  { key: "standard", label: "Standard" },
  { key: "type", label: "Type" },
];

/**
 * The filter chip bar — one pill group per facet (Discipline / Standard / Type),
 * data-driven from the templates actually visible. Toggling a chip drives a URL
 * searchParam (handled by the gallery), so filters are server-rendered and
 * shareable per §4.4. Ported from the export's `FilterChip` row.
 */
export function FilterBar({
  facets,
  active,
  onToggle,
  onClear,
}: {
  facets: TemplateFacets;
  active: ActiveFilters;
  onToggle: (group: FilterGroup, value: string) => void;
  onClear: () => void;
}) {
  const anyActive = Boolean(active.discipline || active.standard || active.type);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        flexWrap: "wrap",
        padding: "12px 32px",
        borderBottom: "1px solid var(--border-hairline)",
        background: "var(--surface-paper)",
      }}
    >
      {GROUPS.map(({ key, label }) => {
        const values = facets[key];
        if (values.length === 0) return null;
        return (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                font: "600 11px/1 var(--font-sans)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {label}
            </span>
            {values.map((value) => {
              const on = active[key] === value;
              return (
                <button
                  key={value}
                  onClick={() => onToggle(key, value)}
                  aria-pressed={on}
                  style={{
                    height: 28,
                    padding: "0 11px",
                    borderRadius: 99,
                    cursor: "pointer",
                    border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
                    background: on ? "var(--accent-tint)" : "var(--surface-raised)",
                    color: on ? "var(--accent)" : "var(--text-primary)",
                    font: `${on ? "600" : "500"} 12px/1 var(--font-sans)`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        );
      })}
      {anyActive && (
        <button
          onClick={onClear}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            border: "none",
            background: "none",
            color: "var(--accent)",
            font: "500 12px/1 var(--font-sans)",
            cursor: "pointer",
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
