"use client";

import type { ReferenceItem } from "@/lib/calc/reference";
import { Highlight } from "./highlight";
import { SearchIcon, CloseIcon } from "./icons";

/**
 * Center pane (380px): the search field, a results counter, and the matching
 * items. Each row shows the signature + a tag chip + the description, with the
 * query highlighted. Empty query → the selected category; no matches → an empty
 * state. Ported from the mockup's `ItemList`.
 */
export function ItemList({
  items,
  selectedId,
  onSelect,
  query,
  onQuery,
  categoryLabel,
}: {
  items: ReferenceItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQuery: (q: string) => void;
  categoryLabel: string;
}) {
  return (
    <div
      style={{
        flex: "0 0 380px",
        width: 380,
        borderRight: "1px solid var(--border-hairline)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "var(--surface-paper)",
      }}
    >
      {/* search */}
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border-hairline)" }}>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
              display: "inline-flex",
            }}
          >
            <SearchIcon size={16} />
          </span>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search functions, units, constants…"
            aria-label="Search the reference library"
            style={{
              width: "100%",
              height: 38,
              padding: "0 32px 0 34px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
              font: "13px/1 var(--font-sans)",
              color: "var(--text-primary)",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow =
                "0 0 0 2px color-mix(in srgb, var(--accent) 26%, transparent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                border: "none",
                background: "transparent",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>
        <div style={{ font: "12px/1 var(--font-sans)", color: "var(--text-muted)", marginTop: 11 }}>
          {query
            ? `${items.length} result${items.length === 1 ? "" : "s"} for “${query}”`
            : categoryLabel}
        </div>
      </div>

      {/* list */}
      <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
        {items.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "70px 30px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                border: "1px solid var(--border-hairline)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                marginBottom: 14,
              }}
            >
              <SearchIcon size={20} />
            </div>
            <div
              style={{
                font: "600 14px/1.3 var(--font-sans)",
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              No matches for “{query}”
            </div>
            <div style={{ font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
              Check the spelling, or browse a category on the left.
            </div>
          </div>
        ) : (
          items.map((it) => {
            const on = selectedId === it.id;
            return (
              <button
                key={it.id}
                type="button"
                className="ref-row"
                onClick={() => onSelect(it.id)}
                aria-current={on ? "true" : undefined}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 18px",
                  border: "none",
                  borderBottom: "1px solid var(--border-hairline)",
                  borderLeft: `2px solid ${on ? "var(--accent)" : "transparent"}`,
                  background: on ? "var(--accent-tint)" : undefined,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <code
                    style={{
                      font: "13px/1.3 var(--font-mono)",
                      color: on ? "var(--accent)" : "var(--text-primary)",
                      fontWeight: 500,
                    }}
                  >
                    <Highlight text={it.sig} query={query} />
                  </code>
                  <span
                    style={{
                      font: "10.5px/1 var(--font-sans)",
                      color: "var(--text-muted)",
                      background: "var(--surface-chrome)",
                      border: "1px solid var(--border-hairline)",
                      borderRadius: 4,
                      padding: "3px 6px",
                      whiteSpace: "nowrap",
                      flex: "0 0 auto",
                    }}
                  >
                    {it.tag}
                  </span>
                </div>
                <div
                  style={{
                    font: "12px/1.45 var(--font-sans)",
                    color: "var(--text-muted)",
                    marginTop: 5,
                  }}
                >
                  <Highlight text={it.desc} query={query} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
