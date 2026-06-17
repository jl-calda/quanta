import type { ReactNode } from "react";
import type { AdminIcon } from "@/components/admin/icons";

/**
 * Placeholder for admin sections that aren't built out yet (ported from
 * `admin-app.jsx`). A titled header + a dashed empty box pointing at the live
 * sections.
 */
export function PlaceholderSection({
  label,
  icon,
}: {
  label: string;
  icon: AdminIcon;
}): ReactNode {
  return (
    <div>
      <h1
        style={{
          margin: "0 0 4px",
          font: "600 22px/1.2 var(--font-sans)",
          letterSpacing: "-0.01em",
          color: "var(--text-primary)",
        }}
      >
        {label}
      </h1>
      <p style={{ margin: 0, font: "13px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
        Workspace administration.
      </p>
      <div
        style={{
          marginTop: 24,
          padding: "48px 24px",
          border: "1px dashed var(--border-strong)",
          borderRadius: "var(--radius-md)",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ display: "inline-flex", color: "var(--text-muted)", marginBottom: 12 }}>
          {icon(26)}
        </div>
        <div style={{ font: "13.5px/1.5 var(--font-sans)" }}>{label} settings live here.</div>
        <div style={{ font: "12.5px/1.5 var(--font-sans)", marginTop: 4 }}>
          Open Members, Roles &amp; permissions, or Audit log to see fully-built admin views.
        </div>
      </div>
    </div>
  );
}
