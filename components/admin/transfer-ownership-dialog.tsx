"use client";

import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Dialog, Select, Button } from "@/components/ds";
import { workspaceRoleLabel } from "@/lib/workspace/capabilities";
import { changeMemberRole, loadOwnershipImpact } from "@/server/actions/members";
import type { AdminMember, OwnershipImpact } from "@/server/queries/admin";
import type { WorkspaceRole } from "@/lib/supabase/types";

/**
 * Ownership-transfer prompt (Func §4.11). Opened when an admin downgrades an
 * owner: if that owner still owns worksheets, offer to transfer them to another
 * owner/admin before applying the downgrade — or downgrade anyway.
 */

export function TransferOwnershipDialog({
  open,
  member,
  targetRole,
  workspaceId,
  onClose,
  onDone,
}: {
  open: boolean;
  member: AdminMember | null;
  targetRole: WorkspaceRole | null;
  workspaceId: string;
  onClose: () => void;
  onDone: (message: string) => void;
}): ReactNode {
  const [impact, setImpact] = useState<OwnershipImpact | null>(null);
  const [transferTo, setTransferTo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();

  useEffect(() => {
    if (!open || !member) return;
    setImpact(null);
    setTransferTo("");
    setError(null);
    startLoad(async () => {
      const res = await loadOwnershipImpact(member.id, workspaceId);
      if (res.ok) {
        setImpact(res.data);
        setTransferTo(res.data.eligibleOwners[0]?.id ?? "");
      } else {
        setError(res.error);
      }
    });
  }, [open, member, workspaceId]);

  if (!member || !targetRole) return null;

  const apply = (withTransfer: boolean) => {
    setError(null);
    startSave(async () => {
      const res = await changeMemberRole({
        memberId: member.id,
        role: targetRole,
        transferTo: withTransfer ? transferTo : null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone(`${member.name} is now ${workspaceRoleLabel(targetRole).toLowerCase()}`);
      onClose();
    });
  };

  const ownedCount = impact?.ownedCount ?? 0;
  const hasOwned = ownedCount > 0;
  const canTransfer = hasOwned && (impact?.eligibleOwners.length ?? 0) > 0;
  const pending = loading || saving;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Transfer ownership"
      eyebrow="Downgrade owner"
      width={480}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          {hasOwned && (
            <Button variant="ghost" onClick={() => apply(false)} disabled={pending}>
              Downgrade anyway
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => apply(canTransfer)}
            disabled={pending || (canTransfer && !transferTo)}
          >
            {saving ? "Applying…" : canTransfer ? "Transfer & downgrade" : "Downgrade"}
          </Button>
        </>
      }
    >
      {loading && (
        <p style={{ margin: 0, font: "13px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
          Checking what {member.name} owns…
        </p>
      )}

      {!loading && !hasOwned && (
        <p style={{ margin: 0, font: "13px/1.6 var(--font-sans)", color: "var(--text-primary)" }}>
          {member.name} doesn&rsquo;t own any worksheets. You can safely change their role to{" "}
          {workspaceRoleLabel(targetRole).toLowerCase()}.
        </p>
      )}

      {!loading && hasOwned && (
        <>
          <p style={{ margin: "0 0 14px", font: "13px/1.6 var(--font-sans)", color: "var(--text-primary)" }}>
            {member.name} owns <strong>{ownedCount} worksheet{ownedCount === 1 ? "" : "s"}</strong>.
            As {workspaceRoleLabel(targetRole).toLowerCase()} they&rsquo;ll lose owner control of{" "}
            {ownedCount === 1 ? "it" : "them"}. Transfer ownership first?
          </p>
          {canTransfer ? (
            <label style={{ display: "block" }}>
              <span style={{ display: "block", font: "600 11px/1 var(--font-sans)", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
                Transfer to
              </span>
              <Select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                options={impact!.eligibleOwners.map((o) => ({ value: o.id, label: o.name }))}
              />
            </label>
          ) : (
            <p style={{ margin: 0, font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
              No other owners or admins to transfer to. Promote someone first, or downgrade anyway
              and reassign later.
            </p>
          )}
        </>
      )}

      {error && (
        <p style={{ margin: "14px 0 0", font: "12.5px/1.5 var(--font-sans)", color: "var(--status-error)" }}>
          {error}
        </p>
      )}
    </Dialog>
  );
}
