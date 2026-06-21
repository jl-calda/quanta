"use client";

import { Button, Dialog, IconButton, Input, Select, Switch, Tabs } from "@/components/ds";
import { useMemo, useState } from "react";
import { registerUserUnits, type UserUnitDef, type UserUnitError } from "@/lib/calc";
import { useEditor } from "../state/editor-provider";
import type { UnitsSystem } from "../state/editor-reducer";
import { Icon } from "../icons";
import { Field, InlineRow, Section } from "./parts";

/**
 * Worksheet settings.
 *
 * The **Units** tab is live (Func §7.9 / §2 — user-defined units & unit systems):
 * pick the worksheet's display unit-system (re-display only; stored values never
 * change), and define custom units (`kip := 4.4482216 kN`) + the preferred
 * display list the "Custom" system uses. Both write to `worksheets.content` JSONB
 * via the editor reducer (autosave → the Zod-validated `saveWorksheet` action,
 * RLS server-side); the status-bar selector and this tab share `unitsSystem`, the
 * one source of truth. Calculation/Format CRUD stay a gated, typed shell until
 * their own settings session — flip `SETTINGS_CRUD_ENABLED` when they land.
 */
const SETTINGS_CRUD_ENABLED = false;

export function WorksheetSettingsDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch, canEdit } = useEditor();
  const [tab, setTab] = useState("units");
  const gated = !SETTINGS_CRUD_ENABLED;

  // Editable copies of the worksheet's custom units + preferred display list.
  const [defs, setDefs] = useState<UserUnitDef[]>(() =>
    (state.content.units?.defs ?? []).map((d) => ({ ...d })),
  );
  const [preferred, setPreferred] = useState<string[]>(() => [
    ...(state.content.units?.preferred ?? []),
  ]);

  // Validate the non-empty definitions live (same resolver the engine uses).
  const liveDefs = defs.filter((d) => d.name.trim() || d.definition.trim());
  const liveKey = JSON.stringify(liveDefs);
  const errors = useMemo<UserUnitError[]>(
    () => registerUserUnits(liveDefs).errors,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveKey],
  );
  const errorFor = (name: string) => errors.find((e) => e.name === name.trim());

  const updateDef = (i: number, patch: Partial<UserUnitDef>) =>
    setDefs((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const updatePreferred = (i: number, value: string) =>
    setPreferred((ps) => ps.map((p, j) => (j === i ? value : p)));

  const apply = () => {
    const cleanDefs = defs
      .map((d) => ({ name: d.name.trim(), definition: d.definition.trim() }))
      .filter((d) => d.name && d.definition);
    const cleanPreferred = preferred.map((p) => p.trim()).filter(Boolean);
    const next = structuredClone(state.content);
    if (cleanDefs.length || cleanPreferred.length) {
      next.units = { defs: cleanDefs, preferred: cleanPreferred };
    } else {
      delete next.units;
    }
    dispatch({ type: "REPLACE_CONTENT", content: next });
    onClose();
  };

  return (
    <Dialog
      open
      eyebrow="Worksheet"
      title="Worksheet settings"
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={apply} disabled={!canEdit}>Save</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Tabs
          items={[
            { value: "calculation", label: "Calculation" },
            { value: "units", label: "Units" },
            { value: "format", label: "Format" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "units" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Section eyebrow="Display unit system">
              <Field
                label="Unit system"
                hint="Re-displays results in this system. Stored values don't change."
              >
                <Select
                  value={state.unitsSystem}
                  disabled={!canEdit}
                  onChange={(e) => dispatch({ type: "SET_UNITS", system: e.target.value as UnitsSystem })}
                  options={[
                    { value: "si", label: "SI" },
                    { value: "uscs", label: "US customary" },
                    { value: "cgs", label: "CGS" },
                    { value: "custom", label: "Custom" },
                  ]}
                />
              </Field>
            </Section>

            <Section eyebrow="Custom units">
              {defs.length === 0 && (
                <Empty text="No custom units yet. Add one, e.g. kip := 4.4482216 kN." />
              )}
              {defs.map((d, i) => {
                const err = d.name.trim() ? errorFor(d.name) : undefined;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 96 }}>
                        <Input
                          mono
                          placeholder="kip"
                          value={d.name}
                          invalid={!!err}
                          disabled={!canEdit}
                          aria-label={`Custom unit name ${i + 1}`}
                          onChange={(e) => updateDef(i, { name: e.target.value })}
                        />
                      </div>
                      <span style={{ font: "13px/1 var(--font-mono)", color: "var(--text-muted)" }}>:=</span>
                      <div style={{ flex: 1 }}>
                        <Input
                          mono
                          placeholder="4.4482216 kN"
                          value={d.definition}
                          invalid={!!err}
                          disabled={!canEdit}
                          aria-label={`Custom unit definition ${i + 1}`}
                          onChange={(e) => updateDef(i, { definition: e.target.value })}
                        />
                      </div>
                      <IconButton
                        label="Remove unit"
                        size="sm"
                        disabled={!canEdit}
                        onClick={() => setDefs((ds) => ds.filter((_, j) => j !== i))}
                      >
                        <Icon name="varsX" size={14} />
                      </IconButton>
                    </div>
                    {err && (
                      <span style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--status-error)" }}>
                        {err.message}{err.fixHint ? ` ${err.fixHint}` : ""}
                      </span>
                    )}
                  </div>
                );
              })}
              <AddButton
                label="Add unit"
                disabled={!canEdit}
                onClick={() => setDefs((ds) => [...ds, { name: "", definition: "" }])}
              />
            </Section>

            <Section eyebrow="Preferred display units">
              <span style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
                Used by the “Custom” system. Tried in order — the first matching dimension wins,
                then SI.
              </span>
              {preferred.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      mono
                      placeholder="kip"
                      value={p}
                      disabled={!canEdit}
                      aria-label={`Preferred display unit ${i + 1}`}
                      onChange={(e) => updatePreferred(i, e.target.value)}
                    />
                  </div>
                  <IconButton
                    label="Remove display unit"
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => setPreferred((ps) => ps.filter((_, j) => j !== i))}
                  >
                    <Icon name="varsX" size={14} />
                  </IconButton>
                </div>
              ))}
              <AddButton
                label="Add display unit"
                disabled={!canEdit}
                onClick={() => setPreferred((ps) => [...ps, ""])}
              />
            </Section>
          </div>
        )}

        {tab === "calculation" && (
          <>
            <GatedNote show={gated} />
            <Section eyebrow="Calculation">
              <Field label="Default calc mode">
                <Select disabled={gated} value="auto" options={[{ value: "auto", label: "Auto" }, { value: "manual", label: "Manual" }]} onChange={() => {}} />
              </Field>
              <InlineRow label="Recalculate on open">
                <Switch checked disabled={gated} onChange={() => {}} />
              </InlineRow>
            </Section>
          </>
        )}
        {tab === "format" && (
          <>
            <GatedNote show={gated} />
            <Section eyebrow="Format">
              <Field label="Default result format" hint="Use the Result format dialog for per-result control.">
                <Select disabled={gated} value="auto" options={[{ value: "auto", label: "Auto" }, { value: "sci", label: "Scientific" }, { value: "eng", label: "Engineering" }]} onChange={() => {}} />
              </Field>
            </Section>
          </>
        )}
      </div>
    </Dialog>
  );
}

function GatedNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        background: "var(--accent-tint)",
        border: "1px solid var(--border-hairline)",
        font: "12.5px/1.5 var(--font-sans)",
        color: "var(--text-primary)",
      }}
    >
      These defaults are managed in{" "}
      <a href="/settings" style={{ color: "var(--text-link)" }}>workspace settings</a> for now.
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <span style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)", fontStyle: "italic" }}>
      {text}
    </span>
  );
}

function AddButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        alignSelf: "flex-start",
        border: "none",
        background: "none",
        color: disabled ? "var(--text-muted)" : "var(--accent)",
        font: "500 12px/1 var(--font-sans)",
        cursor: disabled ? "default" : "pointer",
        padding: 0,
      }}
    >
      <Icon name="plusSm" size={13} /> {label}
    </button>
  );
}
