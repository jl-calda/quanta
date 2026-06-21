import type { ReactNode } from "react";
import type { MemberStatus } from "@/lib/supabase/types";

/**
 * Small shared presentational parts for the admin sections (ported from
 * `admin-app.jsx`). Pure — no hooks — so they render in any context.
 */

/** Page header: title + subtitle, with an optional right-aligned action. */
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}): ReactNode {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 20,
        marginBottom: 18,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            font: "600 22px/1.2 var(--font-sans)",
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h1>
        <p style={{ margin: "4px 0 0", font: "13px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      </div>
      {action}
    </div>
  );
}

/** Uppercase column header label for the admin tables. */
export function ColHead({ children }: { children: ReactNode }): ReactNode {
  return (
    <span
      style={{
        font: "600 11px/1 var(--font-sans)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </span>
  );
}

const STATUS_META: Record<MemberStatus, { color: string; label: string }> = {
  active: { color: "var(--status-pass)", label: "Active" },
  invited: { color: "var(--status-warning)", label: "Invited" },
  suspended: { color: "var(--status-error)", label: "Suspended" },
};

/** Dot + label status indicator for a member row. */
export function StatusPill({ status }: { status: MemberStatus }): ReactNode {
  const m = STATUS_META[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        font: "11.5px/1 var(--font-sans)",
        color: m.color,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }} />
      {m.label}
    </span>
  );
}
