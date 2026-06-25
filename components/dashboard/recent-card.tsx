import Link from "next/link";
import { ContentSnapshot } from "@/components/editor/content-snapshot";
import { MiniPreview } from "./mini-preview";
import { StatusChip } from "./status-chip";
import { ClockIcon } from "./icons";
import { relativeTime } from "./format";
import type { RecentWorksheet } from "@/server/queries/dashboard";

/**
 * A "Continue working" card: a rendered-math thumbnail of the worksheet, its
 * title, project, last-edited time, and a live calc-status chip. Links to the
 * editor.
 */
export function RecentCard({
  worksheet,
  projectName,
}: {
  worksheet: RecentWorksheet;
  projectName?: string;
}) {
  return (
    <Link
      href={`/w/${worksheet.id}`}
      className="card-lift flex flex-col overflow-hidden rounded-md border border-hairline bg-raised"
    >
      <div className="relative border-b border-hairline" style={{ height: "var(--d-thumb)" }}>
        <ContentSnapshot
          content={worksheet.content}
          fallback={<MiniPreview seed={worksheet.id} />}
          scale={0.42}
          padding={10}
        />
        {/* Bottom fade into the card body, per the mockup. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 60%, var(--surface-raised))",
          }}
        />
      </div>

      <div className="px-3.5 pb-[13px] pt-3">
        <div
          className="text-[13.5px] font-semibold leading-snug text-ink"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 36,
          }}
        >
          {worksheet.title}
        </div>

        {projectName && (
          <span className="mt-1.5 inline-flex max-w-full items-center truncate rounded-sm border border-hairline bg-chrome px-1.5 py-[3px] text-11 text-muted">
            {projectName}
          </span>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-11 text-muted">
            <ClockIcon size={13} />
            {relativeTime(worksheet.updated_at)}
          </span>
          <StatusChip status={worksheet.calc_status} />
        </div>
      </div>
    </Link>
  );
}
