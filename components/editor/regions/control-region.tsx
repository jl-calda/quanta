"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ControlOption, ControlRegion } from "@/lib/worksheet/content";
import type { RegionPatch } from "../state/editor-reducer";
import { splitResultUnit } from "./math-display";
import type { RegionRenderProps } from "./types";

/**
 * Input control region (Mockup §6.7) — a worksheet-embedded control that writes
 * its bound variable into engine scope as a definition (`bind := value`), so
 * moving it drives live recompute. Ported faithfully from `input-controls.html`:
 * each kind renders as a precise document card (eyebrow tag · mono bind badge ·
 * widget · dashed-rule `name := value unit` binding), not a web form. The binding
 * line prefers the engine result (the value actually in scope, with unit/error),
 * falling back to the local value in provider-free contexts (history snapshots).
 *
 * Pure of any editor context — it works only from props, so the same component
 * renders live (region-item) and read-only (history-region, `canEdit:false`).
 */

const KIND_LABEL: Record<ControlRegion["kind"], string> = {
  slider: "Slider",
  dropdown: "Dropdown",
  combo: "Combo box",
  radio: "Radio group",
  checkbox: "Checkbox",
  button: "Button",
  textbox: "Textbox",
  listbox: "Listbox",
};

/* ------------------------------------------------------------------ *
 * Thin-stroke line icons (Lucide family), matching the mockup's inline SVGs.
 * ------------------------------------------------------------------ */
const svgIcon = (path: ReactNode, s = 15) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {path}
  </svg>
);
const ICON = {
  chevron: (s?: number) => svgIcon(<path d="m6 9 6 6 6-6" />, s),
  check: (s?: number) => svgIcon(<path d="M5 12l4.5 4.5L19 7" />, s),
  swap: (s?: number) => svgIcon(<path d="M7 4 4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7" />, s),
  bolt: (s?: number) => svgIcon(<path d="M13 3 4 14h6l-1 7 9-11h-6z" />, s),
  link: (s?: number) =>
    svgIcon(
      <>
        <path d="M9.5 14.5 14.5 9.5" />
        <path d="M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1" />
        <path d="M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
      </>,
      s,
    ),
};

