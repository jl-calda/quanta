"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { AdminIcons, type AdminIcon } from "@/components/admin/icons";
import { MembersSection } from "@/components/admin/sections/members";
import { RolesSection } from "@/components/admin/sections/roles";
import { AuditSection } from "@/components/admin/sections/audit";
import { PlaceholderSection } from "@/components/admin/sections/placeholder";
import { InviteModal } from "@/components/admin/invite-modal";
import { TransferOwnershipDialog } from "@/components/admin/transfer-ownership-dialog";
import { loadMembers, loadAuditLog } from "@/server/actions/members";
import type { AdminMember, SeatUsage } from "@/server/queries/admin";
import type { AuditEntry } from "@/lib/workspace/audit";
import type { ActionResult } from "@/server/result";
import type { WorkspaceRole } from "@/lib/supabase/types";

/**
 * Workspace admin client island (Func §4.11). Hosts the 244px section rail and
 * the live sections (Members, Roles & permissions, Audit log) plus placeholders,
 * the invite modal, and the ownership-transfer prompt. Mutations run through
 * `run()`, which refreshes the lists and toasts in the app's voice.
 */

interface Section {
  id: string;
  label: string;
  icon: AdminIcon;
  sub?: string;
}

const SECTIONS: Section[] = [
  { id: "members", label: "Members", icon: AdminIcons.members },
  { id: "roles", label: "Roles & permissions", icon: AdminIcons.roles },
  { id: "projects", label: "Projects", icon: AdminIcons.projects },
  { id: "templates", label: "Templates", icon: AdminIcons.templates },
  { id: "branding", label: "Branding", icon: AdminIcons.branding },
  { id: "security", label: "Security", icon: AdminIcons.security, sub: "SSO · 2FA" },
  { id: "audit", label: "Audit log", icon: AdminIcons.audit },
  { id: "billing", label: "Billing & seats", icon: AdminIcons.billing },
];

/* ---------------- toast (ported from settings-app.tsx) ---------------- */

interface ToastState {
  msg: string;
  leaving: boolean;
  id: number;
}

function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string) => {
    setToast({ msg, leaving: false, id: Date.now() });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast((t) => (t ? { ...t, leaving: true } : null)), 2200);
    setTimeout(() => setToast(null), 2600);
  }, []);
  return [toast, show] as const;
}

function Toast({ toast }: { toast: ToastState | null }): ReactNode {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={toast.leaving ? "toast-out" : "toast-in"}
      style={{
        position: "fixed",
        bottom: 26,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 90,
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        padding: "10px 15px",
        background: "var(--ink)",
        color: "var(--text-inverse)",
        borderRadius: 8,
        boxShadow: "var(--shadow-modal)",
        font: "13px/1 var(--font-sans)",
      }}
    >
      {toast.msg}
    </div>
  );
}

export function AdminApp({
  workspaceId,
  workspaceName,
  plan,
  seats,
  initialMembers,
  initialSeatUsage,
  initialAudit,
}: {
  workspaceId: string;
  workspaceName: string;
  plan: string;
  seats: number;
  initialMembers: AdminMember[];
  initialSeatUsage: SeatUsage;
  initialAudit: AuditEntry[];
}): ReactNode {
  const [active, setActive] = useState("members");
  const [members, setMembers] = useState(initialMembers);
  const [seatUsage, setSeatUsage] = useState(initialSeatUsage);
  const [audit, setAudit] = useState(initialAudit);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [transfer, setTransfer] = useState<{ member: AdminMember; role: WorkspaceRole } | null>(null);
  const [toast, showToast] = useToast();
  const [, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const [m, a] = await Promise.all([loadMembers(workspaceId), loadAuditLog(workspaceId)]);
    if (m.ok) {
      setMembers(m.data);
      setSeatUsage((prev) => ({ ...prev, used: m.data.filter((x) => x.status === "active").length }));
    }
    if (a.ok) setAudit(a.data);
  }, [workspaceId]);

  /** Run a mutation, then refresh + toast. `success` may derive its message. */
  const run = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>, success: string | ((data: T) => string)) => {
      startTransition(async () => {
        const res = await fn();
        if (res.ok) {
          await refresh();
          showToast(typeof success === "function" ? success(res.data) : success);
        } else {
          showToast(res.error);
        }
      });
    },
    [refresh, showToast],
  );

  const onInvited = useCallback(
    (message: string) => {
      void refresh();
      showToast(message);
    },
    [refresh, showToast],
  );

  const content = (): ReactNode => {
    if (active === "members") {
      return (
        <MembersSection
          workspaceName={workspaceName}
          members={members}
          seatUsage={seatUsage}
          run={run}
          onInvite={() => setInviteOpen(true)}
          onDemoteOwner={(member, role) => setTransfer({ member, role })}
        />
      );
    }
    if (active === "roles") return <RolesSection />;
    if (active === "audit") return <AuditSection entries={audit} />;
    const sec = SECTIONS.find((s) => s.id === active)!;
    return <PlaceholderSection label={sec.label} icon={sec.icon} />;
  };

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }} data-screen-label="Workspace admin">
      <aside
        style={{
          width: 244,
          flex: "0 0 244px",
          borderRight: "1px solid var(--border-hairline)",
          background: "var(--surface-chrome)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div style={{ padding: "20px 18px 14px" }}>
          <div style={{ font: "600 16px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>
            Workspace
          </div>
          <div style={{ font: "12.5px/1.4 var(--font-sans)", color: "var(--text-muted)", marginTop: 3 }}>
            {workspaceName}
          </div>
        </div>

        <div className="scroll-y" style={{ flex: 1, padding: "4px 8px 12px", minHeight: 0 }}>
          {SECTIONS.map((sec) => {
            const on = active === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActive(sec.id)}
                aria-current={on ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  background: on ? "var(--accent-tint)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: 1,
                }}
                onMouseEnter={(e) => {
                  if (!on) e.currentTarget.style.background = "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!on) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ display: "inline-flex", color: on ? "var(--accent)" : "var(--text-muted)" }}>
                  {sec.icon(18)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      font: `${on ? "600 " : "500 "}13px/1.2 var(--font-sans)`,
                      color: on ? "var(--accent)" : "var(--text-primary)",
                    }}
                  >
                    {sec.label}
                  </span>
                  {sec.sub && (
                    <span
                      style={{
                        display: "block",
                        font: "11px/1.2 var(--font-sans)",
                        color: "var(--text-muted)",
                        marginTop: 1,
                      }}
                    >
                      {sec.sub}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border-hairline)",
            padding: "12px 16px",
            font: "11.5px/1.4 var(--font-sans)",
            color: "var(--text-muted)",
          }}
        >
          Plan:{" "}
          <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </strong>{" "}
          · {seats} seats
        </div>
      </aside>

      <div
        className="scroll-y"
        style={{ flex: 1, minWidth: 0, padding: "36px 40px 60px", background: "var(--surface-paper)" }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>{content()}</div>
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        workspaceId={workspaceId}
        seatUsage={seatUsage}
        onInvited={onInvited}
      />
      <TransferOwnershipDialog
        open={transfer !== null}
        member={transfer?.member ?? null}
        targetRole={transfer?.role ?? null}
        workspaceId={workspaceId}
        onClose={() => setTransfer(null)}
        onDone={(message) => {
          void refresh();
          showToast(message);
        }}
      />
      <Toast toast={toast} />
    </div>
  );
}
