"use client";

import { useState } from "react";
import { TREE, categoryCount, type RefGroup } from "@/lib/calc/reference";
import {
  BookIcon,
  FunctionIcon,
  UnitIcon,
  ConstantIcon,
  ChevronRightIcon,
} from "./icons";

const GROUP_ICON: Record<RefGroup, (p: { size?: number }) => React.ReactNode> = {
  FUNCTIONS: FunctionIcon,
  UNITS: UnitIcon,
  CONSTANTS: ConstantIcon,
};

/**
 * Left pane (248px): the brand header + a collapsible group/subcategory tree.
 * Each subcategory shows its live item count; the active one carries the
 * blueprint tint. Ported from the mockup's `CatSidebar`.
 */
export function CategorySidebar({
  selected,
  onPick,
}: {
  selected: string;
  onPick: (cat: string) => void;
}) {
  const [open, setOpen] = useState<Record<RefGroup, boolean>>({
    FUNCTIONS: true,
    UNITS: true,
    CONSTANTS: true,
  });

  return (
    <aside
      style={{
        width: 248,
        flex: "0 0 248px",
        borderRight: "1px solid var(--border-hairline)",
        background: "var(--surface-chrome)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid var(--border-hairline)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ color: "var(--accent)", display: "inline-flex" }}>
            <BookIcon size={20} />
          </span>
          <span style={{ font: "600 15px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>
            Reference library
          </span>
        </div>
        <div style={{ font: "12px/1.4 var(--font-sans)", color: "var(--text-muted)", marginTop: 5 }}>
          Functions, units, and constants
        </div>
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: "10px 8px", minHeight: 0 }}>
        {(Object.entries(TREE) as [RefGroup, { id: string; label: string }[]][]).map(
          ([group, subs]) => {
            const Glyph = GROUP_ICON[group];
            return (
              <div key={group} style={{ marginBottom: 6 }}>
                <button
                  type="button"
                  onClick={() => setOpen((g) => ({ ...g, [group]: !g[group] }))}
                  aria-expanded={open[group]}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "7px 8px",
                    border: "none",
                    background: "transparent",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      color: "var(--text-muted)",
                      transform: open[group] ? "rotate(90deg)" : "none",
                      transition: "transform var(--dur-fast) var(--ease-out)",
                    }}
                  >
                    <ChevronRightIcon size={13} />
                  </span>
                  <span style={{ display: "inline-flex", color: "var(--accent)" }}>
                    <Glyph size={16} />
                  </span>
                  <span
                    style={{
                      font: "600 11px/1 var(--font-sans)",
                      letterSpacing: "0.07em",
                      color: "var(--text-primary)",
                    }}
                  >
                    {group}
                  </span>
                </button>

                {open[group] && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 6 }}>
                    {subs.map((s) => {
                      const on = selected === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => onPick(s.id)}
                          aria-current={on ? "true" : undefined}
                          className="ref-cat"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "6px 10px 6px 28px",
                            border: "none",
                            background: on ? "var(--accent-tint)" : undefined,
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              font: `${on ? "600" : "400"} 12.5px/1.3 var(--font-sans)`,
                              color: on ? "var(--accent)" : "var(--text-primary)",
                            }}
                          >
                            {s.label}
                          </span>
                          <span style={{ font: "11px/1 var(--font-mono)", color: "var(--text-muted)" }}>
                            {categoryCount(s.id)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>
    </aside>
  );
}