/** Split clipboard/textarea text into option rows (paste-multiple into a combo). */
export function parseOptionList(text: string): ControlOption[] {
  return text
    .split(/[\n,\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((value) => ({ value }));
}

/** A bind name renders italic when it's a single letter (e.g. L), else upright. */
function bindIsSymbol(bind: string): boolean {
  return /^[A-Za-z]$/.test(bind);
}

function optLabel(o: ControlOption): string {
  return o.label ?? o.value;
}

/* ------------------------------------------------------------------ *
 * View
 * ------------------------------------------------------------------ */
export function ControlRegionView({ region, result, canEdit, dispatch }: RegionRenderProps<ControlRegion>) {
  const set = (patch: RegionPatch) => {
    if (!canEdit) return;
    dispatch({ type: "SET_REGION_PROP", id: region.id, patch });
  };

  const bind = region.bind?.trim() ?? "";
  const live = bind.length > 0 && result?.status === "current" && !!result.formatted;

  return (
    <div
      className="region-control"
      style={{
        position: "relative",
        background: live ? "var(--surface-selected)" : "var(--surface-raised)",
        border: `1px solid ${live ? "var(--accent)" : "var(--border-hairline)"}`,
        borderRadius: "var(--radius-sm)",
        padding: 12,
        minWidth: 220,
        maxWidth: 320,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <span
          style={{
            font: "600 9.5px/1 var(--font-sans)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {KIND_LABEL[region.kind]}
        </span>
        <span
          style={{
            font: "11px/1 var(--font-mono)",
            color: "var(--text-muted)",
            background: "var(--surface-chrome)",
            border: "1px solid var(--border-hairline)",
            borderRadius: 3,
            padding: "2px 5px",
          }}
        >
          {bind || "unbound"}
        </span>
        {live && (
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              font: "600 9.5px/1 var(--font-sans)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            {ICON.link(12)} live
          </span>
        )}
      </div>

      <Widget region={region} set={set} canEdit={canEdit} />

      <div style={{ marginTop: 11, paddingTop: 9, borderTop: "1px dashed var(--border-hairline)" }}>
        <Binding region={region} result={result} bind={bind} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The `name := value unit` binding (or error / empty-state hint)
 * ------------------------------------------------------------------ */
function Binding({
  region,
  result,
  bind,
}: {
  region: ControlRegion;
  result?: RegionRenderProps<ControlRegion>["result"];
  bind: string;
}) {
  const hint = (text: string) => (
    <span style={{ font: "11.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>{text}</span>
  );

  // A button is an action trigger; mirror the mockup's prose rather than `:= n`.
  if (region.kind === "button") {
    return hint(region.label ? `Runs ${region.label} when pressed.` : "Triggers a recalculation when pressed.");
  }
  if (!bind) return hint("Bind a variable in the inspector.");

  if (result?.error) {
    return (
      <span style={{ font: "11.5px/1.35 var(--font-sans)", color: "var(--status-error)" }}>
        {result.error.message}
        {result.error.fixHint && <span style={{ color: "var(--text-muted)" }}> {result.error.fixHint}</span>}
      </span>
    );
  }

  // Prefer the engine result (the value actually in scope); fall back to local.
  const fromResult = result?.formatted ? splitResultUnit(result.formatted, result.value) : null;
  const { magnitude, unit } = fromResult ?? localDisplay(region);

  const nameNode = bindIsSymbol(bind) ? (
    <span style={{ fontStyle: "italic" }}>{bind}</span>
  ) : (
    <span>{bind}</span>
  );

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0.3em",
        fontFamily: "var(--font-math)",
        fontSize: 17,
        color: "var(--text-math)",
      }}
    >
      {nameNode}
      <span style={{ padding: "0 0.06em" }}>:=</span>
      <span style={{ color: "var(--accent)", fontWeight: 600 }}>{magnitude}</span>
      {unit && <span style={{ fontSize: "0.82em", color: "var(--text-muted)" }}>{unit}</span>}
    </div>
  );
}

/** Local (provider-free) value rendering for the binding fallback. */
function localDisplay(region: ControlRegion): { magnitude: string; unit: string | null } {
  const v = region.value;
  if (v === undefined || v === "") return { magnitude: "—", unit: null };
  const t = region.valueType ?? "number";
  if (t === "boolean") return { magnitude: v ? "true" : "false", unit: null };
  if (t === "text") return { magnitude: JSON.stringify(String(v)), unit: null };
  if (t === "expr") return { magnitude: String(v), unit: null };
  return { magnitude: String(v), unit: region.unit ?? null };
}

/* ------------------------------------------------------------------ *
 * Widgets — bespoke, matching the mockup. Interactions stopPropagation so a
 * widget click doesn't also fire the card's region-select; clicks on the card
 * body still select (for the inspector). Disabled when `!canEdit`.
 * ------------------------------------------------------------------ */
type WidgetProps = { region: ControlRegion; set: (patch: RegionPatch) => void; canEdit: boolean };

function Widget(props: WidgetProps) {
  switch (props.region.kind) {
    case "slider":
      return <SliderWidget {...props} />;
    case "dropdown":
      return <DropdownWidget {...props} editable={false} />;
    case "combo":
      return <DropdownWidget {...props} editable />;
    case "radio":
      return <RadioWidget {...props} />;
    case "checkbox":
      return <CheckboxWidget {...props} />;
    case "button":
      return <ButtonWidget {...props} />;
    case "textbox":
      return <TextboxWidget {...props} />;
    case "listbox":
      return <ListboxWidget {...props} />;
    default:
      return null;
  }
}

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

function SliderWidget({ region, set, canEdit }: WidgetProps) {
  const min = region.min ?? 0;
  const max = region.max ?? 10;
  const step = region.step ?? 1;
  const invert = !!region.invert;
  const bound = typeof region.value === "number" ? region.value : min;
  // The input's position is the (possibly inverted) bound value.
  const toValue = (raw: number) => (invert ? min + max - raw : raw);

  const [raw, setRaw] = useState(toValue(bound));
  useEffect(() => setRaw(invert ? min + max - bound : bound), [bound, min, max, invert]); // resync on external change

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = +e.target.value;
    setRaw(next);
    set({ value: toValue(next) });
  };
  const muted: CSSProperties = { font: "10.5px/1 var(--font-mono)", color: "var(--text-muted)" };

  return (
    <div onClick={stop}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ ...muted, width: 30 }}>{min}{region.unit ? ` ${region.unit}` : ""}</span>
        <input
          type="range"
          className="q-slider"
          min={min}
          max={max}
          step={step}
          value={raw}
          disabled={!canEdit}
          onChange={onChange}
          style={{ flex: 1 }}
        />
        <span style={{ ...muted, width: 30, textAlign: "right" }}>{max}{region.unit ? ` ${region.unit}` : ""}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, font: "10.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
        <span>
          step <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{step}</span>
        </span>
        {invert && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            {ICON.swap(12)} invert
          </span>
        )}
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "baseline",
            gap: "0.16em",
            padding: "2px 7px",
            borderRadius: 3,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-strong)",
            font: "600 12px/1 var(--font-mono)",
            color: "var(--text-primary)",
          }}
        >
          {toValue(raw)}
          {region.unit && <span style={{ fontSize: "0.82em", color: "var(--text-muted)" }}>{region.unit}</span>}
        </span>
      </div>
    </div>
  );
}

