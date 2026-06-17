import type { WorksheetContent } from "@/lib/worksheet/content";

/** Display identity for a timeline avatar / byline. */
export interface VersionAuthor {
  name: string;
  initials: string;
  color: string;
}

/** A row in the version timeline — a saved version, or the live "Current draft". */
export interface TimelineEntry {
  /** Version id, or `CURRENT_ID` for the live working copy. */
  id: string;
  isCurrent: boolean;
  /** User-given name, if any. */
  label: string | null;
  /** Relation/kind line, e.g. "Current draft" / "Saved version". */
  rel: string;
  content: WorksheetContent;
  /** Timestamp formatted on the server (avoids client/server hydration drift). */
  timeLabel: string;
  author: VersionAuthor;
}

/** Sentinel id for the synthetic "Current draft" entry (the live worksheet). */
export const CURRENT_ID = "current";
