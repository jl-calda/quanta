"use client";

import { useState } from "react";
import { Button, Dialog, IconButton, Input, Select } from "@/components/ds";
import { findRegion } from "@/lib/worksheet/flatten";
import { applyConditionalRules, previewConditionalStyle } from "@/lib/worksheet/formatting";
import type { CondOp, CondRule } from "@/lib/worksheet/content";
import { useEditor } from "../state/editor-provider";
import { Icon } from "../icons";
import { ScopeToggle, Section } from "./parts";

const OPS: CondOp[] = [">", ">=", "=", "!=", "<", "<="];

const COLORS: { value: string; label: string }[] = [
  { value: "var(--status-pass)", label: "Pass (green)" },
  { value: "var(--status-warning)", label: "Warning (amber)" },
  { value: "var(--status-error)", label: "Error (red)" },
  { value: "var(--accent)", label: "Accent (blue)" },
  { value: "var(--text-muted)", label: "Muted (grey)" },
];

/** Coerce a rule-value field to a number when it parses, else keep the string. */
function coerce(v: string): number | string {
  const n = Number(v);
  return v.trim() !== "" && !Number.isNaN(n) ? n : v;
}

/**
 * Conditional-format dialog (Func §7.18) — a rule list + a LIVE preview rendered
 * by the same `applyConditional` the engine uses, at region or worksheet scope.
 * Region scope writes `region.conditional`; worksheet scope writes every math
 * region in one `REPLACE_CONTENT`.
 */
export function ConditionalFormatDialog({ regionId, onClose }: { regionId: string | null; onClose: () => void }) {
  const { state, dispatch, canEdit } = useEditor();
  const targetId = regionId ?? state.selectedId;
  const region = targetId ? findRegion(state.content, targetId) : undefined;
  const initial = region && region.type === "math" ? region.conditional ?? [] : [];

  const [rules, setRules] = useState<CondRule[]>(initial);
  const [scope, setScope] = useState<"region" | "worksheet">("region");

  const update = (i: number, patch: Partial<CondRule>) =>
    setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const updateStyle = (i: number, patch: Partial<CondRule["style"]>) =>
    setRules((rs) => rs.map((r, j) => (j === i ? { ...r, style: { ...r.style, ...patch } } : r)));
  const remove = (i: number) => setRules((rs) => rs.filter((_, j) => j !== i));
  const add = () =>
    setRules((rs) => [...rs, { op: ">", value: 1, style: { color: "var(--status-error)", label: "FAIL" } }]);

  const liveValue = targetId ? state.results.get(targetId)?.value : undefined;
  const sample = typeof liveValue === "number" ? liveValue : 0.85;
  const matched = previewConditionalStyle(sample, rules);

  const canApply = canEdit && (scope === "worksheet" || region?.type === "math");

  const apply = () => {
    if (scope === "region" && region?.type === "math") {
      dispatch({ type: "SET_REGION_PROP", id: region.id, patch: { conditional: rules } });
    } else if (scope === "worksheet") {
      dispatch({ type: "REPLACE_CONTENT", content: applyConditionalRules(state.content, "worksheet", rules) });
    }
    onClose();
  };

  return (
    <Dialog
      open
      eyebrow="Format"
      title="Conditional formatting"
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={apply} disabled={!canApply}>Apply</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Live preview for the sample value. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            minHeight: 56,
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-paper)",
          }}
        >
          <span style={{ font: "22px/1 var(--font-math)", color: matched?.color ?? "var(--status-pass)", fontWeight: matched?.bold ? 700 : 400 }}>
            {sample}
          </span>
          {matched?.label && (
            <span style={{ font: "11px/1 var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: matched.color ?? "var(--status-error)" }}>
              {matched.label}
            </span>
          )}
          <span style={{ font: "11.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
            preview · result = {sample}
          </span>
        </div>

        <Section eyebrow="Rules">
          {rules.length === 0 && (
            <span style={{ font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
              No rules yet. Add one to colour or tag the result by value.
            </span>
          )}
          {rules.map((rule, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 64px 1fr auto auto auto",
                alignItems: "center",
                gap: 6,
                padding: 8,
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-raised)",
              }}
            >
              <span style={{ font: "12px/1 var(--font-sans)", color: "var(--text-muted)" }}>if</span>
              <Select value={rule.op} onChange={(e) => update(i, { op: e.target.value as CondOp })} options={OPS.map((o) => ({ value: o, label: o }))} />
              <Input mono defaultValue={String(rule.value)} onBlur={(e) => update(i, { value: coerce(e.target.value) })} placeholder="value" />
              <div style={{ width: 130 }}>
                <Select value={rule.style.color ?? "var(--status-error)"} onChange={(e) => updateStyle(i, { color: e.target.value })} options={COLORS} />
              </div>
              <Input defaultValue={rule.style.label ?? ""} onBlur={(e) => updateStyle(i, { label: e.target.value || undefined })} placeholder="tag" style={{ width: 72 }} />
              <IconButton label="Remove rule" size="sm" onClick={() => remove(i)}>
                <Icon name="varsX" size={14} />
              </IconButton>
            </div>
          ))}
          <button
            type="button"
            onClick={add}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, alignSelf: "flex-start", border: "none", background: "none", color: "var(--accent)", font: "500 12px/1 var(--font-sans)", cursor: "pointer", padding: 0 }}
          >
            <Icon name="plusSm" size={13} /> Add rule
          </button>
        </Section>

        <Section eyebrow="Apply to">
          <ScopeToggle value={scope} onChange={setScope} />
        </Section>
      </div>
    </Dialog>
  );
}
