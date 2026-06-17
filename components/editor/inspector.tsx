"use client";

import type { ReactNode } from "react";
import { Badge, IconButton, Input, Select, Switch } from "@/components/ds";
import { findRegion } from "@/lib/worksheet/flatten";
import type { MathRegion, Notation, Radix, Region, TextRegion } from "@/lib/worksheet/content";
import { DEFAULT_DISPLAY } from "@/lib/worksheet/content";
import { useEditor } from "./state/editor-provider";
import type { RegionPatch } from "./state/editor-reducer";
import { Icon } from "./icons";

/**
 * Inspector — two-way binds to the selected region's properties: result format,
 * target unit, show-steps display flags, conditional formatting, and region
 * chrome (border, tag). Read-only roles see the values but can't change them.
 */
export function Inspector() {
  const { state, dispatch, canEdit } = useEditor();
  const open = state.ui.rightOpen;
  const region = state.selectedId ? findRegion(state.content, state.selectedId) : undefined;

  if (!open) {
    return (
      <div style={{ width: 32, flex: "0 0 32px", borderLeft: "1px solid var(--border-hairline)", background: "var(--surface-chrome)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
        <IconButton label="Show inspector" onClick={() => dispatch({ type: "TOGGLE_RIGHT" })}>
          <Icon name="chevL" size={17} />
        </IconButton>
      </div>
    );
  }

  const set = (patch: RegionPatch) => region && dispatch({ type: "SET_REGION_PROP", id: region.id, patch });

  return (
    <aside style={{ width: 286, flex: "0 0 286px", borderLeft: "1px solid var(--border-hairline)", background: "var(--surface-chrome)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border-hairline)" }}>
        <span style={{ font: "600 13px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>Inspector</span>
        {region && <Badge tone="accent">{regionLabel(region.type)}</Badge>}
        <IconButton label="Hide inspector" size="sm" style={{ marginLeft: "auto" }} onClick={() => dispatch({ type: "TOGGLE_RIGHT" })}>
          <Icon name="chevR" size={16} />
        </IconButton>
      </div>

      {!region ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <span style={{ font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>Select a region to inspect its format, units, and display.</span>
        </div>
      ) : (
        <div className="scroll-y" style={{ flex: 1, minHeight: 0, pointerEvents: canEdit ? "auto" : "none", opacity: canEdit ? 1 : 0.7 }}>
          {region.type === "math" && <MathInspector region={region} set={set} />}
          {region.type === "text" && <TextInspector region={region} set={set} />}
          <Group eyebrow="Region">
            <Row label="Show border">
              <Switch checked={!!region.border} onChange={(e) => set({ border: e.target.checked })} />
            </Row>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>Tag / label</span>
              <Input mono defaultValue={region.tag ?? ""} prefix="#" onBlur={(e) => set({ tag: e.target.value || undefined })} />
            </div>
          </Group>
        </div>
      )}
    </aside>
  );
}

function MathInspector({ region, set }: { region: MathRegion; set: (p: RegionPatch) => void }) {
  const fmt = region.format ?? {};
  const display = { ...DEFAULT_DISPLAY, ...(region.display ?? {}) };
  const radix = (fmt.radix ?? "dec") as Radix;
  return (
    <>
      <Group eyebrow="Result format">
        <Row label="Decimal places">
          <Stepper value={fmt.decimals ?? 2} set={(v) => set({ format: { ...fmt, decimals: v } })} />
        </Row>
        <Row label="Significant figures">
          <div style={{ width: 96 }}>
            <Select
              value={fmt.sigfigs ? String(fmt.sigfigs) : "auto"}
              onChange={(e) => set({ format: { ...fmt, sigfigs: e.target.value === "auto" ? undefined : Number(e.target.value) } })}
              options={[{ value: "auto", label: "Auto" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" }]}
            />
          </div>
        </Row>
        <Row label="Notation">
          <div style={{ width: 120 }}>
            <Select
              value={fmt.notation ?? "auto"}
              onChange={(e) => set({ format: { ...fmt, notation: e.target.value as Notation } })}
              options={[{ value: "auto", label: "Auto" }, { value: "sci", label: "Scientific" }, { value: "eng", label: "Engineering" }]}
            />
          </div>
        </Row>
        <Row label="Radix">
          <Segmented options={["dec", "bin", "oct", "hex"]} value={radix} set={(v) => set({ format: { ...fmt, radix: v as Radix } })} />
        </Row>
      </Group>

      <Group eyebrow="Units">
        <Row label="Target unit">
          <div style={{ width: 110 }}>
            <Input mono defaultValue={region.unit ?? ""} placeholder="kN" onBlur={(e) => set({ unit: e.target.value || undefined })} />
          </div>
        </Row>
        <div style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>Auto-converts from base SI. Mismatches flag inline.</div>
      </Group>

      <Group eyebrow="Display — show steps">
        {(["name", "formula", "substituted", "result"] as const).map((flag) => (
          <Row key={flag} label={flag === "substituted" ? "Substituted values" : flag[0].toUpperCase() + flag.slice(1)}>
            <Switch checked={display[flag]} onChange={(e) => set({ display: { ...display, [flag]: e.target.checked } })} />
          </Row>
        ))}
      </Group>

      <Group eyebrow="Conditional format">
        {(region.conditional ?? []).map((rule, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)", background: "var(--surface-raised)" }}>
            <span style={{ font: "12px/1.3 var(--font-mono)", color: "var(--text-primary)", flex: 1 }}>if result {rule.op} {String(rule.value)} →</span>
            {rule.style.label && <span style={{ font: "11px/1 var(--font-sans)", color: rule.style.color ?? "var(--status-error)" }}>{rule.style.label}</span>}
            <IconButton label="Remove rule" size="sm" onClick={() => set({ conditional: (region.conditional ?? []).filter((_, j) => j !== i) })}>
              <Icon name="varsX" size={14} />
            </IconButton>
          </div>
        ))}
        <button
          onClick={() => set({ conditional: [...(region.conditional ?? []), { op: ">", value: 1, style: { color: "var(--status-error)", label: "FAIL" } }] })}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, alignSelf: "flex-start", border: "none", background: "none", color: "var(--accent)", font: "500 12px/1 var(--font-sans)", cursor: "pointer", padding: 0 }}
        >
          <Icon name="plusSm" size={13} /> Add rule
        </button>
      </Group>
    </>
  );
}

function TextInspector({ region, set }: { region: TextRegion; set: (p: RegionPatch) => void }) {
  return (
    <Group eyebrow="Text">
      <Row label="Style">
        <div style={{ width: 120 }}>
          <Select
            value={region.heading ? String(region.heading) : "body"}
            onChange={(e) => set({ heading: e.target.value === "body" ? undefined : (Number(e.target.value) as 1 | 2 | 3) })}
            options={[{ value: "body", label: "Body" }, { value: "1", label: "Heading 1" }, { value: "2", label: "Heading 2" }, { value: "3", label: "Heading 3" }]}
          />
        </div>
      </Row>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>Eyebrow</span>
        <Input defaultValue={region.eyebrow ?? ""} placeholder="Optional label" onBlur={(e) => set({ eyebrow: e.target.value || undefined })} />
      </div>
    </Group>
  );
}

/* ---- inspector primitives ---- */

function Group({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div style={{ padding: "13px 14px", borderBottom: "1px solid var(--border-hairline)" }}>
      <div style={{ font: "600 11px/1 var(--font-sans)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--text-muted)" }}>{eyebrow}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 11 }}>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ font: "12.5px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>{label}</span>
      {children}
    </div>
  );
}

function Stepper({ value, set }: { value: number; set: (v: number) => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", overflow: "hidden", height: 28 }}>
      <button onClick={() => set(Math.max(0, value - 1))} style={{ width: 26, height: "100%", border: "none", background: "var(--surface-raised)", cursor: "pointer", color: "var(--text-primary)", fontSize: 14 }}>−</button>
      <span style={{ width: 30, textAlign: "center", font: "13px var(--font-mono)" }}>{value}</span>
      <button onClick={() => set(Math.min(6, value + 1))} style={{ width: 26, height: "100%", border: "none", borderLeft: "1px solid var(--border-hairline)", background: "var(--surface-raised)", cursor: "pointer", color: "var(--text-primary)", fontSize: 14 }}>+</button>
    </div>
  );
}

function Segmented({ options, value, set }: { options: string[]; value: string; set: (v: string) => void }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", overflow: "hidden", height: 26 }}>
      {options.map((o, i) => {
        const on = value === o;
        return (
          <button
            key={o}
            onClick={() => set(o)}
            style={{ padding: "0 9px", height: "100%", border: "none", borderLeft: i ? "1px solid var(--border-hairline)" : "none", cursor: "pointer", background: on ? "var(--accent-tint)" : "var(--surface-raised)", color: on ? "var(--accent)" : "var(--text-muted)", font: (on ? "600" : "500") + " 11.5px/1 var(--font-mono)", textTransform: "capitalize" }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function regionLabel(type: Region["type"]): string {
  const map: Record<Region["type"], string> = {
    math: "Math region", text: "Text region", table: "Table", plot: "Plot",
    image: "Image", control: "Control", area: "Area", include: "Include", solve: "Solve block",
  };
  return map[type] ?? "Region";
}
