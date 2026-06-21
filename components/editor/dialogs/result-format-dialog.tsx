"use client";

import { useState } from "react";
import { Button, Dialog, Select, Switch } from "@/components/ds";
import { findRegion } from "@/lib/worksheet/flatten";
import { applyResultFormat, previewResult } from "@/lib/worksheet/formatting";
import type { ComplexForm, Notation, Radix, ResultFormat } from "@/lib/worksheet/content";
import { useEditor } from "../state/editor-provider";
import { Field, InlineRow, ScopeToggle, Section, Stepper } from "./parts";

/**
 * Result-format dialog (Func §7.8) — the full result-format surface (more than
 * the inline inspector affordance): decimals / sig figs / notation / number base
 * / thousands, with a LIVE preview rendered by the same `formatValue` the canvas
 * uses (so preview == committed) and a region/worksheet scope. Region scope
 * writes `region.format` (persisted by content autosave); worksheet scope writes
 * every math region in one `REPLACE_CONTENT`.
 */
export function ResultFormatDialog({ regionId, onClose }: { regionId: string | null; onClose: () => void }) {
  const { state, dispatch, canEdit } = useEditor();
  const targetId = regionId ?? state.selectedId;
  const region = targetId ? findRegion(state.content, targetId) : undefined;
  const initial = region && region.type === "math" ? region.format ?? {} : {};

  const [fmt, setFmt] = useState<ResultFormat>(initial);
  const [scope, setScope] = useState<"region" | "worksheet">("region");

  const set = (patch: Partial<ResultFormat>) => setFmt((f) => ({ ...f, ...patch }));

  // Preview the region's live value where available, else a representative one.
  const liveValue = targetId ? state.results.get(targetId)?.value : undefined;
  const sample = liveValue ?? 1234.56789;
  let preview = "";
  try {
    preview = previewResult(sample, fmt);
  } catch {
    preview = "—";
  }

  const canApply = canEdit && (scope === "worksheet" || (region?.type === "math"));

  const apply = () => {
    if (scope === "region" && region?.type === "math") {
      dispatch({ type: "SET_REGION_PROP", id: region.id, patch: { format: fmt } });
    } else if (scope === "worksheet") {
      dispatch({ type: "REPLACE_CONTENT", content: applyResultFormat(state.content, "worksheet", fmt) });
    }
    onClose();
  };

  return (
    <Dialog
      open
      eyebrow="Format"
      title="Result format"
      width={460}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={apply} disabled={!canApply}>Apply</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Live preview — identical to the worksheet result. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 64,
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-paper)",
            font: "24px/1.2 var(--font-math)",
            color: "var(--status-pass)",
          }}
        >
          {preview}
        </div>

        <Section eyebrow="Precision">
          <InlineRow label="Decimal places">
            <Stepper value={fmt.decimals ?? 2} onChange={(v) => set({ decimals: v })} />
          </InlineRow>
          <InlineRow label="Significant figures">
            <div style={{ width: 110 }}>
              <Select
                value={fmt.sigfigs ? String(fmt.sigfigs) : "auto"}
                onChange={(e) => set({ sigfigs: e.target.value === "auto" ? undefined : Number(e.target.value) })}
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "3", label: "3" },
                  { value: "4", label: "4" },
                  { value: "5", label: "5" },
                  { value: "6", label: "6" },
                ]}
              />
            </div>
          </InlineRow>
        </Section>

        <Section eyebrow="Notation">
          <Field label="Notation">
            <Select
              value={fmt.notation ?? "auto"}
              onChange={(e) => set({ notation: e.target.value as Notation })}
              options={[
                { value: "auto", label: "Auto" },
                { value: "decimal", label: "Decimal" },
                { value: "sci", label: "Scientific" },
                { value: "eng", label: "Engineering" },
              ]}
            />
          </Field>
          <Field label="Number base" hint="Binary / octal / hex apply to whole-number results.">
            <Select
              value={fmt.radix ?? "dec"}
              onChange={(e) => set({ radix: e.target.value as Radix })}
              options={[
                { value: "dec", label: "Decimal" },
                { value: "bin", label: "Binary" },
                { value: "oct", label: "Octal" },
                { value: "hex", label: "Hexadecimal" },
              ]}
            />
          </Field>
          <InlineRow label="Thousands separators">
            <Switch checked={!!fmt.thousands} onChange={(e) => set({ thousands: e.target.checked })} />
          </InlineRow>
          <InlineRow label="Keep trailing zeros">
            <Switch checked={!!fmt.trailingZeros} onChange={(e) => set({ trailingZeros: e.target.checked })} />
          </InlineRow>
          <Field label="Complex form" hint="How complex results are written.">
            <Select
              value={fmt.complex ?? "rect"}
              onChange={(e) => set({ complex: e.target.value as ComplexForm })}
              options={[
                { value: "rect", label: "a + b i" },
                { value: "polar", label: "Polar (r∠θ)" },
              ]}
            />
          </Field>
        </Section>

        <Section eyebrow="Apply to">
          <ScopeToggle value={scope} onChange={setScope} />
          <span style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
            Set new-worksheet defaults in <a href="/settings" style={{ color: "var(--text-link)" }}>workspace settings</a>.
          </span>
        </Section>
      </div>
    </Dialog>
  );
}
