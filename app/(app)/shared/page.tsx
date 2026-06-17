import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/server/queries/workspace";
import {
  getSharedWithMe,
  getSharedByMe,
  getSharedActivity,
} from "@/server/queries/shared";
import { SharedPage } from "@/components/shared/shared-page";

export const metadata = { title: "Shared · Quanta" };

/**
 * Shared (Func §3.8 / §4.8). A Server Component resolves the active workspace,
 * runs the RLS-scoped reads — worksheets shared with me, worksheets I've shared,
 * and the recent-activity feed over their union — then hands them to the client
 * shell. Mutations are Server Actions; RLS is the real gate, UI gates on role.
 */
export default async function SharedRoute() {
  const active = await getActiveWorkspace();
  if (!active) redirect("/onboarding");

  const workspaceId = active.workspace.id;
  const workspaceIsAdmin = active.role === "owner" || active.role === "admin";

  const [withRows, byRows] = await Promise.all([
    getSharedWithMe(workspaceId, active.role),
    getSharedByMe(workspaceId),
  ]);

  const titlesById = new Map<string, string>();
  for (const r of withRows) titlesById.set(r.worksheetId, r.title);
  for (const r of byRows) titlesById.set(r.worksheetId, r.title);

  const activity = await getSharedActivity(workspaceId, [...titlesById.keys()], titlesById);

  return (
    <SharedPage
      withRows={withRows}
      byRows={byRows}
      activity={activity}
      workspaceIsAdmin={workspaceIsAdmin}
    />
  );
}
