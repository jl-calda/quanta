import type { ReactNode } from "react";

/**
 * Chip — the small metadata pill on a template card / preview header (discipline
 * = accent tone, standard + type = neutral). Ported from the export's `Chip`.
 */
export function Chip({ children, tone }: { children: ReactNode; tone?: "accent" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        font: "10.5px/1 var(--font-sans)",
        letterSpacing: "0.01em",
        padding: "3px 7px",
        borderRadius: 4,
        border: "1px solid var(--border-hairline)",
        background: tone === "accent" ? "var(--accent-tint)" : "var(--surface-chrome)",
        color: tone === "accent" ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      {children}
    </span>
  );
}
