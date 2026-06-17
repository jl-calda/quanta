"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ds";
import { SearchIcon } from "@/components/files/icons";
import { duplicateWorksheet } from "@/server/actions/files";
import { revokeCollaborator, createShareLink } from "@/server/actions/share";
import type { ActionResult } from "@/server/result";
import type { SharedWithMeRow, SharedByMeRow } from "@/server/queries/shared";
import type { ActivityItem } from "@/lib/worksheet/activity";
import { ToastHost, useToast } from "@/components/files/toast-host";
import { ShareTable, type ShareRowAction, type ShareTarget } from "./share-table";
import { ShareDialog } from "./share-dialog";
import { ActivityFeed } from "./activity-feed";
import { SharedEmptyState } from "./empty-state";
import { ChevronDownIcon } from "./icons";

/**
 * Shared page shell (Func §3.8 / §4.8): the "shared with me / by me" tabbed
 * tables, the recent-activity feed, and the reusable Share dialog. Reads come
 * from the server; every mutation is a Server Action, surfaced through the toast
 * host and reconciled with `router.refresh()`.
 */

interface SharedPageProps {
  withRows: SharedWithMeRow[];
  byRows: SharedByMeRow[];
  activity: ActivityItem[];
  /** Workspace owner/admin → may manage any sheet's sharing. */
  workspaceIsAdmin: boolean;
}

export function SharedPage(props: SharedPageProps) {
  return (
    <ToastHost>
      <Shared {...props} />
    </ToastHost>
  );
}

function matches(haystack: string[], q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return haystack.some((h) => h.toLowerCase().includes(needle));
}

function Shared({ withRows, byRows, activity, workspaceIsAdmin }: SharedPageProps) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<"with" | "by">("with");
  const [search, setSearch] = useState("");
  const [feedOpen, setFeedOpen] = useState(true);
  const [openKebab, setOpenKebab] = useState<string | null>(null);
  const [share, setShare] = useState<{ worksheetId: string; name: string; canManage: boolean } | null>(
    null,
  );

  const filteredWith = useMemo(
    () => withRows.filter((r) => matches([r.title, r.ownerName ?? ""], search)),
    [withRows, search],
  );
  const filteredBy = useMemo(
    () => byRows.filter((r) => matches([r.title, ...r.recipients.map((p) => p.name)], search)),
    [byRows, search],
  );

  const rowCount = tab === "with" ? filteredWith.length : filteredBy.length;
  const sourceEmpty = tab === "with" ? withRows.length === 0 : byRows.length === 0;

  function run(fn: () => Promise<ActionResult<unknown>>, successToast: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.push({ tone: "success", title: successToast });
        router.refresh();
      } else {
        toast.push({ tone: "error", title: res.error });
      }
    });
  }

  function canManageFor(worksheetId: string): boolean {
    if (tab === "by") return true; // the viewer owns these
    const row = withRows.find((r) => r.worksheetId === worksheetId);
    return row ? row.role === "owner" || workspaceIsAdmin : workspaceIsAdmin;
  }

  function onCopyLink(worksheetId: string) {
    startTransition(async () => {
      const res = await createShareLink({ worksheetId, role: "viewer" });
      if (!res.ok) {
        toast.push({ tone: "error", title: res.error });
        return;
      }
      const url = `${window.location.origin}/w/${worksheetId}`;
      try {
        await navigator.clipboard?.writeText(url);
        toast.push({ tone: "success", title: "Link copied to clipboard" });
      } catch {
        toast.push({ tone: "success", title: "Share link ready", description: url });
      }
      router.refresh();
    });
  }

  function onAction(action: ShareRowAction, target: ShareTarget) {
    switch (action) {
      case "manage":
        setShare({
          worksheetId: target.worksheetId,
          name: target.name,
          canManage: canManageFor(target.worksheetId),
        });
        break;
      case "copyLink":
        onCopyLink(target.worksheetId);
        break;
      case "duplicate":
        run(() => duplicateWorksheet({ id: target.worksheetId }), "Worksheet duplicated");
        break;
      case "leave":
        if (target.collaboratorId) {
          run(
            () => revokeCollaborator({ collaboratorId: target.collaboratorId as string }),
            "You left the worksheet",
          );
        }
        break;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
      {/* header */}
      <header
        style={{
          flex: "0 0 auto",
          padding: "20px 28px 0",
          borderBottom: "1px solid var(--border-hairline)",
          background: "var(--surface-paper)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <h1 style={{ margin: 0, font: "600 22px/1.2 var(--font-sans)", letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
            Shared
          </h1>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
            <div style={{ width: 260 }}>
              <Input
                value={search}
                placeholder="Search shared items…"
                prefix={<SearchIcon size={16} />}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 22, marginBottom: -1 }}>
          <TabButton id="with" label="Shared with me" count={withRows.length} active={tab === "with"} onClick={() => { setTab("with"); setOpenKebab(null); }} />
          <TabButton id="by" label="Shared by me" count={byRows.length} active={tab === "by"} onClick={() => { setTab("by"); setOpenKebab(null); }} />
        </div>
      </header>

      {/* content + feed */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "22px 28px 40px", background: "var(--surface-paper)" }}>
          {sourceEmpty ? (
            <SharedEmptyState tab={tab} />
          ) : (
            <div style={{ maxWidth: 1180, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ font: "13px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                  {tab === "with"
                    ? `${rowCount} item${rowCount === 1 ? "" : "s"} shared with you`
                    : `${rowCount} item${rowCount === 1 ? "" : "s"} you've shared`}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "12.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                  Sort: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Last activity</span>
                  <ChevronDownIcon size={14} />
                </span>
              </div>
              {rowCount === 0 ? (
                <p style={{ font: "13px/1.6 var(--font-sans)", color: "var(--text-muted)" }}>
                  No shared items match “{search}”.
                </p>
              ) : (
                <ShareTable
                  tab={tab}
                  withRows={filteredWith}
                  byRows={filteredBy}
                  openKebab={openKebab}
                  setOpenKebab={setOpenKebab}
                  onAction={onAction}
                />
              )}
            </div>
          )}
        </div>
        <ActivityFeed items={activity} open={feedOpen} setOpen={setFeedOpen} />
      </div>

      {share && (
        <ShareDialog
          open
          worksheetId={share.worksheetId}
          name={share.name}
          canManage={share.canManage}
          onClose={() => setShare(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  id: "with" | "by";
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "0 2px",
        height: 40,
        border: "none",
        background: "none",
        cursor: "pointer",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        font: `${active ? "600" : "500"} 14px/1 var(--font-sans)`,
      }}
    >
      {label}
      <span
        style={{
          font: "11px/1 var(--font-mono)",
          color: "var(--text-muted)",
          background: "var(--surface-chrome)",
          border: "1px solid var(--border-hairline)",
          borderRadius: 99,
          padding: "2px 6px",
        }}
      >
        {count}
      </span>
      {active && (
        <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: "var(--accent)" }} />
      )}
    </button>
  );
}
