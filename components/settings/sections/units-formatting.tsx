"use client";

import { Select, Switch } from "@/components/ds";
import {
  Group,
  MonoField,
  Radio,
  ReadOnlyNote,
  Row,
  Section,
  Stepper,
} from "@/components/settings/controls";
import { PreviewChip } from "@/components/settings/preview-chip";
import type { FormatSettings } from "@/lib/settings/types";
import type { WorkspaceSectionProps } from "./calculation";

function Sel({ width = 200, children }: { width?: number; children: React.ReactNode }) {
  return <div style={{ width }}>{children}</div>;
}

export function UnitsSection({ settings: s, canEdit, patch, patchFormat }: WorkspaceSectionProps) {
  const disabled = !canEdit;
  const f = s.format;
  return (
    <Section
      title="Units & formatting"
      desc="Default unit system and how results are displayed. The live preview shows a sample result under your current settings."
    >
      {disabled && (
        <ReadOnlyNote>
          Only owners and admins can change workspace defaults.
        </ReadOnlyNote>
      )}

      <div style={{ marginTop: 22 }}>
        <PreviewChip unitSystem={s.unitSystem} format={f} />
      </div>

      <Group title="Unit system">
        <Row
          label="Default unit system"
          help={
            <>
              New worksheets start in this system.{" "}
              <button type="button" className="q-link">
                Manage custom systems
              </button>
            </>
          }
          control={
            <Radio
              disabled={disabled}
              options={[
                { value: "si", label: "SI" },
                { value: "uscs", label: "USCS" },
                { value: "cgs", label: "CGS" },
                { value: "custom", label: "Custom" },
              ]}
              value={s.unitSystem}
              onChange={(v) => patch({ unitSystem: v }, true)}
            />
          }
        />
      </Group>

      <Group title="Result format">
        <Row
          label="Decimal places"
          help="Digits shown after the decimal point."
          control={
            <Stepper
              value={f.decimals}
              min={0}
              max={8}
              disabled={disabled}
              onChange={(v) => patchFormat({ decimals: v }, true)}
            />
          }
        />
        <Row
          label="Significant figures"
          help="Cap on total significant digits (Auto follows decimals)."
          control={
            <Sel width={130}>
              <Select
                value={f.sigFigs}
                disabled={disabled}
                onChange={(e) =>
                  patchFormat({ sigFigs: e.currentTarget.value as FormatSettings["sigFigs"] }, true)
                }
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "3", label: "3" },
                  { value: "4", label: "4" },
                  { value: "5", label: "5" },
                  { value: "6", label: "6" },
                ]}
              />
            </Sel>
          }
        />
        <Row
          label="Notation"
          help="How magnitudes are written."
          control={
            <Radio
              disabled={disabled}
              options={[
                { value: "auto", label: "Auto" },
                { value: "sci", label: "Scientific" },
                { value: "eng", label: "Engineering" },
              ]}
              value={f.notation}
              onChange={(v) => patchFormat({ notation: v }, true)}
            />
          }
        />
        <Row
          label="Radix"
          help="Number base for integer results."
          control={
            <Radio
              disabled={disabled}
              options={[
                { value: "dec", label: "Dec" },
                { value: "bin", label: "Bin" },
                { value: "oct", label: "Oct" },
                { value: "hex", label: "Hex" },
              ]}
              value={f.radix}
              onChange={(v) => patchFormat({ radix: v }, true)}
            />
          }
        />
      </Group>

      <Group title="Thresholds">
        <Row
          label="Use exponential above"
          help="Results larger than this switch to scientific notation."
          control={
            <MonoField
              ariaLabel="Use exponential above"
              value={f.expHigh}
              width={120}
              disabled={disabled}
              onChange={(v) => patchFormat({ expHigh: v }, false)}
            />
          }
        />
        <Row
          label="Use exponential below"
          help="Small magnitudes switch to scientific notation."
          control={
            <MonoField
              ariaLabel="Use exponential below"
              value={f.expLow}
              width={120}
              disabled={disabled}
              onChange={(v) => patchFormat({ expLow: v }, false)}
            />
          }
        />
        <Row
          label="Show complex results as"
          help="Display form for complex numbers."
          control={
            <Sel width={150}>
              <Select
                value={f.complex}
                disabled={disabled}
                onChange={(e) =>
                  patchFormat({ complex: e.currentTarget.value as FormatSettings["complex"] }, true)
                }
                options={[
                  { value: "rect", label: "a + b i" },
                  { value: "polar", label: "Polar (r∠θ)" },
                ]}
              />
            </Sel>
          }
        />
        <Row
          label="Round near-zero to zero"
          help="Snap values within tolerance of zero to exactly 0."
          control={
            <Switch
              checked={f.zeroSnap}
              disabled={disabled}
              onChange={(e) => patchFormat({ zeroSnap: e.target.checked }, true)}
            />
          }
        />
      </Group>
    </Section>
  );
}
