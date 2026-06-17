"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  IconButton,
  Input,
  Select,
  Checkbox,
  Switch,
  Tabs,
  Dialog,
  Toast,
  Tooltip,
  Var,
  Sub,
  Sup,
  Frac,
  Sqrt,
  Op,
  Unit,
  Math,
  MathRegion,
} from "@/components/ds";

/**
 * Foundation showcase — exercises every M3 design-system component in its
 * variants and states. Client island rendered by the public /design page so
 * the interactive components (Dialog, Tabs, Switch, MathRegion…) work live.
 */

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICON = {
  plus: "M12 5v14M5 12h14",
  recalc: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  bold: "M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
  table: "M3 5h18v14H3zM3 10h18M9 5v14",
  plot: "M4 4v16h16M8 14l3-4 3 3 4-6",
};

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card title={title}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>{children}</div>
    </Card>
  );
}

export function Showcase() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [check, setCheck] = useState(true);
  const [auto, setAuto] = useState(true);
  const [tab, setTab] = useState("outline");
  const [showInfo, setShowInfo] = useState(true);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
      {/* Badges */}
      <Group title="Badges">
        {(["neutral", "accent", "pass", "warning", "error"] as const).map((tone) => (
          <Badge key={tone} tone={tone}>
            {tone}
          </Badge>
        ))}
        {(["neutral", "accent", "pass", "warning", "error"] as const).map((tone) => (
          <Badge key={tone} tone={tone} variant="solid">
            {tone}
          </Badge>
        ))}
        <Badge tone="pass" dot>
          PASS
        </Badge>
      </Group>

      {/* Buttons */}
      <Group title="Buttons">
        <Button variant="primary" iconLeft={<Icon d={ICON.recalc} />}>
          Recalculate
        </Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Delete</Button>
        <Button size="sm">Small</Button>
        <Button disabled>Disabled</Button>
      </Group>

      {/* Icon buttons */}
      <Group title="Icon buttons">
        <IconButton label="Insert math">
          <Icon d={ICON.plus} />
        </IconButton>
        <IconButton label="Bold" variant="solid">
          <Icon d={ICON.bold} />
        </IconButton>
        <IconButton label="Insert table" variant="outline">
          <Icon d={ICON.table} />
        </IconButton>
        <IconButton label="Insert plot" active>
          <Icon d={ICON.plot} />
        </IconButton>
        <IconButton label="Share" disabled>
          <Icon d={ICON.share} />
        </IconButton>
      </Group>

      {/* Forms */}
      <Group title="Forms">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
          <Input placeholder="Worksheet name" />
          <Input mono defaultValue="M_Ed := w*L^2 / 8" />
          <Input prefix="L" suffix="mm" defaultValue="160" />
          <Input invalid defaultValue="bad value" />
          <Input disabled defaultValue="Disabled" />
          <Select
            options={[
              { value: "si", label: "SI · mm · kN · MPa" },
              { value: "imp", label: "Imperial · in · kip · ksi" },
            ]}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <Checkbox checked={check} onChange={(e) => setCheck(e.target.checked)} label="Show steps" />
            <Checkbox indeterminate label="Indeterminate" />
            <Checkbox disabled label="Disabled" />
            <Switch checked={auto} onChange={(e) => setAuto(e.target.checked)} label="Auto-recalc" />
          </div>
        </div>
      </Group>

      {/* Tabs */}
      <Group title="Tabs">
        <div style={{ width: "100%" }}>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "outline", label: "Outline" },
              { value: "variables", label: "Variables", badge: 12 },
              { value: "files", label: "Files" },
              { value: "off", label: "Disabled", disabled: true },
            ]}
          />
          <div style={{ marginTop: 12, font: "var(--text-13) var(--font-sans)", color: "var(--text-muted)" }}>
            Active tab: {tab}
          </div>
        </div>
      </Group>

      {/* Overlays */}
      <Group title="Tooltip & dialog">
        <Tooltip label="Recalculate (F9)">
          <Button variant="secondary">Hover me</Button>
        </Tooltip>
        <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Dialog
          open={dialogOpen}
          eyebrow="Share"
          title="Share worksheet"
          onClose={() => setDialogOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Share worksheet</Button>
            </>
          }
        >
          Invite a collaborator by email. They&apos;ll get editor access to this worksheet.
        </Dialog>
      </Group>

      {/* Toasts */}
      <Card title="Toasts">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {showInfo && (
            <Toast tone="info" title="Recalculated" description="All regions are up to date." onDismiss={() => setShowInfo(false)} />
          )}
          <Toast tone="success" title="Worksheet saved" description="Version 12 created." />
          <Toast tone="warning" title="Variable redefined" description="b is defined twice; the later wins." />
          <Toast tone="error" title="Units don’t match" description="Left is kN, right is mm. Check the expression." />
        </div>
      </Card>

      {/* Math primitives */}
      <Card title="Math primitives">
        <Math size={24}>
          <Var>x</Var>
          <Op>+</Op>
          <Sub base={<Var>M</Var>} sub="Ed" />
          <Op>·</Op>
          <Sup base={<Var>r</Var>} sup="2" />
          <Op>=</Op>
          <Frac num={<Var>a</Var>} den="2" />
          <Op>+</Op>
          <Sqrt>
            <Var>b</Var>
          </Sqrt>
          <Op>=</Op>
          <span>82.4</span>
          <Unit>kN</Unit>
        </Math>
      </Card>

      {/* MathRegion — the signature */}
      <Card title="Math region (the signature)" style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
          <MathRegion
            name={<Sub base={<Var>M</Var>} sub="Ed" />}
            formula="M_Ed := w*L^2 / 8"
            result="46.1"
            unit="kN·m"
          >
            <Frac num={<Math size={17}><Var>w</Var><Op>·</Op><Sup base={<Var>L</Var>} sup="2" /></Math>} den="8" />
          </MathRegion>

          <MathRegion
            name={<Sub base={<Var>N</Var>} sub="Rd" />}
            formula="N_Rd := phi*A_s*f_ub"
            result="82.4"
            unit="kN"
            status="pass"
            selected
          >
            <Math size={17}>
              <Var>φ</Var>
              <Op>·</Op>
              <Sub base={<Var>A</Var>} sub="s" />
              <Op>·</Op>
              <Sub base={<Var>f</Var>} sub="ub" />
            </Math>
          </MathRegion>

          <MathRegion
            name={<Sub base={<Var>M</Var>} sub="a" />}
            formula="M_a := F_t + d"
            status="error"
            note="Units do not match: left is kN, right is mm."
          >
            <Math size={17}>
              <Sub base={<Var>F</Var>} sub="t" />
              <Op>+</Op>
              <Var>d</Var>
            </Math>
          </MathRegion>

          <MathRegion name={<Sub base={<Var>F</Var>} sub="t" />} formula="F_t := 12 kN" defaultMode="edit" />
          <div style={{ font: "var(--text-12) var(--font-sans)", color: "var(--text-muted)" }}>
            Click any committed region to edit; press Enter or click away to commit.
          </div>
        </div>
      </Card>
    </div>
  );
}
