import { redirect } from "next/navigation";
import { getActiveWorkspace, getCurrentUser } from "@/server/queries/workspace";
import { signOut } from "@/server/actions/auth";

export const metadata = { title: "Home · Quanta" };

/**
 * Authenticated landing. Middleware guarantees a session here; if the user has
 * no workspace yet, send them to onboarding. The full dashboard (§4.2) builds on
 * this in a later milestone — for now it confirms the data layer end to end.
 */
export default async function AppHomePage() {
  const [user, active] = await Promise.all([
    getCurrentUser(),
    getActiveWorkspace(),
  ]);

  if (!active) {
    redirect("/onboarding");
  }

  const { workspace, role } = active;

  return (
    <main className="q-grid flex-1 bg-paper px-6 py-[var(--d-section)]">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="q-eyebrow">Workspace</span>
            <h1 className="text-28 font-semibold tracking-[-0.01em] text-ink">
              {workspace.name}
            </h1>
            <p className="text-13 text-muted">
              Signed in as {user?.profile?.full_name ?? user?.email} ·{" "}
              <span className="text-ink">{role}</span>
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-sm border border-strong bg-raised px-3 text-13 font-medium text-ink outline-none transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="rounded-md border border-hairline bg-chrome p-[var(--d-card-pad)]">
          <span className="q-eyebrow">Data layer · M1</span>
          <p className="mt-2 max-w-prose text-13 text-muted">
            Authentication, the multi-tenant schema, row-level security, and the
            profile + first-workspace bootstrap are in place. The dashboard,
            file browser, and editor build on this foundation next.
          </p>
        </section>
      </div>
    </main>
  );
}
