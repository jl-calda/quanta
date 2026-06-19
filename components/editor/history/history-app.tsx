"use client";

import "katex/dist/katex.min.css";
import "./history.css";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ds";
import { nameWorksheetVersion, restoreWorksheetVersion } from "@/server/actions/worksheet";
import { diffContents, formatSummary, summarizeDiff } from "@/lib/worksheet/diff";
import { CURRENT_ID, type TimelineEntry } from "./types";
import { HistoryTimeline, type CompareSel } from "./history-timeline";
import { HistoryPageView } from "./history-page-view";
import { SyncPanes } from "./sync-panes";
import { NameDialog } from "./dialogs";
import { useConfirm } from "@/components/shared/confirm-provider";
import { BackIcon, CompareIcon, RestoreIcon, TagIcon } from "./icons";

/**
 * Version history (Func §4.9): a timeline of versions on the left, and either a
 * single read-only snapshot diffed against the previous version, or a synced
 * side-by-side comparison. Restore writes a version back (snapshotting the
 * current draft first); Name updates a version's label.
 */
export function HistoryApp({
  worksheetId,
  worksheetTitle,
  canEdit,
  entries,
}: {
  worksheetId: string;
  worksheetTitle: string;
  canEdit: boolean;
  entries: TimelineEntry[];
}) {
  const router = useRouter();
  const canCompare = entries.length >= 2;

  const [selected, setSelected] = useState(entries[0]?.id ?? CURRENT_ID);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSel, setCompareSel] = useState<CompareSel>({
    a: entries[0]?.id ?? CURRENT_ID,
    b: entries[1]?.id ?? entries[0]?.id ?? CURRENT_ID,
  });
  const [nameOpen, setNameOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const confirm = useConfirm();

  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const indexOf = (id: string) => entries.findIndex((e) => e.id === id);
  const olderOf = (id: string) => {
    const i = indexOf(id);
    return i >= 0 && i < entries.length - 1 ? entries[i + 1] : null;
  };

  // Per-entry change summary vs. the next-older entry (shown in the timeline).
  const summaries = useMemo(() => {
    const m = new Map<string, string>();
    entries.forEach((entry, i) => {
      const older = i < entries.length - 1 ? entries[i + 1] : null;
      m.set(entry.id, formatSummary(summarizeDiff(diffContents(older?.content ?? null, entry.content))));
    });
    return m;
  }, [entries]);

  const fallback = entries[0];
  const selVer = byId.get(selected) ?? fallback;
  const older = olderOf(selVer.id);
  const newVer = byId.get(compareSel.a) ?? fallback;
  const oldVer = byId.get(compareSel.b) ?? fallback;

  const onItemClick = (id: string) => {
    if (compareMode) setCompareSel((cs) => (cs.a === id ? cs : { a: id, b: cs.a }));
    else setSelected(id);
  };
  const onPickCompare = (id: string) =>
    setCompareSel((cs) => (cs.a === id ? { a: cs.b, b: id } : { a: id, b: cs.a }));

  const nameTarget = compareMode ? newVer : selVer;
  const restoreTarget = compareMode ? oldVer : selVer;

  const doRestore = async (entry: TimelineEntry) => {
    if (entry.isCurrent) return;
    const ok = await confirm({
      title: "Restore this version?",
      confirmLabel: "Restore version",
      body: `This makes ${entry.label || entry.rel} · ${entry.timeLabel} the current worksheet. Your present draft is kept in history, so nothing is lost.`,
    });
    if (!ok) return;
    setActionError(null);
    startTransition(async () => {
      const res = await restoreWorksheetVersion({ id: worksheetId, versionId: entry.id });
      if (res.ok) router.push(`/w/${worksheetId}`);
      else setActionError(res.error);
    });
  };

  const doName = (label: string) => {
    if (nameTarget.isCurrent) return;
    setActionError(null);
    startTransition(async () => {
      const res = await nameWorksheetVersion({ versionId: nameTarget.id, label });
      if (res.ok) {
        setNameOpen(false);
        router.refresh();
      } else {
        setActionError(res.error);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* app bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          height: 52,
          flex: "0 0 52px",
          padding: "0 16px",
          background: "var(--surface-chrome)",
          borderBottom: "1px solid var(--border-hairline)",
        }}
      >
        <Link
          href={`/w/${worksheetId}`}
          className="q-link"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", font: "13px/1 var(--font-sans)" }}
        >
          {BackIcon(17)} Back to worksheet
        </Link>
        <span style={{ width: 1, height: 22, background: "var(--border-hairline)" }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ font: "600 13.5px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>Version history</div>
          <div
            style={{
              font: "11.5px/1.2 var(--font-sans)",
              color: "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 320,
            }}
          >
            {worksheetTitle}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <Legend />
          <button
            onClick={() => canCompare && setCompareMode((c) => !c)}
            disabled={!canCompare}
            title={canCompare ? undefined : "Save another version to compare"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 34,
              padding: "0 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid " + (compareMode ? "var(--accent)" : "var(--border-strong)"),
              background: compareMode ? "var(--accent-tint)" : "var(--surface-raised)",
              color: compareMode ? "var(--accent)" : "var(--text-primary)",
              font: "500 13px/1 var(--font-sans)",
              cursor: canCompare ? "pointer" : "not-allowed",
              opacity: canCompare ? 1 : 0.55,
            }}
          >
            {CompareIcon(16)} Compare
          </button>
          <span style={{ width: 1, height: 22, background: "var(--border-hairline)" }} />
          <Button
            variant="secondary"
            iconLeft={TagIcon(15)}
            disabled={!canEdit || nameTarget.isCurrent}
            onClick={() => {
              setActionError(null);
              setNameOpen(true);
            }}
          >
            Name this version
          </Button>
          <Button
            variant="primary"
            iconLeft={RestoreIcon(15)}
            disabled={!canEdit || restoreTarget.isCurrent}
            onClick={() => void doRestore(restoreTarget)}
          >
            Restore this version
          </Button>
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <HistoryTimeline
          entries={entries}
          selected={selected}
          compareMode={compareMode}
          compareSel={compareSel}
          summaries={summaries}
          onItemClick={onItemClick}
          onPickCompare={onPickCompare}
        />

        {!compareMode ? (
          <div className="scroll-y vh-field" style={{ flex: 1, minWidth: 0, padding: "26px 0 80px" }}>
            <div
              style={{
                width: 720,
                maxWidth: "94%",
                margin: "0 auto 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ font: "12.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
                Showing <strong style={{ color: "var(--text-primary)" }}>{selVer.label || selVer.rel}</strong>
                {older && <> · changes vs. {older.label || older.rel}</>}
              </span>
              <span style={{ font: "11.5px/1 var(--font-mono)", color: "var(--text-muted)" }}>{selVer.timeLabel}</span>
            </div>
            <HistoryPageView
              content={selVer.content}
              refContent={older ? older.content : null}
              title={worksheetTitle}
              showRemoved
            />
          </div>
        ) : (
          <SyncPanes
            left={<HistoryPageView content={oldVer.content} refContent={null} title={worksheetTitle} narrow />}
            right={
              <HistoryPageView content={newVer.content} refContent={oldVer.content} title={worksheetTitle} narrow showRemoved />
            }
          />
        )}
      </div>

      <NameDialog
        open={nameOpen}
        initialLabel={nameTarget.label ?? ""}
        busy={pending}
        error={actionError}
        onClose={() => setNameOpen(false)}
        onSubmit={doName}
      />
    </div>
  );
}

function Legend() {
  const item = (color: string, label: string) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "11.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
        padding: "6px 12px",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-raised)",
      }}
    >
      {item("var(--status-pass)", "Added")}
      {item("var(--status-warning)", "Changed")}
      {item("var(--status-error)", "Removed")}
    </div>
  );
}
