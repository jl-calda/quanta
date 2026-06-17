"use client";

import { IconButton } from "@/components/ds";
import { relativeTime } from "@/components/dashboard/format";
import type { ActivityItem, ActivityKind, ActivityTone } from "@/lib/worksheet/activity";
import { Avatar } from "./avatar";
import { CommentIcon, EditIcon, ShareEventIcon, PanelIcon, ChevronRightIcon } from "./icons";

/**
 * Recent-activity feed (Func §3.8). Collapses to a 36px rail and expands to a
 * 312px panel, matching `shared-app.jsx`. Each row pairs the actor's avatar with
 * a small tone-coded glyph and the activity line; data is the real comment /
 * version / share feed from `getSharedActivity`.
 */

const TONE_COLOR: Record<ActivityTone, string> = {
  accent: "var(--accent)",
  pass: "var(--status-pass)",
  warning: "var(--status-warning)",
  muted: "var(--text-muted)",
};

function KindGlyph({ kind, size }: { kind: ActivityKind; size: number }) {
  if (kind === "comment") return <CommentIcon size={size} />;
  if (kind === "version") return <EditIcon size={size} />;
  return <ShareEventIcon size={size} />;
}

export function ActivityFeed({
  items,
  open,
  setOpen,
}: {
  items: ActivityItem[];
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  if (!open) {
    return (
      <div
        style={{
          width: 36,
          flex: "0 0 36px",
          borderLeft: "1px solid var(--border-hairline)",
          background: "var(--surface-chrome)",
          display: "flex",
          justifyContent: "center",
          paddingTop: 12,
        }}
      >
        <IconButton label="Show activity" onClick={() => setOpen(true)}>
          <PanelIcon size={18} />
        </IconButton>
      </div>
    );
  }

  return (
    <aside
      style={{
        width: 312,
        flex: "0 0 312px",
        borderLeft: "1px solid var(--border-hairline)",
        background: "var(--surface-chrome)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "14px 16px",
          borderBottom: "1px solid var(--border-hairline)",
        }}
      >
        <span style={{ font: "600 13px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>
          Recent activity
        </span>
        <IconButton label="Hide activity" size="sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(false)}>
          <ChevronRightIcon size={16} />
        </IconButton>
      </div>

      <div className="q-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 8px" }}>
        {items.length === 0 ? (
          <p style={{ padding: "16px 8px", font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
            No recent activity on your shared worksheets yet.
          </p>
        ) : (
          items.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                gap: 11,
                padding: "11px 8px",
                borderBottom: i < items.length - 1 ? "1px solid var(--border-hairline)" : "none",
              }}
            >
              <span style={{ position: "relative", flex: "0 0 auto" }}>
                <Avatar name={a.actorName} colorKey={a.actorId ?? a.actorName} size={28} />
                <span
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border-hairline)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: TONE_COLOR[a.tone],
                  }}
                >
                  <KindGlyph kind={a.kind} size={11} />
                </span>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "12.5px/1.45 var(--font-sans)", color: "var(--text-primary)" }}>
                  <span style={{ fontWeight: 600 }}>{a.actorName}</span> {a.text}
                </div>
                {a.detail && (
                  <div style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>
                    {a.detail}
                  </div>
                )}
                <div style={{ font: "11px/1 var(--font-mono)", color: "var(--text-muted)", marginTop: 5 }}>
                  {relativeTime(a.time)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
