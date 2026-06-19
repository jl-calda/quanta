"use client";

import { useState } from "react";
import { Button, Dialog, Select, Switch } from "@/components/ds";
import { PAGE_SIZES, type PageSettings } from "@/lib/schema/page";
import { updatePageSettings } from "@/server/actions/page";
import { useEditor } from "../state/editor-provider";
import { Field, InlineRow, Section, Stepper } from "./parts";

const SIZE_LABELS: Record<(typeof PAGE_SIZES)[number], string> = {
  a4: "A4", letter: "Letter", legal: "Legal", a3: "A3", tabloid: "Tabloid",
};

function NumberBox({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ font: "11px/1 var(--font-sans)", color: "var(--text-muted)" }}>{label}</span>
      <input
        type="number"
        value={value}
        min={0}
        max={100}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", height: 30, padding: "0 8px", font: "13px/1 var(--font-mono)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", background: "var(--surface-raised)", color: "var(--text-primary)" }}
      />
    </label>
  );
}

/**
 * Page-setup dialog (Func §7.12) — paper size, orientation, margins, gridlines,
 * and printed frames, with a live page-proportion preview. Persists the whole
 * `page_settings` object through the `updatePageSettings` Server Action (RLS-
 * gated); headers/footers live in their own dialog but share the column.
 */
export function PageSetupDialog({ onClose }: { onClose: () => void }) {
  const { worksheetId, canEdit, pageSettings, setPageSettings } = useEditor();
  const [draft, setDraft] = useState<PageSettings>(pageSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<PageSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const landscape = draft.orientation === "landscape";

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await updatePageSettings({ id: worksheetId, pageSettings: draft });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPageSettings(draft);
    onClose();
  };

  return (
    <Dialog
      open
      eyebrow="Format"
      title="Page setup"
      width={560}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!canEdit || saving}>{saving ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          <Section eyebrow="Paper">
            <Field label="Size">
              <Select value={draft.size} onChange={(e) => set({ size: e.target.value as PageSettings["size"] })} options={PAGE_SIZES.map((s) => ({ value: s, label: SIZE_LABELS[s] }))} />
            </Field>
            <Field label="Orientation">
              <Select value={draft.orientation} onChange={(e) => set({ orientation: e.target.value as PageSettings["orientation"] })} options={[{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} />
            </Field>
          </Section>

          <Section eyebrow="Margins (mm)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <NumberBox label="Top" value={draft.margins.top} onChange={(top) => set({ margins: { ...draft.margins, top } })} />
              <NumberBox label="Bottom" value={draft.margins.bottom} onChange={(bottom) => set({ margins: { ...draft.margins, bottom } })} />
              <NumberBox label="Left" value={draft.margins.left} onChange={(left) => set({ margins: { ...draft.margins, left } })} />
              <NumberBox label="Right" value={draft.margins.right} onChange={(right) => set({ margins: { ...draft.margins, right } })} />
            </div>
          </Section>

          <Section eyebrow="Grid & frames">
            <InlineRow label="Show dot grid">
              <Switch checked={draft.gridlines.show} onChange={(e) => set({ gridlines: { ...draft.gridlines, show: e.target.checked } })} />
            </InlineRow>
            <InlineRow label="Grid spacing (px)">
              <Stepper value={draft.gridlines.spacing} min={4} max={64} onChange={(spacing) => set({ gridlines: { ...draft.gridlines, spacing } })} />
            </InlineRow>
            <InlineRow label="Frame the body">
              <Switch checked={draft.frames.body} onChange={(e) => set({ frames: { ...draft.frames, body: e.target.checked } })} />
            </InlineRow>
          </Section>

          {error && <span style={{ font: "12px/1.4 var(--font-sans)", color: "var(--status-error)" }}>{error}</span>}
        </div>

        {/* Proportion preview. */}
        <div style={{ flex: "0 0 150px", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 22 }}>
          <div
            style={{
              width: landscape ? 150 : 110,
              height: landscape ? 110 : 150,
              border: "1px solid var(--border-strong)",
              borderRadius: 3,
              background: draft.gridlines.show ? "var(--surface-paper)" : "var(--surface-raised)",
              position: "relative",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: `${draft.margins.top / 4}px ${draft.margins.right / 4}px ${draft.margins.bottom / 4}px ${draft.margins.left / 4}px`,
                border: "1px dashed var(--accent)",
                background: draft.frames.body ? "var(--accent-tint)" : "transparent",
              }}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
