import type { WorkspaceRole, WorksheetRole } from "@/lib/supabase/types";

/**
 * Worksheet-role helpers, mirroring the SQL source of truth in
 * `0002_rls.sql` (`worksheet_role_rank` + `worksheet_effective_role`). Pure and
 * deterministic so the Shared page can show the *effective* role a viewer has on
 * a worksheet without an N+1 of `worksheet_effective_role` RPC calls — RLS still
 * enforces the real gate on every read/mutation.
 */

/** Strength ranking so we can take the strongest of several grants. */
export function worksheetRoleRank(role: WorksheetRole | null): number {
  switch (role) {
    case "owner":
      return 4;
    case "editor":
      return 3;
    case "commenter":
      return 2;
    case "viewer":
      return 1;
    default:
      return 0;
  }
}

/**
 * The worksheet-role baseline a workspace role grants on every sheet in that
 * workspace (Func §1 / `0002_rls.sql`). `billing` and non-members get none.
 */
export function baselineWorksheetRole(
  workspaceRole: WorkspaceRole | null,
): WorksheetRole | null {
  switch (workspaceRole) {
    case "owner":
    case "admin":
      return "owner";
    case "engineer":
      return "editor";
    case "reviewer":
      return "commenter";
    case "viewer":
      return "viewer";
    default:
      return null; // billing / unknown / non-member
  }
}

/**
 * Effective worksheet role = the stronger of an explicit collaborator grant and
 * the workspace-role baseline. Returns null only when the user has neither.
 */
export function effectiveWorksheetRole(
  grant: WorksheetRole | null,
  workspaceRole: WorkspaceRole | null,
): WorksheetRole | null {
  const base = baselineWorksheetRole(workspaceRole);
  if (base === null) return grant;
  if (grant === null) return base;
  return worksheetRoleRank(grant) > worksheetRoleRank(base) ? grant : base;
}

/** Sentence-case label for a worksheet role, e.g. "Editor". */
export function worksheetRoleLabel(role: WorksheetRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
