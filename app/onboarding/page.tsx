import { redirect } from "next/navigation";
import { getCurrentUser, getMyWorkspaces } from "@/server/queries/workspace";
import { CreateWorkspaceForm } from "@/components/onboarding/create-workspace-form";

export const metadata = { title: "Create workspace · Quanta" };

/**
 * First-run workspace creation (§4.1). The sign-up trigger usually bootstraps a
 * workspace already, so most users skip straight past this — if they land here
 * with a workspace, send them on.
 */
export default async function OnboardingPage() {
  const [user, workspaces] = await Promise.all([
    getCurrentUser(),
    getMyWorkspaces(),
  ]);

  if (workspaces.length > 0) {
    redirect("/app");
  }

  const suggestedName = user?.profile?.full_name
    ? `${user.profile.full_name}'s workspace`
    : "";

  return (
    <main className="q-grid flex flex-1 items-center justify-center bg-paper px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col gap-1">
          <span className="q-eyebrow">Welcome</span>
          <h1 className="text-28 font-semibold tracking-[-0.01em] text-ink">
            Create your workspace
          </h1>
          <p className="text-13 text-muted">
            A workspace holds your projects, worksheets, and team. You can rename
            it or add teammates later.
          </p>
        </header>
        <div className="rounded-lg border border-hairline bg-raised p-6 shadow-[var(--shadow-sm)]">
          <CreateWorkspaceForm defaultName={suggestedName} />
        </div>
      </div>
    </main>
  );
}
