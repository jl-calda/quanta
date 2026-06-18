/**
 * Outline model (Func 5.3) — pure and deterministic.
 *
 * Builds the left-panel "Outline" tab from the worksheet content tree: text-region
 * headings (H1–H3) become numbered sections, and any tagged region becomes a leaf
 * entry beneath its nearest section. Section numbers are auto-assigned in reading
 * order (1, 1.1, 1.1.1, 2, …) the way a document table of contents numbers itself.
 * No React, no engine results — just the structure, so it's trivially unit-tested.
 */
import { walkRegions } from "./flatten";
import type { WorksheetContent } from "./content";

export interface OutlineItem {
  /** The region id this entry points at (for select + scroll-to). */
  id: string;
  /** Display label: the heading text, or the tagged region's tag. */
  label: string;
  /** 0-based depth: heading 1 → 0, heading 2 → 1, heading 3 → 2; tags sit one deeper. */
  level: number;
  /** Hierarchical section number ("1", "1.1", …), or null for a tagged leaf. */
  number: string | null;
  /** For tagged (non-heading) entries: the region type, shown as a small badge. */
  tag?: string;
  isHeading: boolean;
}

/**
 * Advance the section-number counters for a heading at `level` (0-based) and
 * return its dotted number. Mutates `counters` in place. Deeper levels are
 * dropped when the outline steps back out; a sparse start (e.g. a first heading
 * at level 2) pads missing ancestors with `1` so the number still reads sensibly.
 */
function nextNumber(counters: number[], level: number): string {
  counters.length = Math.min(counters.length, level + 1); // drop deeper levels
  while (counters.length < level) counters.push(1); // pad missing ancestors
  if (counters.length === level) counters.push(0); // open this level's slot
  counters[level] += 1;
  return counters.join(".");
}

/** Build the outline (headings + tagged regions) in reading order. */
export function buildOutline(content: WorksheetContent): OutlineItem[] {
  const items: OutlineItem[] = [];
  const counters: number[] = [];
  let lastHeadingLevel = -1;

  for (const region of walkRegions(content)) {
    if (region.type === "text" && region.heading) {
      const level = region.heading - 1;
      lastHeadingLevel = level;
      items.push({
        id: region.id,
        label: region.text.trim() || "Untitled heading",
        level,
        number: nextNumber(counters, level),
        isHeading: true,
      });
    } else if (region.tag) {
      items.push({
        id: region.id,
        label: region.tag,
        level: Math.max(0, lastHeadingLevel + 1),
        number: null,
        tag: region.type,
        isHeading: false,
      });
    }
  }

  return items;
}
