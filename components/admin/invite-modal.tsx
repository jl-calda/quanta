"use client";

import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Dialog, Input, Select, Button } from "@/components/ds";
import { AdminIcons } from "@/components/admin/icons";
import { workspaceRoleOptions } from "@/lib/workspace/capabilities";
import { inviteMembers } from "@/server/actions/members";
import type { SeatUsage } from "@/server/queries/admin";

/**
 * Invite-members modal (Func §4.11). Add one or more email + role rows; each
 * becomes a pending invite (claimed on sign-in). Seats are advisory — inviting
 * past the seat count warns but doesn't block (seats are used on acceptance).
 */

const INVITE_ROLE_OPTS = workspaceRoleOptions({ excludeOwner: true });

type Row = { email: string; role: string };

export function InviteModal({
  open,
  onClose,
  workspaceId,
  seatUsage,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  seatUsage: SeatUsage;
  onInvited: (message: string) => void;
}): ReactNode {
  const [rows, setRows] = useState<Row[]>([{ email: "", role: "engineer" }]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setRows([{ email: "", role: "engineer" }]);
    setError(null);
  }, [open]);

  const setRow = (i: number, key: keyof Row, value: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

  const filled = rows.filter((r) => r.email.trim().length > 0);
  const overSeats = seatUsage.total > 0 && seatUsage.used + filled.length > seatUsage.total;
  const remaining = Math.max(0, seatUsage.total - seatUsage.used);

  const submit = () => {
    setError(null);
    const invites = filled.map((r) => ({ email: r.email.trim(), role: r.role }));
    if (invites.length === 0) {
      setError("Add at least one email address.");
      return;
    }
    startTransition(async () => {
      const res = await inviteMembers({ workspaceId, invites });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const { invited, skipped } = res.data;
      const parts: string[] = [];
      if (invited.length) parts.push(`${invited.length} invite${invited.length === 1 ? "" : "s"} sent`);
      if (skipped.length) parts.push(`${skipped.length} skipped`);
      onInvited(parts.join(" · ") || "Invites sent");
      onClose();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Invite members"
      eyebrow="Workspace"
      width={560}
      footer={
        <>
          <span style={{ marginRight: "auto", font: "12px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
            {filled.length} invite{filled.length === 1 ? "" : "s"} · {remaining} seat
            {remaining === 1 ? "" : "s"} remain
          </span>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Sending…" : "Send invites"}
          </Button>
        </>
      }
    >
      <p style={{ margin: "0 0 14px", font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
        They&rsquo;ll get an email invite. Seats are used when an invite is accepted.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 136px", gap: 8, marginBottom: 6 }}>
        <span style={{ font: "600 11px/1 var(--font-sans)", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Email address
        </span>
        <span style={{ font: "600 11px/1 var(--font-sans)", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Role
        </span>
      </div>

      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 136px", gap: 8, marginBottom: 8 }}>
          <Input
            value={r.email}
            onChange={(e) => setRow(i, "email", e.target.value)}
            placeholder="name@company.com"
            type="email"
          />
          <Select
            value={r.role}
            options={INVITE_ROLE_OPTS}
            onChange={(e) => setRow(i, "role", e.target.value)}
            aria-label="Role"
          />
        </div>
      ))}

      <button
        type="button"
        className="q-link"
        onClick={() => setRows((rs) => [...rs, { email: "", role: "engineer" }])}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          marginTop: 2,
          background: "none",
          border: "none",
          color: "var(--accent)",
          font: "12.5px/1 var(--font-sans)",
        }}
      >
        {AdminIcons.plus(14)} Add another
      </button>

      {overSeats && (
        <p style={{ margin: "14px 0 0", font: "12px/1.5 var(--font-sans)", color: "var(--status-warning)" }}>
          This is more than your {seatUsage.total} seats. You can still invite — seats are used
          when invites are accepted.
        </p>
      )}
      {error && (
        <p style={{ margin: "14px 0 0", font: "12.5px/1.5 var(--font-sans)", color: "var(--status-error)" }}>
          {error}
        </p>
      )}
    </Dialog>
  );
}
