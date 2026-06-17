"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * IconButton — square, icon-only control for ribbons and toolbars.
 * Always pass a `label` for the tooltip/aria. Thin-stroke line icon as child.
 * Variants: ghost (default), solid (active/selected, blueprint), outline.
 *
 * Ported 1:1 from the _ds bundle (components/core/IconButton.jsx); the dark
 * micro-tooltip is built in and shows on hover.
 */

export type IconButtonVariant = "ghost" | "solid" | "outline";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
  children?: ReactNode;
}

const SIZES: Record<IconButtonSize, number> = { sm: 26, md: 30, lg: 34 };

export function IconButton({
  label,
  variant = "ghost",
  size = "md",
  active = false,
  disabled = false,
  children,
  style,
  ...rest
}: IconButtonProps) {
  const [hover, setHover] = useState(false);
  const [show, setShow] = useState(false);
  const dim = SIZES[size] ?? SIZES.md;
  const isSolid = variant === "solid" || active;
  const bg = disabled ? "transparent" : isSolid ? "var(--accent-tint)" : hover ? "var(--surface-hover)" : "transparent";
  const fg = disabled ? "var(--text-muted)" : isSolid ? "var(--accent)" : "var(--text-primary)";
  const border = variant === "outline" ? "var(--border-strong)" : "transparent";
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onMouseEnter={() => {
          setHover(true);
          setShow(true);
        }}
        onMouseLeave={() => {
          setHover(false);
          setShow(false);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: dim,
          height: dim,
          color: fg,
          background: bg,
          border: "1px solid " + border,
          borderRadius: "var(--radius-sm)",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
          padding: 0,
          ...style,
        }}
        {...rest}
      >
        {children}
      </button>
      {show && label && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "var(--text-inverse)",
            font: "500 var(--text-11)/1.2 var(--font-sans)",
            padding: "4px 7px",
            borderRadius: "var(--radius-sm)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 50,
            boxShadow: "var(--shadow-popover)",
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
