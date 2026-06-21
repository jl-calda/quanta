"use client";

import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";

/**
 * Switch — binary toggle for settings (e.g. dark theme, auto-recalc).
 * Track turns blueprint when on. Pass `label` for inline text.
 *
 * Ported 1:1 from the _ds bundle (components/forms/Switch.jsx).
 */

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "style"> {
  checked?: boolean;
  label?: ReactNode;
  style?: CSSProperties;
}

export function Switch({ checked = false, disabled = false, label = null, onChange, style, ...rest }: SwitchProps) {
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
          width: 32,
          height: 18,
          flex: "0 0 auto",
          background: checked ? "var(--accent)" : "var(--border-strong)",
          borderRadius: "var(--radius-full)",
          transition: "background var(--dur-base) var(--ease-out)",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 16 : 2,
            width: 14,
            height: 14,
            background: "#fff",
            borderRadius: "50%",
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            transition: "left var(--dur-base) var(--ease-out)",
          }}
        />
        <input
          type="checkbox"
          role="switch"
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
