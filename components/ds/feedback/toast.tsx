import type { CSSProperties, ReactNode } from "react";

/**
 * Toast — transient inline notification. Tones map to semantics: info
 * (blueprint), success (pass), warning, error. Leading status icon, title,
 * optional description, optional dismiss. Built as a static element — host it
 * in your own stack/positioner.
 *
 * Ported 1:1 from the _ds bundle (components/feedback/Toast.jsx).
 */

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastProps {
  tone?: ToastTone;
  title: ReactNode;
  description?: ReactNode;
  onDismiss?: (() => void) | null;
  style?: CSSProperties;
}

const TONES: Record<ToastTone, { c: string; bg: string }> = {
  info: { c: "var(--accent)", bg: "var(--accent-tint)" },
  success: { c: "var(--status-pass)", bg: "var(--status-pass-bg)" },
  warning: { c: "var(--status-warning)", bg: "var(--status-warning-bg)" },
  error: { c: "var(--status-error)", bg: "var(--status-error-bg)" },
};

const ICONS: Record<ToastTone, ReactNode> = {
  info: <path d="M12 16v-5M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />,
  success: (
    <>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  error: (
    <>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </>
  ),
};

export function Toast({ tone = "info", title, description = null, onDismiss = null, style }: ToastProps) {
  const t = TONES[tone] ?? TONES.info;
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-3)",
        width: 360,
        maxWidth: "100%",
        padding: "12px 14px",
        background: "var(--surface-raised)",
        border: "1px solid var(--border-hairline)",
        borderLeft: "3px solid " + t.c,
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-popover)",
        ...style,
      }}
    >
      <span style={{ flex: "0 0 auto", color: t.c, marginTop: 1 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {ICONS[tone]}
        </svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "600 var(--text-13)/1.4 var(--font-sans)", color: "var(--text-primary)" }}>{title}</div>
        {description && (
          <div style={{ font: "var(--text-12)/1.45 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{
            flex: "0 0 auto",
            display: "inline-flex",
            width: 22,
            height: 22,
            alignItems: "center",
            justifyContent: "center",
            marginTop: -1,
            marginRight: -4,
            background: "none",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
