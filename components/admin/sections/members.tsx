"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button, IconButton, Select } from "@/components/ds";
import { Avatar } from "@/components/shared/avatar";
import { relativeTime } from "@/components/dashboard/format";
import { AdminIcons } from "@/components/admin/icons";
import { SectionHeader, ColHead, StatusPill } from "@/components/admin/parts";
import {
  workspaceRoleOptions,
  workspaceRoleLabel,
  workspaceRoleRank,
} from "@/lib/workspace/capabilities";
import {
  changeMemberRole,
  setMemberStatus,
  removeMember,
  resendInvite,
} from "@/server/actions/members";
import type { AdminMember, SeatUsage } from "@/server/queries/admin";
import type { WorkspaceRole } from "@/lib/supabase/types";
import type { ActionResult } from "@/server/result";

const MCOLS = "1fr 132px 124px 110px 130px 40px";

type Run = <T>(
  fn: () => Promise<ActionResult<T>>,
  success: string | ((data: T) => string),
) => void;

const ROLE_OPTS = workspaceRoleOptions();

/** Seat usage card — active members vs the workspace's seat allowance. */
function SeatUsageCard({ usage }: { usage: SeatUsage }): ReactNode {
  const pct = usage.total > 0 ? Math.min(1, usage.used / usage.total) : 0;
  const remaining = Math.max(0, usage.total - usage.used);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "var(--d-row-y) var(--d-row-x)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-raised)",
      }}
    >
      <div style={{ minWidth: 132 }}>
        <div style={{ font: "12px/1 var(--font-sans)", color: "var(--text-muted)", marginBottom: 5 }}>
          <strong style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>
            {usage.used} of {usage.total}
          </strong>{" "}
          seats used
        </div>
        <div style={{ height: 6, borderRadius: 99, background: "var(--surface-chrome)", overflow: "hidden" }}>
          <div
            style={{
              width: `${pct * 100}%`,
              height: "100%",
              background: pct >= 1 ? "var(--status-warning)" : "var(--accent)",
              borderRadius: 99,
            }}
          />
        </div>
      </div>
      <span style={{ width: 1, height: 28, background: "var(--border-hairline)" }} />
      <div style={{ font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
        {remaining} seat{remaining === 1 ? "" : "s"} available
      </div>
    </div>
  );
}

