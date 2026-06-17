"use client";

import { Badge } from "@/components/ds";
import type { TimelineEntry, VersionAuthor } from "./types";

export interface CompareSel {
  /** Newer version id. */
  a: string;
  /** Older version id. */
  b: string;
}

/** The left timeline: a count header + a scrollable list of version items. */
export function HistoryTimeline({
  entries,
  selected,
  compareMode,
  compareSel,
  summaries,
  onItemClick,
  onPickCompare,
}: {
  entries: TimelineEntry[];
  selected: string;
  compareMode: boolean;
  compareSel: CompareSel;
  summaries: Map<string, string>;
  onItemClick: (id: string) => void;
  onPickCompare: (id: string) => void;
}) {
  return (
    <aside
      style={{
        width: 308,
        flex: "0 0 308px",
        borderRight: "1px solid var(--border-hairline)",
        background: "var(--surface-chrome)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border-hairline)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ font: "600 12px/1 var(--font-sans)", letterSpacing: "0.04em", color: "var(--text-primary)" }}>
          {entries.length} {entries.length === 1 ? "version" : "versions"}
        </span>
        {compareMode && (
          <span style={{ font: "11.5px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>· pick two to compare</span>
        )}
      </div>
      <div className="scroll-y" style={{ flex: 1, minHeight: 0, padding: "6px 0" }}>
        {entries.map((entry, i) => (
          <VersionItem
            key={entry.id}
            entry={entry}
            last={i === entries.length - 1}
            active={!compareMode && selected === entry.id}
            compareMode={compareMode}
            compareSel={compareSel}
            summary={summaries.get(entry.id) ?? ""}
            onClick={() => onItemClick(entry.id)}
            onPickCompare={() => onPickCompare(entry.id)}
          />
        ))}
      </div>
    </aside>
  );
}

function VersionItem({
  entry,
  last,
  active,
  compareMode,
  compareSel,
  summary,
  onClick,
  onPickCompare,
}: {
  entry: TimelineEntry;
  last: boolean;
  active: boolean;
  compareMode: boolean;
  compareSel: CompareSel;
  summary: string;
  onClick: () => void;
  onPickCompare: () => void;
}) {
  const inCompare = compareMode && (compareSel.a === entry.id || compareSel.b === entry.id);
  const cmpRole = compareSel.a === entry.id ? "New" : compareSel.b === entry.id ? "Old" : null;

  return (
    <div
      className="ver-item"
      onClick={onClick}
      style={{
        position: "relative",
        display: "flex",
        gap: 12,
        padding: "12px 14px 12px 16px",
        cursor: "pointer",
        background: active || inCompare ? "var(--accent-tint)" : "transparent",
        borderLeft: "2px solid " + (active || inCompare ? "var(--accent)" : "transparent"),
      }}
    >
      <div style={{ position: "relative", flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Avatar author={entry.author} />
        {!last && (
          <span style={{ position: "absolute", top: 30, bottom: -16, width: 1, background: "var(--border-hairline)" }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              font: "12.5px/1.2 var(--font-sans)",
              fontWeight: entry.label ? 600 : 500,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.label || entry.rel}
          </span>
          {entry.isCurrent && <Badge tone="accent">Current</Badge>}
          {compareMode && cmpRole && (
            <span
              style={{
                font: "9.5px/1 var(--font-sans)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
                borderRadius: 3,
                padding: "2px 4px",
              }}
            >
              {cmpRole}
            </span>
          )}
        </div>
        {entry.label && (
          <div style={{ font: "11.5px/1.3 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>{entry.rel}</div>
        )}
        <div style={{ font: "11.5px/1 var(--font-mono)", color: "var(--text-muted)", marginTop: 4 }}>
          {entry.timeLabel} · {entry.author.name}
        </div>
        <div style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)", marginTop: 5 }}>{summary}</div>
        {compareMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPickCompare();
            }}
            style={{
              marginTop: 7,
              font: "11px/1 var(--font-sans)",
              color: "var(--accent)",
              border: "1px solid var(--border-hairline)",
              background: "var(--surface-raised)",
              borderRadius: 4,
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            Set as {compareSel.a === entry.id ? "old" : "new"}
          </button>
        )}
      </div>
    </div>
  );
}

function Avatar({ author }: { author: VersionAuthor }) {
  return (
    <span
      title={author.name}
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: author.color,
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        font: "600 10px/1 var(--font-sans)",
        flex: "0 0 auto",
      }}
    >
      {author.initials}
    </span>
  );
}
