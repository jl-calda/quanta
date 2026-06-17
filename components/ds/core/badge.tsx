import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

/**
 * Badge — compact status pill for results, utilization, and region states.
 * Tones: neutral, accent, pass, warning, error. Style: soft (tinted, default)
 * or solid. 4px radius (not pill) to match the precise instrument aesthetic.
 *
 * Ported 1:1 from the _ds bundle (components/core/Badge.jsx) — inline styles on
 * the semantic CSS variables so dark theme and density flow through unchanged.
 */

export type BadgeTone = "neutral" | "accent" | "pass" | "warning" | "error";
export type BadgeVariant = "soft" | "solid";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  dot?: boolean;
  children?: ReactNode;
}

const TONES: Record<BadgeTone, { fg: string; bg: string; solidBg: string }> = {
  neutral: { fg: "var(--text-muted)", bg: "var(--chrome)", solidBg: "var(--muted)" },
  accent: { fg: "var(--accent)", bg: "var(--accent-tint)", solidBg: "var(--accent)" },
  pass: { fg: "var(--status-pass)", bg: "var(--status-pass-bg)", solidBg: "var(--status-pass)" },
  warning: { fg: "var(--status-warning)", bg: "var(--status-warning-bg)", solidBg: "var(--status-warning)" },
  error: { fg: "var(--status-error)", bg: "var(--status-error-bg)", solidBg: "var(--status-error)" },
};

export function Badge({ tone = "neutral", variant = "soft", dot = false, children, style, ...rest }: BadgeProps) {
  const t = TONES[tone] ?? TONES.neutral;
  const solid = variant === "solid";
  const styles: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    height: 19,
    padding: "0 7px",
    font: "600 var(--text-11)/1 var(--font-sans)",
    letterSpacing: "0.01em",
    color: solid ? "#FFFFFF" : t.fg,
    background: solid ? t.solidBg : t.bg,
    border: "1px solid " + (solid ? "transparent" : `color-mix(in srgb, ${t.fg} 22%, transparent)`),
    borderRadius: "var(--radius-sm)",
    whiteSpace: "nowrap",
    ...style,
  };
  return (
    <span style={styles} {...rest}>
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: solid ? "#FFFFFF" : t.fg,
            flex: "0 0 auto",
          }}
        />
      )}
      {children}
    </span>
  );
}
