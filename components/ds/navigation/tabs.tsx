"use client";

import { useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * Tabs — flat, underline-style segmented navigation. Active tab carries a
 * 2px blueprint underline; hairline rule beneath the row. Controlled via
 * `value` / `onChange`, or uncontrolled with `defaultValue`.
 *
 * Ported 1:1 from the _ds bundle (components/navigation/Tabs.jsx).
 */

export interface TabItem {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode | null;
  disabled?: boolean;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  items?: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function Tabs({ items = [], value, defaultValue, onChange, style, ...rest }: TabsProps) {
  const [internal, setInternal] = useState<string | undefined>(defaultValue ?? items[0]?.value);
  const active = value !== undefined ? value : internal;
  const select = (v: string) => {
    if (value === undefined) setInternal(v);
    onChange?.(v);
  };
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: "var(--space-4)",
        borderBottom: "1px solid var(--border-hairline)",
        ...style,
      }}
      {...rest}
    >
      {items.map((it) => {
        const on = it.value === active;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={on}
            disabled={it.disabled}
            onClick={() => !it.disabled && select(it.value)}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 2px",
              font: (on ? "600" : "500") + " var(--text-13)/1 var(--font-sans)",
              color: it.disabled ? "var(--text-muted)" : on ? "var(--text-primary)" : "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: it.disabled ? "not-allowed" : "pointer",
              marginBottom: -1,
              borderBottom: "2px solid " + (on ? "var(--accent)" : "transparent"),
              transition: "color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
            }}
          >
            {it.icon && <span style={{ display: "inline-flex" }}>{it.icon}</span>}
            {it.label}
            {it.badge != null && (
              <span
                style={{
                  font: "600 var(--text-11)/1 var(--font-sans)",
                  color: on ? "var(--accent)" : "var(--text-muted)",
                  background: on ? "var(--accent-tint)" : "var(--chrome)",
                  borderRadius: "var(--radius-sm)",
                  padding: "2px 5px",
                }}
              >
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
