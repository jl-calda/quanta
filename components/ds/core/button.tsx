"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

/**
 * Button — primary action control for Quanta.
 * Variants: primary (blueprint fill), secondary (hairline outline),
 * ghost (no chrome), danger (error fill). Sizes: sm / md.
 * Precise 4px radius, never pill. Sentence-case labels that say what happens.
 *
 * Ported 1:1 from the _ds bundle (components/core/Button.jsx); hover/active are
 * driven by React state, matching the source (inline styles can't do :hover).
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const SIZES: Record<ButtonSize, { height: number; padding: string; font: string; gap: number }> = {
  sm: { height: 26, padding: "0 10px", font: "var(--text-12)", gap: 6 },
  md: { height: 32, padding: "0 14px", font: "var(--text-13)", gap: 7 },
};

export function Button({
  variant = "primary",
  size = "md",
  iconLeft = null,
  iconRight = null,
  disabled = false,
  fullWidth = false,
  type = "button",
  children,
  style,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const s = SIZES[size] ?? SIZES.md;
  const palette = {
    primary: {
      bg: "var(--accent)",
      bgHover: "var(--accent)",
      bgActive: "var(--accent-press)",
      fg: "var(--text-inverse)",
      border: "transparent",
      overlay: hover ? "rgba(255,255,255,0.08)" : "transparent",
    },
    secondary: {
      bg: "var(--surface-raised)",
      bgHover: "var(--surface-hover)",
      bgActive: "var(--surface-hover)",
      fg: "var(--text-primary)",
      border: "var(--border-strong)",
      overlay: "transparent",
    },
    ghost: {
      bg: "transparent",
      bgHover: "var(--surface-hover)",
      bgActive: "var(--surface-hover)",
      fg: "var(--text-primary)",
      border: "transparent",
      overlay: "transparent",
    },
    danger: {
      bg: "var(--status-error)",
      bgHover: "var(--status-error)",
      bgActive: "var(--status-error)",
      fg: "#FFFFFF",
      border: "transparent",
      overlay: hover ? "rgba(0,0,0,0.10)" : "transparent",
    },
  }[variant] ?? null;
  const p = palette ?? {
    bg: "var(--accent)",
    bgHover: "var(--accent)",
    bgActive: "var(--accent-press)",
    fg: "var(--text-inverse)",
    border: "transparent",
    overlay: "transparent",
  };
  const bg = disabled ? "var(--surface-hover)" : active ? p.bgActive : hover ? p.bgHover : p.bg;
  const styles: CSSProperties = {
    display: fullWidth ? "flex" : "inline-flex",
    width: fullWidth ? "100%" : "auto",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    font: "500 " + s.font + "/1 var(--font-sans)",
    letterSpacing: "0",
    color: disabled ? "var(--text-muted)" : p.fg,
    background: bg,
    backgroundImage: p.overlay !== "transparent" ? `linear-gradient(${p.overlay},${p.overlay})` : "none",
    border: "1px solid " + (disabled ? "var(--border-hairline)" : p.border),
    borderRadius: "var(--radius-sm)",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
    transform: active && !disabled ? "translateY(0.5px)" : "none",
    whiteSpace: "nowrap",
    userSelect: "none",
    ...style,
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setActive(false);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={styles}
      {...rest}
    >
      {iconLeft && <span style={{ display: "inline-flex", flex: "0 0 auto" }}>{iconLeft}</span>}
      {children}
      {iconRight && <span style={{ display: "inline-flex", flex: "0 0 auto" }}>{iconRight}</span>}
    </button>
  );
}
