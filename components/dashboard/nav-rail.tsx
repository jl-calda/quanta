import Link from "next/link";
import { QuantaMark } from "@/components/quanta-mark";
import {
  HomeIcon,
  SheetIcon,
  TemplateIcon,
  ShareIcon,
  TrashIcon,
  BookIcon,
} from "./icons";
import { NavItem } from "./nav-item";
import { WorkspaceSwitcher, type WorkspaceOption } from "./workspace-switcher";
import { UserMenu } from "./user-menu";
import type { ProjectSummary } from "@/server/queries/dashboard";

/** Cycle of project dot colors, matching the mockup. */
const DOT_COLORS = [
  "var(--accent)",
  "var(--status-pass)",
  "var(--text-muted)",
];

/**
 * The dashboard's left nav rail (232px chrome panel): brand, primary nav,
 * the workspace's projects, and the workspace/user cards at the foot. Static
 * structure renders on the server; only the active-state, switcher, and user
 * menu are client islands.
 */
export function NavRail({
  user,
  canAdmin = false,
  activeWorkspace,
  workspaces,
  projects,
}: {
  user: { name: string; email: string | null };
  canAdmin?: boolean;
  activeWorkspace: { id: string; name: string; plan: string; seats: number };
  workspaces: WorkspaceOption[];
  projects: ProjectSummary[];
}) {
  const planLabel =
    activeWorkspace.plan.charAt(0).toUpperCase() + activeWorkspace.plan.slice(1);
  const subtitle = `${planLabel} · ${activeWorkspace.seats} seats`;

  return (
    <nav className="flex h-screen w-[232px] flex-none flex-col border-r border-hairline bg-chrome px-3 pb-3 pt-[18px]">
      {/* Brand */}
      <Link
        href="/app"
        className="flex items-center gap-[9px] px-2 pb-[18px] pt-1 text-ink"
      >
        <QuantaMark size={24} className="text-accent" />
        <span className="text-[18px] font-semibold leading-none tracking-[-0.01em]">
          Quanta
        </span>
      </Link>

      {/* Primary nav */}
      <div className="flex flex-col gap-0.5">
        <NavItem href="/app" label="Home" icon={<HomeIcon size={19} />} />
        <NavItem
          href="/worksheets"
          label="Worksheets"
          icon={<SheetIcon size={19} />}
        />
        <NavItem
          href="/templates"
          label="Templates"
          icon={<TemplateIcon size={19} />}
        />
        <NavItem
          href="/reference"
          label="Reference"
          icon={<BookIcon size={19} />}
        />
        <NavItem
          href="/shared"
          label="Shared with me"
          icon={<ShareIcon size={19} />}
        />
        <NavItem
          href="/trash"
          label="Trash"
          icon={<TrashIcon size={19} />}
          disabled
        />
      </div>

      {/* Projects */}
      <div className="mt-[18px] px-2.5">
        <div className="mb-2.5 text-11 font-semibold uppercase tracking-[0.08em] text-muted">
          Projects
        </div>
        {projects.length === 0 ? (
          <p className="text-[12.5px] leading-snug text-muted">
            No projects yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.slice(0, 6).map((project, i) => (
              <div
                key={project.id}
                className="flex cursor-pointer items-center gap-[9px] text-[12.5px] leading-tight text-muted"
              >
                <span
                  className="h-[7px] w-[7px] flex-none rounded-[2px]"
                  style={{ background: DOT_COLORS[i % DOT_COLORS.length] }}
                />
                <span className="truncate">{project.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workspace + user cards */}
      <div className="mt-auto flex flex-col gap-2 border-t border-hairline pt-3.5">
        <WorkspaceSwitcher
          current={{ id: activeWorkspace.id, name: activeWorkspace.name }}
          workspaces={workspaces}
          subtitle={subtitle}
        />
        <UserMenu name={user.name} email={user.email} canAdmin={canAdmin} />
      </div>
    </nav>
  );
}
