"use client";

import { useState } from "react";
import type { TemplateUpdateStatus } from "@/lib/worksheet/template";

/**
 * Notify-only "a newer version of the source template is available" banner
 * (Phase-2 update propagation). A worksheet created from a template stamps its
 * `content.origin`; when the template has since published a newer revision, this
 * slim, dismissible strip surfaces the revision jump and the changelog. It never
 * mutates the worksheet — re-applying a template's changes (a merge) is
 * deliberately out of scope (last-write-wins, per CLAUDE.md).
 */
export function TemplateUpdateBanner({ status }: { status: TemplateUpdateStatus }) {
  const [dismissed, setDismissed] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  if (dismissed) return null;

  return (
    <div
      role="status"
      style={{
        flex: "0 0 auto",
        borderBottom: "1px solid var(--border-hairline)",
        background: "var(--accent-tint)",
        color: "var(--text-primary)",
        font: "var(--text-13)/1.5 var(--font-sans)",
        padding: "8px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span>
          A newer version of the source template is available{" "}
          <span style={{ font: "600 var(--text-12) var(--font-mono)", color: "var(--accent)" }}>
            v{status.fromRevision} → v{status.toRevision}
          </span>
          .
        </span>
        {status.changes.length > 0 && (
          <button
            type="button"
            onClick={() => setShowChanges((s) => !s)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "var(--text-link)",
              font: "inherit",
              textDecoration: "underline",
            }}
          >
            {showChanges ? "Hide changes" : "View changes"}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            font: "inherit",
            padding: "0 2px",
          }}
        >
          Dismiss
        </button>
      </div>
      {showChanges && status.changes.length > 0 && (
        <ul style={{ margin: "8px 0 2px", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
          {status.changes.map((c) => (
            <li key={c.revision} style={{ color: "var(--text-muted)" }}>
              <span style={{ font: "600 var(--text-12) var(--font-mono)", color: "var(--accent)" }}>v{c.revision}</span>{" "}
              {c.label ?? "Updated"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
