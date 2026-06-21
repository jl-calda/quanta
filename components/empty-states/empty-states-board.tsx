import { Button } from "@/components/ds";
import { EmptyStateCard } from "./empty-state-card";
import { SPOT_ICONS } from "./spot-icons";
import { LinkButton, NewWorksheetAction } from "./card-actions";
import { ConnectionCard } from "./connection-card";

/**
 * The board (Mockup 4.12) — one pattern across eight contexts. Server-rendered
 * orchestration: it lays out the responsive grid and threads the request-scoped
 * context (active workspace, role, most-recent worksheet) into each card's
 * action. Interactivity lives in the leaf client components.
 *
 * Contextless actions (versions / AI / recalculate need a worksheet) resolve to
 * the most-recent worksheet, falling back to the file browser, and create routes
 * to sign-in when signed out — never a dead end.
 */
export function EmptyStatesBoard({
  workspaceId,
  canCreate,
  recentWorksheetId,
}: {
  workspaceId: string | null;
  canCreate: boolean;
  recentWorksheetId: string | null;
}) {
  const worksheetHref = recentWorksheetId
    ? `/w/${recentWorksheetId}`
    : "/worksheets";
  const historyHref = recentWorksheetId
    ? `/w/${recentWorksheetId}/history`
    : "/worksheets";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
        gap: 20,
      }}
    >
      <EmptyStateCard
        index={1}
        ctx="Worksheets"
        tone="accent"
        icon={SPOT_ICONS.worksheet}
        headline="Create your first worksheet"
        body="Write calculations that render as textbook math, track units, and recalculate the moment a value changes."
      >
        <NewWorksheetAction workspaceId={workspaceId} canCreate={canCreate} />
        <LinkButton href="/templates" variant="ghost">
          Browse templates
        </LinkButton>
      </EmptyStateCard>

      <EmptyStateCard
        index={2}
        ctx="Folder"
        tone="neutral"
        icon={SPOT_ICONS.folder}
        headline="This folder is empty"
        body="Add a worksheet here, or import an existing .xlsx or Mathcad file to get started."
      >
        <NewWorksheetAction workspaceId={workspaceId} canCreate={canCreate} />
        <Button variant="ghost" disabled title="Coming soon">
          Import a file
        </Button>
      </EmptyStateCard>

      <EmptyStateCard
        index={3}
        ctx="Search"
        tone="neutral"
        icon={SPOT_ICONS.search}
        headline={"No matches for “anchor pull-back”"}
        body="Check the spelling, or clear the filters to widen the search across all projects."
      >
        <LinkButton href="/worksheets" variant="secondary">
          Clear filters
        </LinkButton>
      </EmptyStateCard>

      <EmptyStateCard
        index={4}
        ctx="Shared"
        tone="neutral"
        icon={SPOT_ICONS.share}
        headline="Nothing shared with you yet"
        body="When a colleague shares a worksheet or project, it will appear here."
      >
        <LinkButton href="/admin" variant="secondary">
          Invite a colleague
        </LinkButton>
      </EmptyStateCard>

      <EmptyStateCard
        index={5}
        ctx="Version history"
        tone="neutral"
        icon={SPOT_ICONS.history}
        headline="No earlier versions yet"
        body="Versions are saved automatically as you work, so you can always step back."
      >
        <LinkButton href={historyHref} variant="secondary">
          Name current version
        </LinkButton>
      </EmptyStateCard>

      <EmptyStateCard
        index={6}
        ctx="AI assistant"
        tone="accent"
        icon={SPOT_ICONS.sparkle}
        headline="Ask Quanta to draft, check, or explain"
        body="Describe a calculation in plain words, or ask why a result flags. Quanta keeps the units honest."
      >
        <LinkButton href={worksheetHref} variant="primary">
          Ask Quanta
        </LinkButton>
      </EmptyStateCard>

      <ConnectionCard index={7} />

      <EmptyStateCard
        index={8}
        ctx="Calc errors"
        tone="pass"
        icon={SPOT_ICONS.ok}
        headline="No errors — all regions are current"
        body="Every region evaluated cleanly with consistent units. Nothing needs your attention."
      >
        <LinkButton href={worksheetHref} variant="secondary">
          Recalculate
        </LinkButton>
      </EmptyStateCard>
    </div>
  );
}
