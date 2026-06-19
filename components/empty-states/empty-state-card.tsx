import type { ReactNode } from "react";

/**
 * The single empty-state pattern — one card, eight contexts (Mockup 4.12).
 * Ported 1:1 from the Claude Design mockup: a chrome eyebrow header, a dot-grid
 * body, a tone medallion (thin-line spot icon), a plain-spoken headline, one
 * supporting line in the app's voice, and an actions slot for exactly one (or a
 * primary + ghost) action.
 *
 * Pure/presentational with no server-only or client-only code, so it renders on
 * the server for the static cards and on the client for the live connection card
 * (which swaps `tone`/`icon`/`headline`/`body` at runtime — hence they are props,
 * not a static lookup).
 */

export type EmptyStateTone = "neutral" | "accent" | "pass" | "warning";

const TONE: Record<EmptyStateTone, { fg: string; bg: string }> = {
  neutral: { fg: "var(--text-muted)", bg: "var(--surface-chrome)" },
  accent: { fg: "var(--accent)", bg: "var(--accent-tint)" },
  pass: { fg: "var(--status-pass)", bg: "var(--status-pass-bg)" },
  warning: { fg: "var(--status-warning)", bg: "var(--status-warning-bg)" },
};

export interface EmptyStateCardProps {
  /** 1-based card number shown in the eyebrow, e.g. `01`. */
  index: number;
  /** Context label shown in the eyebrow, e.g. `Worksheets`. */
  ctx: string;
  icon: ReactNode;
  tone: EmptyStateTone;
  headline: ReactNode;
  body: ReactNode;
  /** The actions row — one primary action (optionally a secondary). */
  children?: ReactNode;
}

export function EmptyStateCard({
  index,
  ctx,
  icon,
  tone,
  headline,
  body,
  children,
}: EmptyStateCardProps) {
  const t = TONE[tone];
  const num = index < 10 ? `0${index}` : `${index}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-raised)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: "1px solid var(--border-hairline)",
          background: "var(--surface-chrome)",
        }}
      >
        <span
          style={{
            font: "600 10.5px/1 var(--font-sans)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {num} · {ctx}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "40px 32px 36px",
          backgroundImage:
            "radial-gradient(var(--grid-dot) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 60,
            height: 60,
            borderRadius: "var(--radius-lg)",
            background: t.bg,
            color: t.fg,
            border: `1px solid color-mix(in srgb, ${t.fg} 18%, transparent)`,
          }}
        >
          {icon}
        </span>
        <h3
          style={{
            margin: "20px 0 0",
            font: "600 16px/1.35 var(--font-sans)",
            letterSpacing: "-0.005em",
            color: "var(--text-primary)",
            maxWidth: 320,
            textWrap: "balance",
          }}
        >
          {headline}
        </h3>
        <p
          style={{
            margin: "8px 0 0",
            font: "13px/1.6 var(--font-sans)",
            color: "var(--text-muted)",
            maxWidth: 340,
            textWrap: "pretty",
          }}
        >
          {body}
        </p>
        {children && (
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
