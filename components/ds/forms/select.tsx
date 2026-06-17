"use client";

import { useState } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";

/**
 * Select — native dropdown styled to match Quanta inputs. Hairline border,
 * 4px radius, custom chevron. Pass `options` as [{value, label}] or children.
 *
 * Ported 1:1 from the _ds bundle (components/forms/Select.jsx).
 */

export type SelectSize = "sm" | "md";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options?: SelectOption[] | null;
  size?: SelectSize;
  invalid?: boolean;
  children?: ReactNode;
}

const HEIGHTS: Record<SelectSize, number> = { sm: 26, md: 30 };

export function Select({
  options = null,
  size = "md",
  invalid = false,
  disabled = false,
  children,
  style,
  onFocus,
  onBlur,
  ...rest
}: SelectProps) {
  const [focus, setFocus] = useState(false);
  const h = HEIGHTS[size] ?? HEIGHTS.md;
  const borderColor = invalid ? "var(--status-error)" : focus ? "var(--border-focus)" : "var(--border-strong)";
  return (
    <div style={{ position: "relative", display: "inline-flex", width: "100%" }}>
      <select
        disabled={disabled}
        onFocus={(e) => {
          setFocus(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          onBlur?.(e);
        }}
        {...rest}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          width: "100%",
          height: h,
          padding: "0 28px 0 8px",
          font: "var(--text-13) var(--font-sans)",
          color: "var(--text-primary)",
          background: disabled ? "var(--surface-hover)" : "var(--surface-raised)",
          border: "1px solid " + borderColor,
          borderRadius: "var(--radius-sm)",
          boxShadow: focus ? "0 0 0 2px color-mix(in srgb, var(--accent) 28%, transparent)" : "none",
          transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
          cursor: disabled ? "not-allowed" : "pointer",
          ...style,
        }}
      >
        {options ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}
      </select>
      <span
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "var(--text-muted)",
          display: "inline-flex",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}
