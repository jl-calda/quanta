import { redirect } from "next/navigation";
import {
  getActiveWorkspace,
  getCurrentUser,
  getMyWorkspaces,
} from "@/server/queries/workspace";
import { getWorkspaceProjects } from "@/server/queries/dashboard";
import { NavRail } from "@/components/dashboard/nav-rail";
import { firstName } from "@/components/dashboard/format";

/**
 * Authenticated app shell (§4.2). Owns the full-viewport two-pane layout — nav
 * rail + scrolling content — and gates on workspace membership. Middleware
 * guarantees a session here; a user with no workspace is sent to onboarding.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const active = await getActiveWorkspace();
  if (!active) redirect("/onboarding");

  const [user, memberships, projects] = await Promise.all([
    getCurrentUser(),
    getMyWorkspaces(),
    getWorkspaceProjects(active.workspace.id),
  ]);

  const displayName =
    user?.profile?.full_name ?? firstName(user?.email) ?? "there";

  return (
    <div className="flex h-screen overflow-hidden">
      <NavRail
        user={{ name: displayName, email: user?.email ?? null }}
        canAdmin={active.role === "owner" || active.role === "admin"}
        activeWorkspace={{
          id: active.workspace.id,
          name: active.workspace.name,
          plan: active.workspace.plan,
          seats: active.workspace.seats,
        }}
        workspaces={memberships.map((m) => ({
          id: m.workspace.id,
          name: m.workspace.name,
        }))}
        projects={projects}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
