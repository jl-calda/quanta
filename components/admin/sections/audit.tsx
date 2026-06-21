import type { ReactNode } from "react";
import { Button } from "@/components/ds";
import { AdminIcons } from "@/components/admin/icons";
import { SectionHeader, ColHead } from "@/components/admin/parts";
import type { AuditEntry, AuditTone } from "@/lib/workspace/audit";

/**
 * Audit log (Func §4.11) — the workspace's recent actions from `audit_log`,
 * tone-coded and time-sorted, with a client-side CSV export. Entries are
 * pre-formatted by `lib/workspace/audit`; this only renders.
 */

const ACOLS = "176px 168px 184px 1fr";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Compact "14 Jun, 14:22" timestamp for the log. */
function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toneColor(t: AuditTone): string {
  switch (t) {
    case "accent":
      return "var(--accent)";
    case "pass":
      return "var(--status-pass)";
    case "warning":
      return "var(--status-warning)";
    case "error":
      return "var(--status-error)";
    default:
      return "var(--text-muted)";
  }
}

function exportCsv(entries: AuditEntry[]): void {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["Timestamp", "Actor", "Action", "Target"].map(esc).join(",");
  const lines = entries.map((e) =>
    [new Date(e.time).toISOString(), e.actorName, e.label, e.target].map((v) => esc(v ?? "")).join(","),
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditSection({ entries }: { entries: AuditEntry[] }): ReactNode {
  return (
    <div>
      <SectionHeader
        title="Audit log"
        subtitle="Every workspace action, newest first."
        action={
          <Button
            variant="secondary"
            iconLeft={AdminIcons.external(15)}
            onClick={() => exportCsv(entries)}
            disabled={entries.length === 0}
          >
            Export log
          </Button>
        }
      />
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
            gridTemplateColumns: ACOLS,
            gap: 16,
            padding: "var(--d-row-y) var(--d-row-x)",
            borderBottom: "1px solid var(--border-hairline)",
            background: "var(--surface-chrome)",
          }}
        >
          <ColHead>Timestamp</ColHead>
          <ColHead>Actor</ColHead>
          <ColHead>Action</ColHead>
          <ColHead>Target</ColHead>
        </div>
        {entries.length === 0 ? (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              font: "13px/1.5 var(--font-sans)",
              color: "var(--text-muted)",
            }}
          >
            No activity yet. Member and sharing changes will appear here.
          </div>
        ) : (
          entries.map((e, i) => (
            <div
              key={e.id}
              className="row-hover"
              style={{
                display: "grid",
                gridTemplateColumns: ACOLS,
                gap: 16,
                alignItems: "center",
                padding: "var(--d-row-y) var(--d-row-x)",
                borderBottom: i < entries.length - 1 ? "1px solid var(--border-hairline)" : "none",
              }}
            >
              <span style={{ font: "12px/1 var(--font-mono)", color: "var(--text-muted)" }}>
                {stamp(e.time)}
              </span>
              <span style={{ font: "12.5px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>
                {e.actorName}
              </span>
              <span style={{ font: "12.5px/1 var(--font-sans)", color: toneColor(e.tone), fontWeight: 500 }}>
                {e.label}
              </span>
              <span
                style={{
                  font: "12.5px/1.3 var(--font-sans)",
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {e.target || "—"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
