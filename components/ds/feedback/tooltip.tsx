"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * Tooltip — small hover/focus label. Wraps a single child trigger and shows
 * a dark micro-label on the chosen side. Use for terse hints; for icon-only
 * buttons prefer IconButton's built-in tooltip.
 *
 * Ported 1:1 from the _ds bundle (components/feedback/Tooltip.jsx).
 */

export type TooltipSide = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  label: ReactNode;
  side?: TooltipSide;
  children?: ReactNode;
}

const POS: Record<TooltipSide, CSSProperties> = {
  top: { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
  bottom: { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
  left: { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
  right: { left: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
};

export function Tooltip({ label, side = "top", children }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 60,
            pointerEvents: "none",
            background: "var(--ink)",
            color: "var(--text-inverse)",
            font: "500 var(--text-11)/1.3 var(--font-sans)",
            padding: "4px 8px",
            borderRadius: "var(--radius-sm)",
            whiteSpace: "nowrap",
            boxShadow: "var(--shadow-popover)",
            ...POS[side],
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
