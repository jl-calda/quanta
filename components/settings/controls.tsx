"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

/**
 * Settings form primitives — typed React ports of the design export's building
 * blocks (settings-app.jsx:63–100): a section header, a titled group, a labelled
 * row, a segmented radio, a stepper, and a mono text field. All on DS tokens. The
 * binary toggle and dropdown reuse the DS `Switch` / `Select` directly.
 */

export function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 4 }}>
        <h1
          style={{
            margin: 0,
            font: "600 22px/1.2 var(--font-sans)",
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h1>
      </div>
      {desc && (
        <p
          style={{
            margin: "0 0 8px",
            font: "13.5px/1.5 var(--font-sans)",
            color: "var(--text-muted)",
            maxWidth: 560,
          }}
        >
          {desc}
        </p>
      )}
      {children}
    </div>
  );
}

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 28 }}>
      {title && (
        <div
          style={{
            font: "600 11px/1 var(--font-sans)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 4,
            paddingBottom: 10,
            borderBottom: "1px solid var(--border-hairline)",
          }}
        >
          {title}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export function Row({
  label,
  help,
  control,
}: {
  label: ReactNode;
  help?: ReactNode;
  control: ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 240px",
        gap: 24,
        alignItems: "center",
        padding: "16px 0",
        borderBottom: "1px solid var(--border-hairline)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            font: "500 13.5px/1.3 var(--font-sans)",
            color: "var(--text-primary)",
          }}
        >
          {label}
        </div>
        {help && (
          <div
            style={{
              font: "12.5px/1.5 var(--font-sans)",
              color: "var(--text-muted)",
              marginTop: 3,
              maxWidth: 400,
            }}
          >
            {help}
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>{control}</div>
    </div>
  );
}

export interface RadioOption<T extends string> {
  value: T;
  label: string;
}

export function Radio<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      style={{
        display: "inline-flex",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        height: 32,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {options.map((o, i) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            style={{
              padding: "0 14px",
              height: "100%",
              border: "none",
              borderLeft: i ? "1px solid var(--border-hairline)" : "none",
              cursor: disabled ? "not-allowed" : "pointer",
              background: on ? "var(--accent-tint)" : "var(--surface-raised)",
              color: on ? "var(--accent)" : "var(--text-muted)",
              font: `${on ? "600" : "500"} 12.5px/1 var(--font-sans)`,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 12,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const btn: CSSProperties = {
    width: 30,
    height: "100%",
    border: "none",
    background: "var(--surface-raised)",
    cursor: disabled ? "not-allowed" : "pointer",
    color: "var(--text-primary)",
    fontSize: 15,
  };
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        height: 32,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <button
        type="button"
        aria-label="Decrease"
        disabled={disabled}
        onClick={() => onChange(Math.max(min, value - 1))}
        style={btn}
      >
        {"−"}
      </button>
      <span
        style={{ width: 38, textAlign: "center", font: "13px var(--font-mono)" }}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        disabled={disabled}
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{ ...btn, borderLeft: "1px solid var(--border-hairline)" }}
      >
        +
      </button>
    </div>
  );
}

export function MonoField({
  value,
  onChange,
  onCommit,
  suffix,
  width = 110,
  disabled = false,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit?: () => void;
  suffix?: string;
  width?: number;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ position: "relative", width }}>
      <input
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => {
          setFocus(false);
          onCommit?.();
        }}
        style={{
          width: "100%",
          height: 32,
          padding: `0 ${suffix ? 34 : 10}px 0 10px`,
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${focus ? "var(--accent)" : "var(--border-strong)"}`,
          boxShadow: focus
            ? "0 0 0 2px color-mix(in srgb, var(--accent) 26%, transparent)"
            : "none",
          background: disabled ? "var(--surface-hover)" : "var(--surface-raised)",
          font: "13px/1 var(--font-mono)",
          color: "var(--text-primary)",
          outline: "none",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
      {suffix && (
        <span
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            font: "12px/1 var(--font-mono)",
            color: "var(--text-muted)",
            pointerEvents: "none",
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}

/** A short muted note shown under a section title when controls are read-only. */
export function ReadOnlyNote({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 12,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-hover)",
        font: "12.5px/1.4 var(--font-sans)",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </div>
  );
}
