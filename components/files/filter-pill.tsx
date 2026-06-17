"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";

/**
 * Filter pill — a compact dropdown for the Owner / Modified / Calc status / Tag
 * facets. Shows "Label: value" when active, deepening to the accent; selecting
 * the active option again clears it. State is lifted to the URL by the caller.
 */
export function FilterPill({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onSelect: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const activeLabel = options.find((o) => o.value === value)?.label;
  const active = activeLabel != null;

  return (
    <div ref={ref} style={{ position: "relative", flex: "0 0 auto" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 32,
          padding: "0 10px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid " + (active ? "var(--accent)" : "var(--border-strong)"),
          background: active ? "var(--accent-tint)" : "var(--surface-raised)",
          cursor: "pointer",
          font: "12.5px/1 var(--font-sans)",
          color: active ? "var(--accent)" : "var(--text-muted)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}>
          {label}
          {active ? ":" : ""}
        </span>
        {active && <span style={{ fontWeight: 500 }}>{activeLabel}</span>}
        <ChevronDownIcon size={13} />
      </button>
      {open && (
        <div
          className="pop-in"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 180,
            maxHeight: 280,
            overflowY: "auto",
            zIndex: 50,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-popover)",
            padding: 5,
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: "7px 9px", font: "12.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
              Nothing to filter by
            </div>
          )}
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSelect(selected ? null : o.value);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  width: "100%",
                  padding: "7px 9px",
                  border: "none",
                  background: selected ? "var(--accent-tint)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: selected ? "var(--accent)" : "var(--text-primary)",
                  font: "12.5px/1.2 var(--font-sans)",
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = "transparent";
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