function DropdownWidget({ region, set, canEdit, editable }: WidgetProps & { editable: boolean }) {
  const options = region.options ?? [];
  const [open, setOpen] = useState(false);
  const current = region.value === undefined ? "" : String(region.value);

  const pick = (value: string) => {
    set({ value });
    setOpen(false);
  };
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!/[\n,\t]/.test(text)) return; // single value → normal paste
    e.preventDefault();
    const pasted = parseOptionList(text);
    if (pasted.length === 0) return;
    const merged = [...options];
    for (const o of pasted) if (!merged.some((m) => m.value === o.value)) merged.push(o);
    set({ options: merged, value: pasted[0].value });
  };

  return (
    <div style={{ position: "relative" }} onClick={stop}>
      {editable ? (
        <input
          value={current}
          disabled={!canEdit}
          onChange={(e) => set({ value: e.target.value })}
          onPaste={onPaste}
          onFocus={() => setOpen(true)}
          placeholder="Type or paste values"
          style={comboInputStyle(open)}
        />
      ) : (
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            height: 30,
            padding: "0 10px",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${open ? "var(--accent)" : "var(--border-strong)"}`,
            background: "var(--surface-raised)",
            cursor: canEdit ? "pointer" : "default",
          }}
        >
          <span style={{ font: "13px/1 var(--font-mono)", color: current ? "var(--text-primary)" : "var(--text-muted)" }}>
            {current || "Select…"}
          </span>
          <span
            style={{
              marginLeft: "auto",
              color: "var(--text-muted)",
              display: "inline-flex",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform var(--dur-fast)",
            }}
          >
            {ICON.chevron(15)}
          </span>
        </button>
      )}
      {open && canEdit && options.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-popover)",
            padding: 4,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {options.map((o) => {
            const on = o.value === current;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  height: 28,
                  padding: "0 8px",
                  border: "none",
                  borderRadius: 4,
                  background: on ? "var(--accent-tint)" : "transparent",
                  cursor: "pointer",
                  font: "12.5px/1 var(--font-mono)",
                  color: on ? "var(--accent)" : "var(--text-primary)",
                  textAlign: "left",
                }}
              >
                {optLabel(o)}
                {on && <span style={{ marginLeft: "auto", display: "inline-flex", color: "var(--accent)" }}>{ICON.check(14)}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function comboInputStyle(open: boolean): CSSProperties {
  return {
    width: "100%",
    height: 30,
    padding: "0 10px",
    borderRadius: "var(--radius-sm)",
    border: `1px solid ${open ? "var(--accent)" : "var(--border-strong)"}`,
    background: "var(--surface-raised)",
    font: "13px/1 var(--font-mono)",
    color: "var(--text-primary)",
    outline: "none",
  };
}

function RadioWidget({ region, set, canEdit }: WidgetProps) {
  const options = region.options ?? [];
  const current = region.value === undefined ? "" : String(region.value);
  if (options.length === 0) return <EmptyOptions />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }} onClick={stop}>
      {options.map((o, i) => {
        const on = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            disabled={!canEdit}
            onClick={() => set({ value: o.value })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "6px 8px",
              border: `1px solid ${on ? "var(--accent)" : "var(--border-hairline)"}`,
              borderRadius: 4,
              background: on ? "var(--accent-tint)" : "var(--surface-raised)",
              cursor: canEdit ? "pointer" : "default",
              textAlign: "left",
            }}
          >
            <span
              style={{
                flex: "0 0 auto",
                width: 15,
                height: 15,
                borderRadius: "50%",
                border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {on && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />}
            </span>
            <span style={{ font: "12.5px/1 var(--font-sans)", color: on ? "var(--accent)" : "var(--text-primary)", fontWeight: on ? 600 : 400 }}>
              {optLabel(o)}
            </span>
            {i === 0 && (
              <span style={{ marginLeft: "auto", font: "9.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>default</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CheckboxWidget({ region, set, canEdit }: WidgetProps) {
  const on = region.value === true;
  return (
    <label
      style={{ display: "flex", alignItems: "center", gap: 9, cursor: canEdit ? "pointer" : "default" }}
      onClick={(e) => {
        stop(e);
        if (canEdit) set({ value: !on });
      }}
    >
      <span
        style={{
          flex: "0 0 auto",
          width: 17,
          height: 17,
          borderRadius: 4,
          border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
          background: on ? "var(--accent)" : "var(--surface-raised)",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {on && ICON.check(13)}
      </span>
      <span style={{ font: "12.5px/1.4 var(--font-sans)", color: "var(--text-primary)" }}>
        {region.label ?? "Enabled"}
      </span>
    </label>
  );
}

function ButtonWidget({ region, set, canEdit }: WidgetProps) {
  // A monotonic press counter so dependents see a changing value and recompute.
  const press = () => {
    if (!canEdit) return;
    const next = (typeof region.value === "number" ? region.value : 0) + 1;
    set({ value: next });
  };
  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={(e) => {
        stop(e);
        press();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 30,
        padding: "0 13px",
        borderRadius: "var(--radius-sm)",
        border: "none",
        background: "var(--accent)",
        color: "#fff",
        font: "500 12.5px/1 var(--font-sans)",
        cursor: canEdit ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        if (canEdit) e.currentTarget.style.background = "var(--accent-press)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--accent)";
      }}
    >
      {ICON.bolt(15)} {region.label ?? "Run"}
    </button>
  );
}

function TextboxWidget({ region, set, canEdit }: WidgetProps) {
  const current = region.value === undefined ? "" : String(region.value);
  const [focus, setFocus] = useState(false);
  return (
    <input
      value={current}
      disabled={!canEdit}
      onClick={stop}
      onChange={(e) => set({ value: e.target.value })}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      placeholder={region.label ?? "Enter a value"}
      style={{
        width: "100%",
        height: 30,
        padding: "0 10px",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${focus ? "var(--accent)" : "var(--border-strong)"}`,
        background: "var(--surface-raised)",
        font: "13px/1 var(--font-mono)",
        color: "var(--text-primary)",
        outline: "none",
        boxShadow: focus ? "0 0 0 2px color-mix(in srgb, var(--accent) 24%, transparent)" : "none",
      }}
    />
  );
}

function ListboxWidget({ region, set, canEdit }: WidgetProps) {
  const options = region.options ?? [];
  const current = region.value === undefined ? "" : String(region.value);
  if (options.length === 0) return <EmptyOptions />;
  return (
    <div
      onClick={stop}
      style={{
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        background: "var(--surface-raised)",
        maxHeight: 160,
        overflowY: "auto",
      }}
    >
      {options.map((o, i) => {
        const on = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            disabled={!canEdit}
            onClick={() => set({ value: o.value })}
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              height: 27,
              padding: "0 9px",
              border: "none",
              borderTop: i ? "1px solid var(--border-hairline)" : "none",
              background: on ? "var(--accent-tint)" : "transparent",
              cursor: canEdit ? "pointer" : "default",
              font: "12px/1 var(--font-mono)",
              color: on ? "var(--accent)" : "var(--text-primary)",
              textAlign: "left",
            }}
          >
            {optLabel(o)}
            {on && <span style={{ marginLeft: "auto", display: "inline-flex", color: "var(--accent)" }}>{ICON.check(14)}</span>}
          </button>
        );
      })}
    </div>
  );
}

function EmptyOptions() {
  return (
    <span style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
      Add options in the inspector.
    </span>
  );
}
