"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

/**
 * MathRegion — Quanta's signature element. A live calculation cell that
 * toggles between EDIT mode (raw spreadsheet-style formula in Geist Mono) and
 * COMMITTED mode (crisp textbook notation in the math serif), with a
 * highlighted result and unit. Click a committed region to edit; press Enter
 * or blur to commit. The transform is the product's defining moment.
 *
 * The committed right-hand-side expression is passed as `children`, composed
 * from the math primitives (Var, Sub, Frac, Sqrt, …).
 *
 * Ported 1:1 from the _ds bundle (components/math/MathRegion.jsx). This module
 * intentionally does NOT import the `Math` primitive so that the `Math.max`
 * below resolves to the global object.
 */

export type MathRegionStatus = "pass" | "warning" | "error";
export type MathRegionMode = "edit" | "committed";

export interface MathRegionProps {
  name?: ReactNode;
  formula?: string;
  result?: ReactNode | null;
  unit?: ReactNode | null;
  status?: MathRegionStatus | null;
  note?: ReactNode | null;
  selected?: boolean;
  defaultMode?: MathRegionMode;
  onCommit?: ((draft: string) => void) | null;
  children?: ReactNode;
  style?: CSSProperties;
}

export function MathRegion({
  name,
  formula = "",
  result = null,
  unit = null,
  status = null,
  note = null,
  selected = false,
  defaultMode = "committed",
  onCommit = null,
  children,
  style,
}: MathRegionProps) {
  const [mode, setMode] = useState<MathRegionMode>(defaultMode);
  const [draft, setDraft] = useState(formula);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "edit" && inputRef.current) inputRef.current.focus();
  }, [mode]);

  const statusColor = status
    ? { pass: "var(--status-pass)", warning: "var(--status-warning)", error: "var(--status-error)" }[status]
    : null;
  const statusBg = status
    ? { pass: "var(--status-pass-bg)", warning: "var(--status-warning-bg)", error: "var(--status-error-bg)" }[status]
    : null;

  const commit = () => {
    setMode("committed");
    onCommit?.(draft);
  };

  const outline = selected ? "var(--accent)" : "transparent";
  const bg = selected ? "var(--surface-selected)" : "transparent";

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "6px 10px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid " + outline,
        background: bg,
        transition: "background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)",
        ...style,
      }}
    >
      {mode === "edit" ? (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              font: "500 var(--text-11)/1 var(--font-sans)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            edit
          </span>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(formula);
                setMode("committed");
              }
            }}
            onBlur={commit}
            spellCheck={false}
            style={{
              font: "var(--text-14)/1.3 var(--font-mono)",
              color: "var(--text-primary)",
              background: "var(--surface-raised)",
              border: "1px solid var(--border-focus)",
              boxShadow: "0 0 0 2px color-mix(in srgb, var(--accent) 28%, transparent)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 8px",
              minWidth: Math.max(180, (draft.length + 2) * 8.2),
              outline: "none",
            }}
          />
        </div>
      ) : (
        <div
          onClick={() => setMode("edit")}
          title="Click to edit formula"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45em",
            cursor: "text",
            font: "17px/1.1 var(--font-math)",
            color: "var(--text-math)",
          }}
        >
          {name && <span style={{ fontFamily: "var(--font-math)", fontStyle: "italic", whiteSpace: "nowrap" }}>{name}</span>}
          {name && children && <span style={{ fontFamily: "var(--font-math)", padding: "0 0.1em" }}>=</span>}
          {children && (
            <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", columnGap: "0.1em" }}>
              {children}
            </span>
          )}
          {result != null && (
            <>
              <span style={{ fontFamily: "var(--font-math)", padding: "0 0.1em" }}>=</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: "0.18em",
                  padding: "1px 7px",
                  borderRadius: "var(--radius-sm)",
                  background: statusBg || "var(--accent-tint)",
                  color: statusColor || "var(--accent)",
                  fontFamily: "var(--font-math)",
                  fontWeight: 600,
                  fontStyle: "normal",
                }}
              >
                <span>{result}</span>
                {unit && <span style={{ fontSize: "0.82em", fontStyle: "normal" }}>{unit}</span>}
              </span>
            </>
          )}
          {status && (
            <span
              style={{
                marginLeft: "0.35em",
                font: "600 var(--text-11)/1 var(--font-sans)",
                letterSpacing: "0.02em",
                color: statusColor ?? undefined,
                fontStyle: "normal",
                textTransform: "uppercase",
              }}
            >
              {status === "pass" ? "OK" : status === "warning" ? "Check" : "Fail"}
            </span>
          )}
        </div>
      )}
      {note && mode === "committed" && (
        <span
          style={{
            font: "var(--text-12)/1.3 var(--font-sans)",
            color: "var(--text-muted)",
            marginLeft: "var(--space-2)",
            fontStyle: "italic",
          }}
        >
          {note}
        </span>
      )}
    </div>
  );
}
