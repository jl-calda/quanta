"use client";

import { useState } from "react";
import { Button, Dialog, Switch } from "@/components/ds";
import type { PageSettings } from "@/lib/schema/page";
import { updatePageSettings } from "@/server/actions/page";
import { useEditor } from "../state/editor-provider";
import { InlineRow, Section } from "./parts";

type Band = "header" | "footer";
type Zone = "left" | "center" | "right";

const FIELDS: { token: string; label: string }[] = [
  { token: "{page}", label: "Page #" },
  { token: "{pages}", label: "Page count" },
  { token: "{title}", label: "Title" },
  { token: "{date}", label: "Date" },
  { token: "{time}", label: "Time" },
];

/**
 * Headers & footers dialog (Func §7.11) — three zones per band with insertable
 * field tokens (`{page}`, `{title}`, …) and a different-first-page toggle, plus a
 * mini preview. Persists the full `page_settings` object via the
 * `updatePageSettings` Server Action.
 */
export function HeadersFootersDialog({ onClose }: { onClose: () => void }) {
  const { worksheetId, canEdit, pageSettings, setPageSettings } = useEditor();
  const [draft, setDraft] = useState<PageSettings>(pageSettings);
  const [active, setActive] = useState<{ band: Band; zone: Zone }>({ band: "header", zone: "center" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setZone = (band: Band, zone: Zone, value: string) =>
    setDraft((d) => ({ ...d, [band]: { ...d[band], [zone]: value } }));

  const insertField = (token: string) => {
    const { band, zone } = active;
    setDraft((d) => ({ ...d, [band]: { ...d[band], [zone]: (d[band][zone] + " " + token).trim() } }));
  };

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

  const zoneInput = (band: Band, zone: Zone, placeholder: string) => (
    <input
      value={draft[band][zone]}
      placeholder={placeholder}
      onFocus={() => setActive({ band, zone })}
      onChange={(e) => setZone(band, zone, e.target.value)}
      style={{
        height: 30,
        padding: "0 8px",
        font: "12.5px/1 var(--font-mono)",
        border: "1px solid " + (active.band === band && active.zone === zone ? "var(--accent)" : "var(--border-strong)"),
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-raised)",
        color: "var(--text-primary)",
      }}
    />
  );

  const bandEditor = (band: Band, title: string) => (
    <Section eyebrow={title}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {zoneInput(band, "left", "Left")}
        {zoneInput(band, "center", "Center")}
        {zoneInput(band, "right", "Right")}
      </div>
    </Section>
  );

  return (
    <Dialog
      open
      eyebrow="Format"
      title="Headers & footers"
      width={560}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!canEdit || saving}>{saving ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ font: "11.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>Insert field:</span>
          {FIELDS.map((f) => (
            <button
              key={f.token}
              type="button"
              onClick={() => insertField(f.token)}
              style={{ height: 24, padding: "0 10px", border: "1px solid var(--border-strong)", borderRadius: 999, background: "var(--surface-raised)", color: "var(--text-primary)", font: "11.5px/1 var(--font-sans)", cursor: "pointer" }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {bandEditor("header", "Header")}
        {bandEditor("footer", "Footer")}

        <Section eyebrow="Options">
          <InlineRow label="Different first page">
            <Switch checked={draft.differentFirstPage} onChange={(e) => setDraft((d) => ({ ...d, differentFirstPage: e.target.checked }))} />
          </InlineRow>
        </Section>

        {/* Mini preview of the header band. */}
        <div style={{ border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)", padding: "8px 12px", background: "var(--surface-paper)", display: "flex", justifyContent: "space-between", font: "11.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
          <span>{draft.header.left || "·"}</span>
          <span>{draft.header.center || "·"}</span>
          <span>{draft.header.right || "·"}</span>
        </div>

        {error && <span style={{ font: "12px/1.4 var(--font-sans)", color: "var(--status-error)" }}>{error}</span>}
      </div>
    </Dialog>
  );
}
