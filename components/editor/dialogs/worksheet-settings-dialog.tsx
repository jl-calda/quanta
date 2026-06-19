"use client";

import { Button, Dialog, Select, Switch, Tabs } from "@/components/ds";
import { useState } from "react";
import { Field, InlineRow, Section } from "./parts";

/**
 * Worksheet settings — GATED TYPED SHELL.
 *
 * Worksheet settings-CRUD and custom unit systems are deferred to the app-shell /
 * settings refinement (its own session). This is the typed, compiling seam: a
 * settings-form shell whose inputs are disabled and which points at workspace
 * settings, so there is no dead or broken UI. Flip `SETTINGS_CRUD_ENABLED` when
 * the persisted CRUD lands.
 */
const SETTINGS_CRUD_ENABLED = false;

export function WorksheetSettingsDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState("calculation");
  const disabled = !SETTINGS_CRUD_ENABLED;

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
          <Button disabled={disabled}>Save</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {disabled && (
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
            Per-worksheet settings and custom unit systems are managed in{" "}
            <a href="/settings" style={{ color: "var(--text-link)" }}>workspace settings</a> for now.
          </div>
        )}

        <Tabs
          items={[
            { value: "calculation", label: "Calculation" },
            { value: "units", label: "Units" },
            { value: "format", label: "Format" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "calculation" && (
          <Section eyebrow="Calculation">
            <Field label="Default calc mode">
              <Select disabled={disabled} value="auto" options={[{ value: "auto", label: "Auto" }, { value: "manual", label: "Manual" }]} onChange={() => {}} />
            </Field>
            <InlineRow label="Recalculate on open">
              <Switch checked disabled={disabled} onChange={() => {}} />
            </InlineRow>
          </Section>
        )}
        {tab === "units" && (
          <Section eyebrow="Units">
            <Field label="Unit system" hint="Custom unit systems are managed in workspace settings.">
              <Select disabled={disabled} value="si" options={[{ value: "si", label: "SI" }, { value: "uscs", label: "US customary" }, { value: "cgs", label: "CGS" }]} onChange={() => {}} />
            </Field>
          </Section>
        )}
        {tab === "format" && (
          <Section eyebrow="Format">
            <Field label="Default result format" hint="Use the Result format dialog for per-result control.">
              <Select disabled={disabled} value="auto" options={[{ value: "auto", label: "Auto" }, { value: "sci", label: "Scientific" }, { value: "eng", label: "Engineering" }]} onChange={() => {}} />
            </Field>
          </Section>
        )}
      </div>
    </Dialog>
  );
}
