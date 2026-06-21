import Link from "next/link";
import { IconButton } from "@/components/ds";
import { StatusChip } from "./status-chip";
import { FolderIcon, SheetIcon, KebabIcon } from "./icons";
import { relativeTime, initials } from "./format";
import type {
  ProjectSummary,
  RecentWorksheet,
} from "@/server/queries/dashboard";

const GRID = "grid-cols-[1fr_168px_150px_160px_116px_40px]";

type Row =
  | {
      kind: "folder";
      id: string;
      name: string;
      ownerId: string | null;
      modified: string;
    }
  | {
      kind: "sheet";
      id: string;
      name: string;
      project: string;
      ownerId: string | null;
      status: RecentWorksheet["calc_status"];
      modified: string;
    };

function OwnerCell({
  ownerId,
  currentUserId,
  currentUserName,
}: {
  ownerId: string | null;
  currentUserId: string;
  currentUserName: string;
}) {
  const isMe = ownerId === currentUserId;
  const label = isMe ? "You" : "Member";
  const badge = isMe ? initials(currentUserName) : "–";
  return (
    <span className="flex items-center gap-2 text-[12.5px] text-ink">
      <span
        className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[10px] font-semibold text-inverse"
        style={{ background: isMe ? "var(--accent)" : "var(--text-muted)" }}
      >
        {badge}
      </span>
      {label}
    </span>
  );
}

/**
 * "Your projects" table — a reading-order list mixing project folders and recent
 * worksheets, with owner, live calc status, and last-modified. Sheet rows link
 * to the editor.
 */
export function ProjectsTable({
  projects,
  worksheets,
  projectNames,
  currentUserId,
  currentUserName,
}: {
  projects: ProjectSummary[];
  worksheets: RecentWorksheet[];
  projectNames: Record<string, string>;
  currentUserId: string;
  currentUserName: string;
}) {
  const rows: Row[] = [
    ...projects.map(
      (p): Row => ({
        kind: "folder",
        id: p.id,
        name: p.name,
        ownerId: p.created_by,
        modified: relativeTime(p.created_at),
      }),
    ),
    ...worksheets.map(
      (w): Row => ({
        kind: "sheet",
        id: w.id,
        name: w.title,
        project: w.project_id ? (projectNames[w.project_id] ?? "—") : "—",
        ownerId: w.owner_id,
        status: w.calc_status,
        modified: relativeTime(w.updated_at),
      }),
    ),
  ].slice(0, 8);

  return (
    <div className="overflow-hidden rounded-md border border-hairline bg-raised">
      {/* Header */}
      <div
        className={`grid ${GRID} gap-4 border-b border-hairline bg-chrome px-[var(--d-row-x)] py-[var(--d-row-y)] text-11 font-semibold uppercase tracking-[0.06em] text-muted`}
      >
        <span>Name</span>
        <span>Project</span>
        <span>Owner</span>
        <span>Calc status</span>
        <span>Modified</span>
        <span />
      </div>

      {/* Rows */}
      {rows.map((row, i) => (
        <div
          key={`${row.kind}-${row.id}`}
          className={`row-hover grid ${GRID} items-center gap-4 px-[var(--d-row-x)] py-[var(--d-row-y)] ${
            i < rows.length - 1 ? "border-b border-hairline" : ""
          }`}
        >
          {/* Name */}
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex flex-none text-muted">
              {row.kind === "folder" ? (
                <FolderIcon size={18} />
              ) : (
                <SheetIcon size={18} />
              )}
            </span>
            {row.kind === "sheet" ? (
              <Link
                href={`/w/${row.id}`}
                className="truncate text-13 text-ink hover:text-link hover:underline"
              >
                {row.name}
              </Link>
            ) : (
              <span className="truncate text-13 font-medium text-ink">
                {row.name}
              </span>
            )}
          </span>

          {/* Project */}
          <span className="truncate text-[12.5px] text-muted">
            {row.kind === "sheet" ? row.project : "—"}
          </span>

          {/* Owner */}
          <OwnerCell
            ownerId={row.ownerId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />

          {/* Calc status */}
          <span>
            {row.kind === "sheet" ? (
              <StatusChip status={row.status} />
            ) : (
              <span className="text-[12.5px] text-muted">—</span>
            )}
          </span>

          {/* Modified */}
          <span className="text-[12.5px] text-muted">{row.modified}</span>

          {/* Actions */}
          <span className="flex justify-end">
            <IconButton label="More actions" variant="ghost" size="sm">
              <KebabIcon size={16} />
            </IconButton>
          </span>
        </div>
      ))}
    </div>
  );
}
