import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/server/queries/workspace";
import {
  getWorkspaceMembers,
  getSeatUsage,
  getAuditLog,
} from "@/server/queries/admin";
import { AdminApp } from "@/components/admin/admin-app";

/**
 * Workspace admin (§4.11). Owner/admin only — gated here at the route and by RLS
 * on every mutation. Members management, the roles & permissions matrix, and the
 * audit log. The Server Component reads the data; the interactive surface is the
 * client island.
 */
export default async function AdminPage() {
  const active = await getActiveWorkspace();
  if (!active) redirect("/onboarding");
  if (active.role !== "owner" && active.role !== "admin") redirect("/app");

  const workspaceId = active.workspace.id;
  const [members, seatUsage, audit] = await Promise.all([
    getWorkspaceMembers(workspaceId),
    getSeatUsage(workspaceId),
    getAuditLog(workspaceId),
  ]);

  return (
    <AdminApp
      workspaceId={workspaceId}
      workspaceName={active.workspace.name}
      plan={active.workspace.plan}
      seats={active.workspace.seats}
      initialMembers={members}
      initialSeatUsage={seatUsage}
      initialAudit={audit}
    />
  );
}
