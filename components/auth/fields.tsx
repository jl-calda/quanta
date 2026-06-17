"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Input } from "@/components/ds";
import { AlertIcon, EyeIcon, EyeOffIcon } from "./icons";

/**
 * Form building blocks for the auth screen — a thin layer over the DS `Input`
 * that adds the mockup's label/error layout (label row with optional inline
 * link, inline error with an alert glyph). Ported from `Sign in.html`.
 */

// Shared sizing the mockup applies to the auth controls.
export const fieldContainer: CSSProperties = {
  height: 42,
  padding: "0 12px",
  borderRadius: "var(--radius-sm)",
};
export const fieldInput: CSSProperties = { fontSize: 14 };
export const primaryBtn: CSSProperties = {
  height: 44,
  fontSize: 14,
  borderRadius: "var(--radius-sm)",
};
export const socialBtn: CSSProperties = {
  height: 42,
  fontSize: 13.5,
  borderRadius: "var(--radius-sm)",
};

export function Field({
  label,
  htmlFor,
  link,
  children,
  error,
}: {
  label: string;
  htmlFor: string;
  link?: ReactNode;
  children: ReactNode;
  error?: ReactNode;
}) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <label
          htmlFor={htmlFor}
          style={{ font: "500 13px/1 var(--font-sans)", color: "var(--text-primary)" }}
        >
          {label}
        </label>
        {link}
      </div>
      {children}
      {error ? (
        <div
          id={errorId}
          role="alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            marginTop: 1,
            color: "var(--status-error)",
            font: "12px/1.45 var(--font-sans)",
          }}
        >
          <span style={{ flex: "0 0 auto", marginTop: 0.5 }}>
            <AlertIcon />
          </span>
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}

export function TextField({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  error,
  link,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: ReactNode;
  link?: ReactNode;
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <Field label={label} htmlFor={id} link={link} error={error}>
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        invalid={!!error}
        aria-describedby={errorId}
        containerStyle={fieldContainer}
        style={fieldInput}
      />
    </Field>
  );
}

export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  required,
  error,
  link,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: ReactNode;
  link?: ReactNode;
}) {
  const [show, setShow] = useState(false);
  const errorId = error ? `${id}-error` : undefined;
  return (
    <Field label={label} htmlFor={id} link={link} error={error}>
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        invalid={!!error}
        aria-describedby={errorId}
        containerStyle={fieldContainer}
        style={fieldInput}
        suffix={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              margin: "0 -4px 0 0",
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              borderRadius: 3,
            }}
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />
    </Field>
  );
}

/** "or" divider between the email/social blocks. */
export function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0" }}>
      <span style={{ flex: 1, height: 1, background: "var(--border-hairline)" }} />
      <span
        style={{
          font: "11px/1 var(--font-sans)",
          letterSpacing: "0.04em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        or
      </span>
      <span style={{ flex: 1, height: 1, background: "var(--border-hairline)" }} />
    </div>
  );
}

/** Form-level error in the app's voice — specific and fixable. */
export function FormErrorInline({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "9px 11px",
        borderRadius: "var(--radius-sm)",
        background: "var(--status-error-bg)",
        border: "1px solid color-mix(in srgb, var(--status-error) 28%, transparent)",
        color: "var(--status-error)",
        font: "12.5px/1.45 var(--font-sans)",
      }}
    >
      <span style={{ flex: "0 0 auto", marginTop: 0.5 }}>
        <AlertIcon />
      </span>
      <span>{children}</span>
    </div>
  );
}

/** Confirmation note (e.g. "magic link sent") in the pass tone. */
export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        background: "var(--status-pass-bg)",
        border: "1px solid color-mix(in srgb, var(--status-pass) 26%, transparent)",
        color: "var(--status-pass)",
        font: "12.5px/1.5 var(--font-sans)",
      }}
    >
      {children}
    </p>
  );
}
