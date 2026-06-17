"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog, Button, Input, Select, Badge } from "@/components/ds";
import { SheetIcon, FolderIcon } from "@/components/files/icons";
import {
  loadCollaborators,
  inviteCollaborator,
  changeCollaboratorRole,
  revokeCollaborator,
  createShareLink,
} from "@/server/actions/share";
import type { CollaboratorEntry } from "@/server/queries/shared";
import type { ActionResult } from "@/server/result";
import { Avatar } from "./avatar";
import { LinkIcon } from "./icons";

/**
 * The reusable Share dialog (Func §3.8). Opened from the Shared page's *Manage
 * access* and the editor app-bar's Share button — same component, same props.
 * Invite / role / revoke / link controls render only when `canManage`; everyone
 * else sees a read-only access list. RLS is the real gate on every mutation; the
 * dialog surfaces denials inline (it owns its own feedback, so it needs no toast
 * host and drops into any surface).
 */

const INVITE_ROLES = [
  { value: "editor", label: "Editor" },
  { value: "commenter", label: "Commenter" },
  { value: "viewer", label: "Viewer" },
];
const MEMBER_ROLES = [...INVITE_ROLES, { value: "remove", label: "Remove access" }];

type AssignableRole = "editor" | "commenter" | "viewer";

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  worksheetId: string;
  name: string;
  kind?: "sheet" | "folder";
  canManage: boolean;
  /** Notified after any successful change, so a parent list can refresh. */
  onChanged?: () => void;
}

export function ShareDialog({
  open,
  onClose,
  worksheetId,
  name,
  kind = "sheet",
  canManage,
  onChanged,
}: ShareDialogProps) {
  const [list, setList] = useState<CollaboratorEntry[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("editor");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  // Load (and reset) the access list each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setInfo(null);
    setEmail("");
    setRole("editor");
    setLoaded(false);
    startTransition(async () => {
      const res = await loadCollaborators(worksheetId);
      if (res.ok) setList(res.data);
      else setError(res.error);
      setLoaded(true);
    });
  }, [open, worksheetId]);

  function refresh() {
    startTransition(async () => {
      const res = await loadCollaborators(worksheetId);
      if (res.ok) setList(res.data);
      setLoaded(true);
    });
  }

  /** Run a mutation, then refresh the list and notify the parent. */
  function run(fn: () => Promise<ActionResult<unknown>>, onOk?: () => void) {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOk?.();
      refresh();
      onChanged?.();
    });
  }

  function onInvite() {
    if (!email.trim()) {
      setError("Enter a name or email.");
      return;
    }
    const value = email.trim();
    run(
      () => inviteCollaborator({ worksheetId, email: value, role }),
      () => {
        setEmail("");
        setInfo(`Invited ${value}.`);
      },
    );
  }

  function onMemberRoleChange(entry: CollaboratorEntry, next: string) {
    if (!entry.id) return;
    if (next === "remove") {
      run(() => revokeCollaborator({ collaboratorId: entry.id as string }), () =>
        setInfo(`Removed ${entry.name}.`),
      );
    } else {
      run(() =>
        changeCollaboratorRole({ collaboratorId: entry.id as string, role: next as AssignableRole }),
      );
    }
  }

  function onCopyLink() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await createShareLink({ worksheetId, role: "viewer" });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const url = `${window.location.origin}/w/${worksheetId}`;
      try {
        await navigator.clipboard?.writeText(url);
        setInfo("Link copied to clipboard.");
      } catch {
        setInfo(url);
      }
      onChanged?.();
    });
  }

  const Icon = kind === "folder" ? FolderIcon : SheetIcon;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Share worksheet"
      width={480}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: kind === "folder" ? "var(--accent)" : "var(--text-muted)", display: "inline-flex" }}>
            <Icon size={18} />
          </span>
          {name}
        </span>
      }
      footer={
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
          {canManage && (
            <button
              type="button"
              className="q-link"
              onClick={onCopyLink}
              disabled={pending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                padding: 0,
                cursor: pending ? "default" : "pointer",
                color: "var(--text-primary)",
                font: "13px/1 var(--font-sans)",
              }}
            >
              <LinkIcon size={16} /> Copy link
            </button>
          )}
          <div style={{ marginLeft: "auto" }}>
            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      }
    >
      {/* invite row */}
      {canManage && (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Add people by name or email…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onInvite();
              }}
            />
          </div>
          <div style={{ width: 124 }}>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as AssignableRole)}
              options={INVITE_ROLES}
            />
          </div>
          <Button variant="primary" onClick={onInvite} disabled={pending}>
            Invite
          </Button>
        </div>
      )}

      {(error || info) && (
        <p
          style={{
            margin: "12px 0 0",
            font: "12.5px/1.4 var(--font-sans)",
            color: error ? "var(--status-error)" : "var(--status-pass)",
          }}
        >
          {error ?? info}
        </p>
      )}

      {/* members */}
      <div
        style={{
          font: "600 11px/1 var(--font-sans)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          margin: "20px 0 10px",
        }}
      >
        People with access
      </div>

      {loaded && list.length === 0 ? (
        <p style={{ margin: 0, font: "13px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
          {pending ? "Loading…" : "No one has access yet."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {list.map((m) => (
            <div
              key={m.id ?? `owner:${m.userId}`}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 4px" }}
            >
              <Avatar name={m.name} colorKey={m.userId ?? m.email ?? m.name} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    font: "500 13px/1.3 var(--font-sans)",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                  {m.isOwner && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(owner)</span>}
                  {m.status === "pending" && (
                    <Badge tone="warning" variant="soft">
                      Pending
                    </Badge>
                  )}
                </div>
                {m.email && !m.isOwner && (
                  <div
                    style={{
                      font: "11.5px/1.3 var(--font-sans)",
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.email}
                  </div>
                )}
              </div>
              {m.isOwner || !canManage ? (
                <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-muted)", paddingRight: 8 }}>
                  {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                </span>
              ) : (
                <div style={{ width: 132 }}>
                  <Select
                    size="sm"
                    value={m.role}
                    disabled={pending}
                    onChange={(e) => onMemberRoleChange(m, e.target.value)}
                    options={MEMBER_ROLES}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}
