"use client";

import { useFormStatus } from "react-dom";

/**
 * Small, design-system-aligned form controls for the auth screens. The full
 * DS form components (forms/Input, core/Button) land in M3; these reuse the same
 * tokens (hairline borders, 4px radius, blueprint focus ring) so the eventual
 * swap is visual-only.
 */

export function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  required,
  error,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-12 font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className="h-9 rounded-sm border border-strong bg-raised px-2.5 text-14 text-ink outline-none transition-[border-color] placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 aria-[invalid=true]:border-error"
      />
      {error ? (
        <span id={errorId} className="text-12 text-error">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const base =
    "inline-flex h-9 items-center justify-center gap-2 rounded-sm px-3 text-13 font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-accent text-inverse hover:bg-accent-press"
      : "border border-strong bg-raised text-ink hover:bg-hover";
  return (
    <button type="submit" disabled={pending} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-sm border border-error/30 bg-error-bg px-3 py-2 text-12 text-error"
    >
      {message}
    </p>
  );
}