function KebabMenu({
  member,
  run,
  onClose,
}: {
  member: AdminMember;
  run: Run;
  onClose: () => void;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const act = (fn: () => Promise<ActionResult<unknown>>, msg: string) => {
    onClose();
    run(fn, msg);
  };

  type Item = { label: string; danger?: boolean; onClick: () => void };
  let items: Item[];
  if (member.status === "invited") {
    items = [
      { label: "Resend invite", onClick: () => act(() => resendInvite({ memberId: member.id }), "Invite re-sent") },
      { label: "Revoke invite", danger: true, onClick: () => act(() => removeMember({ memberId: member.id }), "Invite revoked") },
    ];
  } else if (member.status === "suspended") {
    items = [
      { label: "Reactivate access", onClick: () => act(() => setMemberStatus({ memberId: member.id, status: "active" }), "Member reactivated") },
      { label: "Remove from workspace", danger: true, onClick: () => act(() => removeMember({ memberId: member.id }), "Member removed") },
    ];
  } else {
    items = [
      { label: "Suspend access", onClick: () => act(() => setMemberStatus({ memberId: member.id, status: "suspended" }), "Member suspended") },
      { label: "Remove from workspace", danger: true, onClick: () => act(() => removeMember({ memberId: member.id }), "Member removed") },
    ];
  }

  return (
    <div
      ref={ref}
      className="pop-in"
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        right: 0,
        width: 196,
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
          onClick={it.onClick}
          style={{
            display: "block",
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

function lastActiveLabel(m: AdminMember): string {
  if (m.status === "invited") return `Invited ${relativeTime(m.createdAt)}`;
  if (m.status === "suspended") return "Suspended";
  if (m.lastActiveAt) return relativeTime(m.lastActiveAt);
  return `Joined ${relativeTime(m.createdAt)}`;
}

function MemberRow({
  member,
  run,
  onDemoteOwner,
  openKebab,
  setOpenKebab,
}: {
  member: AdminMember;
  run: Run;
  onDemoteOwner: (member: AdminMember, role: WorkspaceRole) => void;
  openKebab: string | null;
  setOpenKebab: (id: string | null) => void;
}): ReactNode {
  const onRoleChange = (role: WorkspaceRole) => {
    if (role === member.role) return;
    const demotingOwner =
      member.role === "owner" && workspaceRoleRank(role) < workspaceRoleRank("owner");
    if (demotingOwner) {
      onDemoteOwner(member, role);
      return;
    }
    run(() => changeMemberRole({ memberId: member.id, role }), `Role set to ${workspaceRoleLabel(role)}`);
  };

  return (
    <div
      className="fb-row"
      style={{
        display: "grid",
        gridTemplateColumns: MCOLS,
        gap: 16,
        alignItems: "center",
        padding: "var(--d-row-y) var(--d-row-x)",
        borderBottom: "1px solid var(--border-hairline)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <Avatar name={member.name} colorKey={member.userId ?? member.email ?? member.id} size={28} />
        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: "block",
              font: "500 13px/1.3 var(--font-sans)",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {member.name}
          </span>
          {member.email && member.email !== member.name && (
            <span
              style={{
                display: "block",
                font: "11.5px/1.3 var(--font-sans)",
                color: "var(--text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {member.email}
            </span>
          )}
        </span>
      </span>

      <span>
        <Select
          size="sm"
          value={member.role}
          options={ROLE_OPTS}
          onChange={(e) => onRoleChange(e.target.value as WorkspaceRole)}
          aria-label={`Role for ${member.name}`}
        />
      </span>

      <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)" }}>
        {member.userId ? `${member.worksheetsOwned} worksheet${member.worksheetsOwned === 1 ? "" : "s"}` : "—"}
      </span>

      <span>
        <StatusPill status={member.status} />
      </span>

      <span style={{ font: "12px/1 var(--font-sans)", color: "var(--text-muted)" }}>
        {lastActiveLabel(member)}
      </span>

      <span
        style={{ display: "flex", justifyContent: "flex-end", position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="row-kebab">
          <IconButton
            label="Member actions"
            size="sm"
            active={openKebab === member.id}
            onClick={() => setOpenKebab(openKebab === member.id ? null : member.id)}
          >
            {AdminIcons.kebab(17)}
          </IconButton>
        </span>
        {openKebab === member.id && (
          <KebabMenu member={member} run={run} onClose={() => setOpenKebab(null)} />
        )}
      </span>
    </div>
  );
}

export function MembersSection({
  workspaceName,
  members,
  seatUsage,
  run,
  onInvite,
  onDemoteOwner,
}: {
  workspaceName: string;
  members: AdminMember[];
  seatUsage: SeatUsage;
  run: Run;
  onInvite: () => void;
  onDemoteOwner: (member: AdminMember, role: WorkspaceRole) => void;
}): ReactNode {
  const [q, setQ] = useState("");
  const [openKebab, setOpenKebab] = useState<string | null>(null);
  const rows = members.filter(
    (m) => !q || `${m.name} ${m.email ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <SectionHeader
        title="Members"
        subtitle={`People in the ${workspaceName} workspace.`}
        action={
          <Button variant="primary" iconLeft={AdminIcons.plus(16)} onClick={onInvite}>
            Invite members
          </Button>
        }
      />

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <SeatUsageCard usage={seatUsage} />
        <div style={{ position: "relative", flex: 1, maxWidth: 300, marginLeft: "auto" }}>
          <span
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
              display: "inline-flex",
            }}
          >
            {AdminIcons.search(16)}
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members…"
            style={{
              width: "100%",
              height: 36,
              padding: "0 12px 0 34px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
              font: "13px/1 var(--font-sans)",
              color: "var(--text-primary)",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent)";
              e.target.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--accent) 26%, transparent)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border-strong)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
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
            gridTemplateColumns: MCOLS,
            gap: 16,
            padding: "var(--d-row-y) var(--d-row-x)",
            borderBottom: "1px solid var(--border-hairline)",
            background: "var(--surface-chrome)",
          }}
        >
          <ColHead>Member</ColHead>
          <ColHead>Role</ColHead>
          <ColHead>Worksheets</ColHead>
          <ColHead>Status</ColHead>
          <ColHead>Last active</ColHead>
          <span />
        </div>
        {rows.length === 0 ? (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              font: "13px/1.5 var(--font-sans)",
              color: "var(--text-muted)",
            }}
          >
            No members match “{q}”.
          </div>
        ) : (
          rows.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              run={run}
              onDemoteOwner={onDemoteOwner}
              openKebab={openKebab}
              setOpenKebab={setOpenKebab}
            />
          ))
        )}
      </div>
    </div>
  );
}
