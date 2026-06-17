"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconButton } from "@/components/ds";
import { StatusChip } from "@/components/dashboard/status-chip";
import { relativeTime } from "@/components/dashboard/format";
import { SheetIcon, KebabIcon } from "@/components/files/icons";
import type { SharedWithMeRow, SharedByMeRow } from "@/server/queries/shared";
import { Avatar, AvatarStack, RoleChip } from "./avatar";
import { ManageAccessIcon } from "./icons";

/**
 * Shared with me / by me tables (Func §4.8), ported from `shared-app.jsx`. Each
 * row joins a worksheet to the viewer's effective role, live calc status, and
 * last activity. Hover reveals **Manage access** + a kebab; the row name links to
 * the editor. All mutations are lifted to the parent via callbacks.
 */

const COLS_WITH = "30px 1fr 188px 116px 132px 120px 76px";
const COLS_BY = "30px 1fr 150px 116px 132px 120px 76px";

export interface ShareTarget {
  worksheetId: string;
  name: string;
  /** Present only on "shared with me" rows — the viewer's own grant. */
  collaboratorId?: string;
}

export type ShareRowAction = "manage" | "copyLink" | "duplicate" | "leave";

function Head({ children }: { children?: React.ReactNode }) {
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

export function ShareTable({
  tab,
  withRows,
  byRows,
  openKebab,
  setOpenKebab,
  onAction,
}: {
  tab: "with" | "by";
  withRows: SharedWithMeRow[];
  byRows: SharedByMeRow[];
  openKebab: string | null;
  setOpenKebab: (id: string | null) => void;
  onAction: (action: ShareRowAction, target: ShareTarget) => void;
}) {
  const isWith = tab === "with";
  const cols = isWith ? COLS_WITH : COLS_BY;
  const count = isWith ? withRows.length : byRows.length;

  const rows: {
    worksheetId: string;
    name: string;
    target: ShareTarget;
    by?: { name: string; id: string };
    withPeople?: { id: string; name: string }[];
    role: SharedWithMeRow["role"];
    status: SharedWithMeRow["calcStatus"];
    updatedAt: string;
  }[] = isWith
    ? withRows.map((r) => ({
        worksheetId: r.worksheetId,
        name: r.title,
        target: { worksheetId: r.worksheetId, name: r.title, collaboratorId: r.collaboratorId },
        by: { name: r.ownerName ?? "Owner", id: r.ownerId ?? r.worksheetId },
        role: r.role,
        status: r.calcStatus,
        updatedAt: r.updatedAt,
      }))
    : byRows.map((r) => ({
        worksheetId: r.worksheetId,
        name: r.title,
        target: { worksheetId: r.worksheetId, name: r.title },
        withPeople: r.recipients.map((p) => ({ id: p.id, name: p.name })),
        role: "owner" as const,
        status: r.calcStatus,
        updatedAt: r.updatedAt,
      }));

  return (
    <div
      style={{
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "var(--surface-raised)",
      }}
    >
      <style>{
        ".sh-row .sh-actions{opacity:0;transition:opacity var(--dur-fast) var(--ease-out)}" +
        ".sh-row:hover{background:var(--surface-hover)}" +
        ".sh-row:hover .sh-actions,.sh-row:focus-within .sh-actions{opacity:1}"
      }</style>

      {/* header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gap: 16,
          alignItems: "center",
          padding: "var(--d-row-y) var(--d-row-x)",
          borderBottom: "1px solid var(--border-hairline)",
          background: "var(--surface-chrome)",
        }}
      >
        <span />
        <Head>Name</Head>
        <Head>{isWith ? "Shared by" : "Shared with"}</Head>
        <Head>Your role</Head>
        <Head>Calc status</Head>
        <Head>Last activity</Head>
        <span />
      </div>

      {/* rows */}
      {rows.map((r, i) => (
        <div
          key={r.worksheetId}
          className="sh-row"
          style={{
            display: "grid",
            gridTemplateColumns: cols,
            gap: 16,
            alignItems: "center",
            padding: "var(--d-row-y) var(--d-row-x)",
            borderBottom: i < rows.length - 1 ? "1px solid var(--border-hairline)" : "none",
          }}
        >
          <span style={{ display: "inline-flex", color: "var(--text-muted)" }}>
            <SheetIcon size={17} />
          </span>

          <span style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            <Link
              href={`/w/${r.worksheetId}`}
              style={{
                font: "500 13px/1.3 var(--font-sans)",
                color: "var(--text-primary)",
                textDecoration: "none",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.name}
            </Link>
          </span>

          {isWith && r.by ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Avatar name={r.by.name} colorKey={r.by.id} />
              <span
                style={{
                  font: "12.5px/1.2 var(--font-sans)",
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.by.name}
              </span>
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center" }}>
              {r.withPeople && r.withPeople.length > 0 ? (
                <AvatarStack people={r.withPeople} />
              ) : (
                <span style={{ color: "var(--text-muted)", font: "12.5px var(--font-sans)" }}>Link only</span>
              )}
            </span>
          )}

          <span>
            <RoleChip role={r.role} />
          </span>

          <span>
            <StatusChip status={r.status} />
          </span>

          <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
            {relativeTime(r.updatedAt)}
          </span>

          <span
            className="sh-actions"
            style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, position: "relative" }}
          >
            <IconButton label="Manage access" size="sm" onClick={() => onAction("manage", r.target)}>
              <ManageAccessIcon size={17} />
            </IconButton>
            <IconButton
              label="More"
              size="sm"
              active={openKebab === r.worksheetId}
              onClick={() => setOpenKebab(openKebab === r.worksheetId ? null : r.worksheetId)}
            >
              <KebabIcon size={17} />
            </IconButton>
            {openKebab === r.worksheetId && (
              <KebabMenu
                tab={tab}
                target={r.target}
                onAction={onAction}
                onClose={() => setOpenKebab(null)}
              />
            )}
          </span>
        </div>
      ))}

      {count === 0 && (
        <div style={{ padding: "20px var(--d-row-x)", font: "13px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
          Nothing here.
        </div>
      )}
    </div>
  );
}

function KebabMenu({
  tab,
  target,
  onAction,
  onClose,
}: {
  tab: "with" | "by";
  target: ShareTarget;
  onAction: (action: ShareRowAction, target: ShareTarget) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const items: { label: string; danger?: boolean; run: () => void }[] = [
    { label: "Open", run: () => router.push(`/w/${target.worksheetId}`) },
    { label: "Manage access", run: () => onAction("manage", target) },
    { label: "Copy link", run: () => onAction("copyLink", target) },
    { label: "Make a copy", run: () => onAction("duplicate", target) },
  ];
  if (tab === "with" && target.collaboratorId) {
    items.push({ label: "Leave", danger: true, run: () => onAction("leave", target) });
  }

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        right: 0,
        width: 180,
        zIndex: 50,
        background: "var(--surface-raised)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-popover)",
        padding: 5,
      }}
    >
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={() => {
            onClose();
            it.run();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            padding: "7px 9px",
            border: "none",
            background: "transparent",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            textAlign: "left",
            color: it.danger ? "var(--status-error)" : "var(--text-primary)",
            font: "12.5px/1 var(--font-sans)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = it.danger ? "var(--status-error-bg)" : "var(--surface-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
