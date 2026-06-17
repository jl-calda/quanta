/**
 * Region-level worksheet diff (pure). Version history compares two content trees
 * by region **id** + a stable content **hash**, classifying each region as
 * added / removed / changed / same (Functional Brief §4.9). Kept pure and
 * deterministic — identical on client and server — and unit-tested like the rest
 * of `/lib`.
 */
import { walkRegions } from "./flatten";
import type { Region, WorksheetContent } from "./content";

export type DiffStatus = "added" | "removed" | "changed" | "same";

/**
 * A stable content hash of a region's *own* fields. For an `area` we drop the
 * nested `regions` array: children are diffed independently (walkRegions yields
 * them separately), so editing a child must not also mark its container changed.
 */
export function hashRegion(region: Region): string {
  const clone: Record<string, unknown> = { ...(region as Record<string, unknown>) };
  if (region.type === "area") delete clone.regions;
  return stableStringify(clone);
}

/** Deterministic JSON: object keys sorted recursively, so key order never matters. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(obj)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
      .join(",") +
    "}"
  );
}

/** Index every region by id, in reading order (descending into areas). */
function indexRegions(content: WorksheetContent | null): Map<string, Region> {
  const map = new Map<string, Region>();
  if (!content) return map;
  for (const region of walkRegions(content)) map.set(region.id, region);
  return map;
}

/**
 * Region-level diff of two content trees, keyed by region id:
 *  - `added`   — present in `next` only
 *  - `removed` — present in `prev` only
 *  - `changed` — present in both, but the region's own content hash differs
 *  - `same`    — present in both, identical
 *
 * `prev` is the older reference; `next` is the snapshot being shown.
 */
export function diffContents(
  prev: WorksheetContent | null,
  next: WorksheetContent | null,
): Map<string, DiffStatus> {
  const out = new Map<string, DiffStatus>();
  const prevMap = indexRegions(prev);
  const nextMap = indexRegions(next);

  for (const [id, region] of nextMap) {
    const before = prevMap.get(id);
    if (!before) out.set(id, "added");
    else out.set(id, hashRegion(before) === hashRegion(region) ? "same" : "changed");
  }
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) out.set(id, "removed");
  }
  return out;
}

export interface DiffSummary {
  changed: number;
  added: number;
  removed: number;
}

/** Count regions by change kind (ignores `same`). */
export function summarizeDiff(diff: Map<string, DiffStatus>): DiffSummary {
  let changed = 0;
  let added = 0;
  let removed = 0;
  for (const status of diff.values()) {
    if (status === "changed") changed += 1;
    else if (status === "added") added += 1;
    else if (status === "removed") removed += 1;
  }
  return { changed, added, removed };
}

/** Human summary in the app's voice, e.g. "2 changed, 1 added". */
export function formatSummary(summary: DiffSummary): string {
  const parts: string[] = [];
  if (summary.changed) parts.push(`${summary.changed} changed`);
  if (summary.added) parts.push(`${summary.added} added`);
  if (summary.removed) parts.push(`${summary.removed} removed`);
  return parts.length ? parts.join(", ") : "No region changes";
}
