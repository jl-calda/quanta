"use client";

import { Section } from "@/components/settings/controls";
import type { SectionIcon } from "@/components/settings/icons";

/**
 * Placeholder for sections that aren't part of this milestone (Account,
 * Templates & defaults, Sharing, Integrations, Workspace, Billing) — matches the
 * design export (settings-app.jsx:181–187).
 */
export function PlaceholderSection({
  label,
  icon,
}: {
  label: string;
  icon: SectionIcon;
}) {
  return (
    <Section title={label} desc="This section is part of the full settings surface.">
      <div
        style={{
          marginTop: 24,
          padding: "48px 24px",
          border: "1px dashed var(--border-strong)",
          borderRadius: 8,
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        <div
          style={{ display: "inline-flex", color: "var(--text-muted)", marginBottom: 12 }}
        >
          {icon(26)}
        </div>
        <div style={{ font: "13.5px/1.5 var(--font-sans)" }}>
          {label} settings live here.
        </div>
        <div style={{ font: "12.5px/1.5 var(--font-sans)", marginTop: 4 }}>
          Open the Calculation or Units &amp; formatting sections to see fully-built forms.
        </div>
      </div>
    </Section>
  );
}
