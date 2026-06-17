"use client";

import { useEffect } from "react";
import type { MouseEvent, ReactNode } from "react";

/**
 * Dialog — modal surface for confirmations and focused tasks. 8px radius,
 * single soft shadow, dimmed scrim. Header (title + optional eyebrow),
 * body, and a right-aligned footer action row. Controlled via `open`.
 *
 * Ported 1:1 from the _ds bundle (components/feedback/Dialog.jsx). Closes on
 * Escape and on scrim click.
 */

export interface DialogProps {
  open?: boolean;
  title?: ReactNode;
  eyebrow?: ReactNode;
  onClose?: () => void;
  footer?: ReactNode;
  width?: number;
  children?: ReactNode;
}

export function Dialog({ open = false, title, eyebrow, onClose, footer = null, width = 460, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(21,24,29,0.32)",
        padding: "var(--space-6)",
        animation: "qfade var(--dur-base) var(--ease-out)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          background: "var(--surface-raised)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-modal)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            padding: "var(--space-4) var(--space-6)",
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
                  marginBottom: 3,
                }}
              >
                {eyebrow}
              </div>
            )}
            <h2
              style={{
                font: "600 var(--text-20)/1.25 var(--font-sans)",
                color: "var(--text-primary)",
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onClose?.()}
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              marginTop: -2,
              marginRight: -6,
              background: "none",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ padding: "var(--space-6)", font: "var(--text-14)/1.55 var(--font-sans)", color: "var(--text-primary)" }}>
          {children}
        </div>
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "var(--space-2)",
              padding: "var(--space-3) var(--space-6) var(--space-4)",
              borderTop: "1px solid var(--border-hairline)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
      <style>{"@keyframes qfade{from{opacity:0}to{opacity:1}}"}</style>
    </div>
  );
}
