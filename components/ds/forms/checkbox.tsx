"use client";

import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";

/**
 * Checkbox — square 4px control with blueprint fill when checked.
 * Pass `label` for an inline label; `indeterminate` for tri-state.
 *
 * Ported 1:1 from the _ds bundle (components/forms/Checkbox.jsx).
 */

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "style"> {
  checked?: boolean;
  indeterminate?: boolean;
  label?: ReactNode;
  style?: CSSProperties;
}

export function Checkbox({
  checked = false,
  indeterminate = false,
  disabled = false,
  label = null,
  onChange,
  style,
  ...rest
}: CheckboxProps) {
  const on = checked || indeterminate;
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        font: "var(--text-13) var(--font-sans)",
        color: "var(--text-primary)",
        userSelect: "none",
        ...style,
      }}
    >
      <span
        style={{
          position: "relative",
          width: 16,
          height: 16,
          flex: "0 0 auto",
          background: on ? "var(--accent)" : "var(--surface-raised)",
          border: "1px solid " + (on ? "var(--accent)" : "var(--border-strong)"),
          borderRadius: "var(--radius-sm)",
          transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && !indeterminate && (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12l5 5L19 7" />
          </svg>
        )}
        {indeterminate && <span style={{ width: 8, height: 2, background: "#fff", borderRadius: 1 }} />}
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          {...rest}
          style={{ position: "absolute", inset: 0, margin: 0, opacity: 0, cursor: "inherit" }}
        />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
