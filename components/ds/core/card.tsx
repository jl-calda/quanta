import type { HTMLAttributes, ReactNode } from "react";

/**
 * Card / Panel — structural surface built from hairline borders, not shadow.
 * Use for grouping content in the chrome (property panels, result summaries).
 * `padded` toggles inner padding; `title`/`eyebrow` render an optional header.
 *
 * Ported 1:1 from the _ds bundle (components/core/Card.jsx).
 */

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
  raised?: boolean;
  children?: ReactNode;
}

export function Card({
  title,
  eyebrow,
  actions,
  padded = true,
  raised = false,
  children,
  style,
  ...rest
}: CardProps) {
  return (
    <div
      style={{
        background: raised ? "var(--surface-raised)" : "var(--surface-chrome)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        boxShadow: raised ? "var(--shadow-sm)" : "none",
        overflow: "hidden",
        ...style,
      }}
      {...rest}
    >
      {(title || eyebrow || actions) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            padding: "10px var(--space-4)",
            borderBottom: "1px solid var(--border-hairline)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {eyebrow && (
              <div
                style={{
                  font: "600 var(--text-11)/1.2 var(--font-sans)",
                  letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: title ? 2 : 0,
                }}
              >
                {eyebrow}
              </div>
            )}
            {title && (
              <div
                style={{
                  font: "600 var(--text-14)/1.3 var(--font-sans)",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {title}
              </div>
            )}
          </div>
          {actions && <div style={{ display: "flex", gap: "var(--space-2)", flex: "0 0 auto" }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: padded ? "var(--space-4)" : 0 }}>{children}</div>
    </div>
  );
}
