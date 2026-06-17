import type { WorkspaceRole } from "@/lib/supabase/types";

/**
 * Roles & permissions matrix (Func §4.11). The role→capability map is the single
 * source of truth for the admin "Roles & permissions" screen — pure and
 * deterministic so it can be unit-tested and rendered read-only. Ported 1:1 from
 * the Claude Design mockup (`admin-app.jsx` CAPS/MATRIX).
 *
 * A cell is one of:
 *   • "full"    — the role can do this everywhere.
 *   • "partial" — limited to assigned projects only.
 *   • "none"    — not allowed.
 */

export type CapabilityState = "full" | "partial" | "none";

/** Column order for the matrix (and a stable order for member sorting). */
export const WORKSPACE_ROLES: readonly WorkspaceRole[] = [
  "owner",
  "admin",
  "engineer",
  "reviewer",
  "viewer",
  "billing",
] as const;

export interface Capability {
  id: string;
  label: string;
  /** Per-role state, indexed by `WorkspaceRole`. */
  states: Record<WorkspaceRole, CapabilityState>;
}

export interface CapabilityGroup {
  group: string;
  items: Capability[];
}

/** Build a per-role state record from values in `WORKSPACE_ROLES` order. */
function row(values: readonly CapabilityState[]): Record<WorkspaceRole, CapabilityState> {
  const out = {} as Record<WorkspaceRole, CapabilityState>;
  WORKSPACE_ROLES.forEach((role, i) => {
    out[role] = values[i] ?? "none";
  });
  return out;
}

export const CAPABILITY_GROUPS: readonly CapabilityGroup[] = [
  {
    group: "Worksheets",
    items: [
      //                          owner   admin     engineer  reviewer   viewer    billing
      { id: "create", label: "Create worksheets", states: row(["full", "full", "full", "none", "none", "none"]) },
      { id: "edit", label: "Edit shared worksheets", states: row(["full", "full", "full", "partial", "none", "none"]) },
      { id: "approve", label: "Approve / sign", states: row(["full", "full", "partial", "full", "none", "none"]) },
      { id: "export", label: "Export", states: row(["full", "full", "full", "full", "partial", "none"]) },
    ],
  },
  {
    group: "Workspace",
    items: [
      { id: "templates", label: "Manage templates", states: row(["full", "full", "partial", "none", "none", "none"]) },
      { id: "members", label: "Manage members", states: row(["full", "full", "none", "none", "none", "none"]) },
      { id: "billing", label: "Manage billing", states: row(["full", "none", "none", "none", "none", "full"]) },
      { id: "audit", label: "View audit log", states: row(["full", "full", "none", "none", "none", "partial"]) },
    ],
  },
] as const;

/** Sentence-case label for a workspace role, e.g. "Engineer". */
export function workspaceRoleLabel(role: WorkspaceRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** Role options for a `<Select>` ([{ value, label }]), optionally excluding owner. */
export function workspaceRoleOptions(
  opts: { excludeOwner?: boolean } = {},
): { value: WorkspaceRole; label: string }[] {
  return WORKSPACE_ROLES.filter((r) => !(opts.excludeOwner && r === "owner")).map(
    (value) => ({ value, label: workspaceRoleLabel(value) }),
  );
}

/** Strength ranking for workspace roles, so we can tell a demotion from a promotion. */
export function workspaceRoleRank(role: WorkspaceRole): number {
  switch (role) {
    case "owner":
      return 6;
    case "admin":
      return 5;
    case "engineer":
      return 4;
    case "reviewer":
      return 3;
    case "viewer":
      return 2;
    case "billing":
      return 1;
    default:
      return 0;
  }
}
