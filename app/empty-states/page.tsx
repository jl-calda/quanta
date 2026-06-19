import { QuantaMark } from "@/components/quanta-mark";
import { EmptyStatesBoard } from "@/components/empty-states/empty-states-board";
import { getActiveWorkspace } from "@/server/queries/workspace";
import { getRecentWorksheets } from "@/server/queries/dashboard";
import type { WorkspaceRole } from "@/lib/supabase/types";

/**
 * /empty-states — the Empty states board (Mockup 4.12), a public catalogue page
 * sibling to /design. It ports the Claude Design mockup faithfully and wires each
 * card's action to real behavior: signed in it resolves the active workspace,
 * role and most-recent worksheet so the cards operate; signed out the actions
 * route to sign-in / the file browser (never a dead end).
 */

export const metadata = {
  title: "Quanta — Empty states",
};

const CAN_CREATE_ROLES: WorkspaceRole[] = ["owner", "admin", "engineer"];

export default async function EmptyStatesPage() {
  let workspaceId: string | null = null;
  let canCreate = false;
  let recentWorksheetId: string | null = null;
  try {
    const active = await getActiveWorkspace();
    workspaceId = active?.workspace.id ?? null;
    canCreate = active ? CAN_CREATE_ROLES.includes(active.role) : false;
    if (workspaceId) {
      const recents = await getRecentWorksheets(workspaceId, 1);
      recentWorksheetId = recents[0]?.id ?? null;
    }
  } catch {
    // No Supabase env (the scaffold runs without it) or a transient read
    // failure → render the public, signed-out board; actions route to sign-in.
  }

  return (
    <main className="min-h-screen bg-chrome">
      <header
        style={{
          padding: "40px 48px 26px",
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            marginBottom: 14,
          }}
        >
          <QuantaMark size={26} className="text-accent" />
          <span className="q-eyebrow">Quanta · Empty states</span>
        </div>
        <h1
          style={{
            margin: 0,
            font: "600 26px/1.2 var(--font-sans)",
            letterSpacing: "-0.015em",
            color: "var(--text-primary)",
          }}
        >
          Empty states
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            font: "14px/1.6 var(--font-sans)",
            color: "var(--text-muted)",
            maxWidth: 600,
          }}
        >
          One pattern, eight contexts: a thin-line spot icon, a plain-spoken
          headline, a single supporting line in the app’s voice, and exactly one
          primary action. An invitation to act — never a dead end.
        </p>
      </header>
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
          padding: "0 48px 56px",
        }}
      >
        <EmptyStatesBoard
          workspaceId={workspaceId}
          canCreate={canCreate}
          recentWorksheetId={recentWorksheetId}
        />
      </div>
    </main>
  );
}
