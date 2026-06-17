"use client";

import { useMemo } from "react";
import { formatValue, math, SI_SYSTEM, toDisplayUnit } from "@/lib/calc";
import { toResultFormat, type FormatSettings, type UnitSystemPref } from "@/lib/settings/types";

/**
 * Units & formatting live preview (settings-app.jsx:150–162) — but driven by the
 * REAL engine formatter so it stays unit-aware and faithful. A 52 800 N sample is
 * converted to the chosen unit system's display unit, then run through
 * `formatValue(value, toResultFormat(format))`.
 */

/** Best-effort display unit per system. SI uses the engine's preferred list. */
const SYSTEM_UNIT: Record<Exclude<UnitSystemPref, "si">, string> = {
  uscs: "lbf",
  cgs: "dyn",
  custom: "N",
};

function previewResult(
  unitSystem: UnitSystemPref,
  format: FormatSettings,
): { text: string; unit: string } {
  const sample = math.evaluate("52800 N");
  let display: unknown = sample;

  if (unitSystem === "si") {
    display = toDisplayUnit(sample, undefined, SI_SYSTEM);
  } else {
    try {
      display = (sample as { to: (u: string) => unknown }).to(SYSTEM_UNIT[unitSystem]);
    } catch {
      display = sample; // mathjs doesn't know the unit — keep the base value.
    }
  }

  const formatted = formatValue(display, toResultFormat(format));
  // `formatValue` returns "<number> <unit>"; split the unit off for styling.
  const i = formatted.indexOf(" ");
  if (i < 0) return { text: formatted, unit: "" };
  return { text: formatted.slice(0, i), unit: formatted.slice(i + 1) };
}

export function PreviewChip({
  unitSystem,
  format,
}: {
  unitSystem: UnitSystemPref;
  format: FormatSettings;
}) {
  const r = useMemo(() => previewResult(unitSystem, format), [unitSystem, format]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 18px",
        border: "1px solid var(--border-hairline)",
        borderRadius: 8,
        background: "var(--surface-raised)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            font: "11px/1 var(--font-sans)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 8,
          }}
        >
          Live preview
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: "0.4em",
            fontFamily: "var(--font-math)",
            fontSize: 20,
            color: "var(--text-math)",
          }}
        >
          <span style={{ fontStyle: "italic" }}>F</span>
          <span
            style={{
              fontSize: "0.7em",
              fontStyle: "italic",
              alignSelf: "flex-end",
              marginBottom: 2,
            }}
          >
            d
          </span>
          <span style={{ margin: "0 0.1em" }}>=</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: "0.22em",
              padding: "2px 10px",
              borderRadius: 4,
              background: "var(--accent-tint)",
              color: "var(--accent)",
              fontWeight: 600,
            }}
          >
            <span>{r.text}</span>
            {r.unit && <span style={{ fontSize: "0.78em" }}>{r.unit}</span>}
          </span>
        </div>
      </div>
      <div
        style={{
          font: "11.5px/1.5 var(--font-sans)",
          color: "var(--text-muted)",
          textAlign: "right",
          borderLeft: "1px solid var(--border-hairline)",
          paddingLeft: 16,
        }}
      >
        <div>Sample value</div>
        <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
          52 800 N
        </div>
      </div>
    </div>
  );
}
