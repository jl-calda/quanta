"use client";

import { useState } from "react";
import { Button, Dialog, Select, Switch } from "@/components/ds";
import { TEXT_STYLE_FONTS, type LayoutSettings, type TextStyle } from "@/lib/schema/page";
import { updateLayoutSettings } from "@/server/actions/page";
import { useEditor } from "../state/editor-provider";
import { Field, InlineRow, Stepper } from "./parts";

const FONT_VAR: Record<(typeof TEXT_STYLE_FONTS)[number], string> = {
  sans: "var(--font-sans)", math: "var(--font-math)", mono: "var(--font-mono)",
};

const COLORS = [
  { value: "var(--text-primary)", label: "Ink" },
  { value: "var(--text-muted)", label: "Muted" },
  { value: "var(--accent)", label: "Blueprint" },
  { value: "var(--status-pass)", label: "Pass" },
  { value: "var(--status-error)", label: "Error" },
];

/**
 * Text-styles dialog (Func §7.19) — manage the worksheet's named text styles
 * (Title / Heading / Body / …) with a live preview line, persisting to
 * `layout_settings.textStyles` via the `updateLayoutSettings` Server Action.
 */
export function TextStylesDialog({ onClose }: { onClose: () => void }) {
  const { worksheetId, canEdit, layoutSettings, setLayoutSettings } = useEditor();
  const [draft, setDraft] = useState<LayoutSettings>(layoutSettings);
  const ids = Object.keys(draft.textStyles);
  const [selected, setSelected] = useState<string>(ids[0] ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style: TextStyle | undefined = draft.textStyles[selected];

  const setStyle = (patch: Partial<TextStyle>) =>
    setDraft((d) => ({ ...d, textStyles: { ...d.textStyles, [selected]: { ...d.textStyles[selected], ...patch } } }));

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await updateLayoutSettings({ id: worksheetId, layoutSettings: draft });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLayoutSettings(draft);
    onClose();
  };

  return (
    <Dialog
      open
      eyebrow="Format"
      title="Text styles"
      width={620}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!canEdit || saving}>{saving ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 16 }}>
        {/* Style list. */}
        <div style={{ flex: "0 0 150px", display: "flex", flexDirection: "column", gap: 2, borderRight: "1px solid var(--border-hairline)", paddingRight: 12 }}>
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              style={{
                textAlign: "left",
                padding: "7px 10px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: id === selected ? "var(--accent-tint)" : "transparent",
                color: id === selected ? "var(--accent-press)" : "var(--text-primary)",
                font: "12.5px/1 var(--font-sans)",
                cursor: "pointer",
              }}
            >
              {draft.textStyles[id].label}
            </button>
          ))}
        </div>

        {/* Editor + preview. */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {style ? (
            <>
              <div
                style={{
                  minHeight: 56,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-paper)",
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_VAR[style.font],
                    fontSize: style.size,
                    fontWeight: style.weight,
                    fontStyle: style.italic ? "italic" : "normal",
                    color: style.color,
                  }}
                >
                  {style.label} — the quick brown fox
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Font">
                  <Select value={style.font} onChange={(e) => setStyle({ font: e.target.value as TextStyle["font"] })} options={[{ value: "sans", label: "Sans (UI)" }, { value: "math", label: "Math (STIX)" }, { value: "mono", label: "Mono" }]} />
                </Field>
                <Field label="Weight">
                  <Select value={String(style.weight)} onChange={(e) => setStyle({ weight: Number(e.target.value) as TextStyle["weight"] })} options={[{ value: "400", label: "Regular" }, { value: "500", label: "Medium" }, { value: "600", label: "Semibold" }, { value: "700", label: "Bold" }]} />
                </Field>
                <Field label="Color">
                  <Select value={style.color} onChange={(e) => setStyle({ color: e.target.value })} options={COLORS} />
                </Field>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <InlineRow label="Size (px)">
                    <Stepper value={style.size} min={9} max={48} onChange={(size) => setStyle({ size })} />
                  </InlineRow>
                  <InlineRow label="Italic">
                    <Switch checked={style.italic} onChange={(e) => setStyle({ italic: e.target.checked })} />
                  </InlineRow>
                </div>
              </div>
            </>
          ) : (
            <span style={{ font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>No text styles yet.</span>
          )}
          {error && <span style={{ font: "12px/1.4 var(--font-sans)", color: "var(--status-error)" }}>{error}</span>}
        </div>
      </div>
    </Dialog>
  );
}
