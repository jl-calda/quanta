import { SearchBar } from "./search-bar";
import { NewWorksheetButton } from "./new-worksheet-button";

/**
 * Dashboard top bar (72px): greeting + workspace summary on the left, global
 * search centered, and the "New worksheet" split-button on the right. The
 * greeting is computed server-side and passed in to avoid a hydration mismatch.
 */
export function TopBar({
  greeting,
  firstName,
  workspaceName,
  projectCount,
  workspaceId,
  canCreate,
}: {
  greeting: string;
  firstName: string;
  workspaceName: string;
  projectCount: number;
  workspaceId: string;
  canCreate: boolean;
}) {
  return (
    <header className="flex h-[72px] flex-none items-center gap-6 border-b border-hairline bg-paper px-8">
      <div className="min-w-[200px] flex-none">
        <div className="text-[18px] font-semibold leading-tight tracking-[-0.01em] text-ink">
          {greeting}, {firstName}
        </div>
        <div className="mt-0.5 text-[12.5px] leading-snug text-muted">
          {workspaceName} · {projectCount}{" "}
          {projectCount === 1 ? "project" : "projects"}
        </div>
      </div>

      <div className="flex flex-1 justify-center">
        <SearchBar workspaceId={workspaceId} />
      </div>

      <div className="flex flex-none items-center gap-3.5">
        <NewWorksheetButton workspaceId={workspaceId} canCreate={canCreate} />
      </div>
    </header>
  );
}
