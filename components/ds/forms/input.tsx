"use client";

import { useState } from "react";
import type { CSSProperties, FocusEvent, InputHTMLAttributes, ReactNode } from "react";

/**
 * Input — single-line text/number field. Hairline border, 4px radius,
 * 2px blueprint focus ring. Supports `mono` for formula/value entry,
 * `prefix`/`suffix` adornments (e.g. unit labels), and `invalid` state.
 *
 * Ported 1:1 from the _ds bundle (components/forms/Input.jsx). `size` and
 * `prefix` are remapped off the native input attributes so they carry the DS
 * meaning.
 */

export type InputSize = "sm" | "md";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  size?: InputSize;
  mono?: boolean;
  invalid?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  containerStyle?: CSSProperties;
}

const HEIGHTS: Record<InputSize, number> = { sm: 26, md: 30 };

export function Input({
  size = "md",
  mono = false,
  invalid = false,
  prefix = null,
  suffix = null,
  disabled = false,
  style,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focus, setFocus] = useState(false);
  const h = HEIGHTS[size] ?? HEIGHTS.md;
  const borderColor = invalid ? "var(--status-error)" : focus ? "var(--border-focus)" : "var(--border-strong)";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: h,
        width: "100%",
        background: disabled ? "var(--surface-hover)" : "var(--surface-raised)",
        border: "1px solid " + borderColor,
        borderRadius: "var(--radius-sm)",
        boxShadow: focus
          ? `0 0 0 2px color-mix(in srgb, ${invalid ? "var(--status-error)" : "var(--accent)"} 28%, transparent)`
          : "none",
        transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
        padding: "0 8px",
        gap: 6,
        ...containerStyle,
      }}
    >
      {prefix && (
        <span style={{ color: "var(--text-muted)", font: "var(--text-12) var(--font-mono)", flex: "0 0 auto" }}>
          {prefix}
        </span>
      )}
      <input
        disabled={disabled}
        onFocus={(e: FocusEvent<HTMLInputElement>) => {
          setFocus(true);
          onFocus?.(e);
        }}
        onBlur={(e: FocusEvent<HTMLInputElement>) => {
          setFocus(false);
          onBlur?.(e);
        }}
        {...rest}
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--text-primary)",
          font: mono ? "var(--text-13) var(--font-mono)" : "var(--text-13) var(--font-sans)",
          padding: 0,
          ...style,
        }}
      />
      {suffix && (
        <span style={{ color: "var(--text-muted)", font: "500 var(--text-12) var(--font-mono)", flex: "0 0 auto" }}>
          {suffix}
        </span>
      )}
    </div>
  );
}
