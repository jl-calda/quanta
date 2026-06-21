import type { ReactNode } from "react";
import { Button } from "@/components/ds";
import { AdminIcons } from "@/components/admin/icons";
import { SectionHeader, ColHead } from "@/components/admin/parts";
import {
  CAPABILITY_GROUPS,
  WORKSPACE_ROLES,
  workspaceRoleLabel,
  type CapabilityState,
} from "@/lib/workspace/capabilities";

/**
 * Roles & permissions matrix (Func §4.11) — a read-only view over the
 * `lib/workspace/capabilities` map. Full / partial / none cells, ported 1:1 from
 * the Claude Design mockup.
 */

const RCOLS = "1fr repeat(6, 84px)";

function Cell({ state }: { state: CapabilityState }): ReactNode {
  if (state === "full") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 5,
          background: "var(--accent)",
          color: "#fff",
        }}
      >
        {AdminIcons.check(15)}
      </span>
    );
  }
  if (state === "partial") {
    return (
      <span
        title="Partial — limited to assigned projects"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 5,
          background: "var(--status-warning-bg)",
          color: "var(--status-warning)",
          border: "1px solid color-mix(in srgb, var(--status-warning) 30%, transparent)",
        }}
      >
        {AdminIcons.partial(15)}
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        width: 22,
        height: 22,
        borderRadius: 5,
        border: "1px solid var(--border-hairline)",
      }}
    />
  );
}

function LegendItem({ state, label }: { state: CapabilityState; label: string }): ReactNode {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        font: "11.5px/1 var(--font-sans)",
        color: "var(--text-muted)",
      }}
    >
      <Cell state={state} />
      {label}
    </span>
  );
}

export function RolesSection(): ReactNode {
  return (
    <div>
      <SectionHeader
        title="Roles & permissions"
        subtitle="What each role can do across the workspace."
        action={
          <Button variant="secondary" iconLeft={AdminIcons.plus(16)} disabled>
            Add custom role
          </Button>
        }
      />

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 18,
          padding: "7px 14px",
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-sm)",
          background: "var(--surface-raised)",
          marginBottom: 16,
        }}
      >
        <LegendItem state="full" label="Allowed" />
        <LegendItem state="partial" label="Assigned projects only" />
        <LegendItem state="none" label="Not allowed" />
      </div>

      <div
        style={{
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          background: "var(--surface-raised)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: RCOLS,
            alignItems: "end",
            padding: "12px 18px",
            borderBottom: "1px solid var(--border-strong)",
            background: "var(--surface-chrome)",
          }}
        >
          <ColHead>Capability</ColHead>
          {WORKSPACE_ROLES.map((r) => (
            <span
              key={r}
              style={{
                textAlign: "center",
                font: "600 12px/1.2 var(--font-sans)",
                color: "var(--text-primary)",
              }}
            >
              {workspaceRoleLabel(r)}
            </span>
          ))}
        </div>

        {CAPABILITY_GROUPS.map((g) => (
          <div key={g.group}>
            <div
              style={{
                padding: "8px 18px",
                background: "color-mix(in srgb, var(--surface-chrome) 50%, var(--surface-raised))",
                borderBottom: "1px solid var(--border-hairline)",
                font: "600 10.5px/1 var(--font-sans)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {g.group}
            </div>
            {g.items.map((cap) => (
              <div
                key={cap.id}
                className="row-hover"
                style={{
                  display: "grid",
                  gridTemplateColumns: RCOLS,
                  alignItems: "center",
                  padding: "var(--d-row-y, 12px) var(--d-row-x, 18px)",
                  borderBottom: "1px solid var(--border-hairline)",
                }}
              >
                <span style={{ font: "13px/1.3 var(--font-sans)", color: "var(--text-primary)" }}>
                  {cap.label}
                </span>
                {WORKSPACE_ROLES.map((r) => (
                  <span key={r} style={{ display: "flex", justifyContent: "center" }}>
                    <Cell state={cap.states[r]} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
