"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Small shared layout primitives for the editor dialogs, matching the
 * `dialogs.html` form language: a label-over-control field, a label-left
 * inline row, and an eyebrow-titled section. Kept tiny and local so the dialogs
 * stay declarative.
 */

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>{label}</span>
      {children}
      {hint && <span style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>{hint}</span>}
    </div>
  );
}

export function InlineRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 30 }}>
      <span style={{ font: "12.5px/1.3 var(--font-sans)", color: "var(--text-primary)" }}>{label}</span>
      {children}
    </div>
  );
}

export function Section({ eyebrow, children, style }: { eyebrow?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, ...style }}>
      {eyebrow && (
        <div
          style={{
            font: "600 11px/1.2 var(--font-sans)",
            letterSpacing: "var(--tracking-eyebrow)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {eyebrow}
        </div>
      )}
      {children}
    </div>
  );
}

/** A scope chooser shared by the result / conditional format dialogs. */
export function ScopeToggle({
  value,
  onChange,
}: {
  value: "region" | "worksheet";
  onChange: (v: "region" | "worksheet") => void;
}) {
  const opt = (v: "region" | "worksheet", label: string) => {
    const on = value === v;
    return (
      <button
        type="button"
        onClick={() => onChange(v)}
        style={{
          flex: 1,
          height: 28,
          border: "1px solid " + (on ? "var(--accent)" : "var(--border-strong)"),
          background: on ? "var(--accent-tint)" : "var(--surface-raised)",
          color: on ? "var(--accent-press)" : "var(--text-primary)",
          font: "500 12px/1 var(--font-sans)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {opt("region", "This result")}
      {opt("worksheet", "Whole worksheet")}
    </div>
  );
}

/** A monospace stepper for integer fields (decimal places, etc.). */
export function Stepper({
  value,
  min = 0,
  max = 15,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const btn: CSSProperties = {
    width: 26,
    height: 28,
    border: "1px solid var(--border-strong)",
    background: "var(--surface-raised)",
    color: "var(--text-primary)",
    cursor: "pointer",
    font: "14px/1 var(--font-sans)",
  };
  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      <button type="button" style={{ ...btn, borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)" }} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Decrease">−</button>
      <span style={{ minWidth: 34, textAlign: "center", font: "13px/1 var(--font-mono)", color: "var(--text-primary)" }}>{value}</span>
      <button type="button" style={{ ...btn, borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }} onClick={() => onChange(Math.min(max, value + 1))} aria-label="Increase">+</button>
    </div>
  );
}
