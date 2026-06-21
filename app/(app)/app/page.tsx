import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  getActiveWorkspace,
  getCurrentUser,
} from "@/server/queries/workspace";
import {
  getRecentWorksheets,
  getWorkspaceProjects,
  getWorkspaceTemplates,
} from "@/server/queries/dashboard";
import { TopBar } from "@/components/dashboard/top-bar";
import { RecentCard } from "@/components/dashboard/recent-card";
import { TemplateCard } from "@/components/dashboard/template-card";
import { ProjectsTable } from "@/components/dashboard/projects-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ArrowRightIcon } from "@/components/dashboard/icons";
import { greeting, firstName } from "@/components/dashboard/format";
import type { WorkspaceRole } from "@/lib/supabase/types";

export const metadata = { title: "Home · Quanta" };

const CAN_CREATE_ROLES: WorkspaceRole[] = ["owner", "admin", "engineer"];

function SectionHeader({
  title,
  action,
  first = false,
}: {
  title: string;
  action?: string;
  first?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between ${
        first ? "" : "mt-[34px] border-t border-hairline pt-7"
      } mb-4`}
    >
      <h2 className="text-[15px] font-semibold leading-tight text-ink">
        {title}
      </h2>
      {action && (
        <span className="q-link inline-flex items-center gap-1.5 text-[12.5px]">
          {action} <ArrowRightIcon size={14} />
        </span>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const active = await getActiveWorkspace();
  if (!active) redirect("/onboarding");

  const workspaceId = active.workspace.id;
  const canCreate = CAN_CREATE_ROLES.includes(active.role);

  const [user, recents, templates, projects] = await Promise.all([
    getCurrentUser(),
    getRecentWorksheets(workspaceId),
    getWorkspaceTemplates(workspaceId),
    getWorkspaceProjects(workspaceId),
  ]);

  const projectNames: Record<string, string> = Object.fromEntries(
    projects.map((p) => [p.id, p.name]),
  );
  const displayName = user?.profile?.full_name ?? firstName(user?.email);
  const isEmpty = recents.length === 0;

  return (
    <>
      <TopBar
        greeting={greeting()}
        firstName={firstName(displayName)}
        workspaceName={active.workspace.name}
        projectCount={projects.length}
        workspaceId={workspaceId}
        canCreate={canCreate}
      />

      <main className="q-grid scroll-y flex-1 bg-paper">
        {isEmpty ? (
          <EmptyState
            workspaceId={workspaceId}
            canCreate={canCreate}
            templates={templates}
          />
        ) : (
          <div className="mx-auto w-full max-w-[1240px] px-8 pb-12 pt-7">
            {/* Continue working */}
            <SectionHeader
              title="Continue working"
              action="All worksheets"
              first
            />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-[18px]">
              {recents.map((worksheet) => (
                <RecentCard
                  key={worksheet.id}
                  worksheet={worksheet}
                  projectName={
                    worksheet.project_id
                      ? projectNames[worksheet.project_id]
                      : undefined
                  }
                />
              ))}
            </div>

            {/* Start from a template */}
            {templates.length > 0 && (
              <TemplatesSection
                templates={templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    workspaceId={workspaceId}
                    canCreate={canCreate}
                  />
                ))}
              />
            )}

            {/* Your projects */}
            <SectionHeader title="Your projects" action="Open file browser" />
            <ProjectsTable
              projects={projects}
              worksheets={recents}
              projectNames={projectNames}
              currentUserId={user?.id ?? ""}
              currentUserName={displayName}
            />
          </div>
        )}
      </main>
    </>
  );
}

/** The horizontal-scroll template row gets its own anchor for the split-button. */
function TemplatesSection({ templates }: { templates: ReactNode }) {
  return (
    <div id="templates" className="scroll-mt-6">
      <SectionHeader title="Start from a template" action="Browse templates" />
      <div className="scroll-x flex gap-[18px] pb-2">{templates}</div>
    </div>
  );
}
