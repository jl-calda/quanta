/**
 * Reference catalog search & filtering — pure, deterministic, UI-agnostic.
 *
 * Matches the mockup's behaviour: a non-empty query does a case-insensitive
 * substring match across name + signature + description + tag; an empty query
 * falls back to the items of the selected category.
 */
import type { ReferenceItem } from "./types";
import { ALL } from "./tree";

/** Full-text search across name + sig + desc + tag (case-insensitive). */
export function searchItems(query: string): ReferenceItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL.filter((it) =>
    `${it.name} ${it.sig} ${it.desc} ${it.tag}`.toLowerCase().includes(q),
  );
}

/** Items in a subcategory, in catalog order. */
export function itemsInCategory(cat: string): ReferenceItem[] {
  return ALL.filter((it) => it.cat === cat);
}

export interface HighlightSplit {
  pre: string;
  match: string;
  post: string;
}

/**
 * Split `text` around the first case-insensitive occurrence of `query`, for the
 * `<mark>` highlight in the result list. Returns `null` when there is no match
 * (or no query) so callers can render the text unchanged.
 */
export function highlightMatch(text: string, query: string): HighlightSplit | null {
  const q = query.trim();
  if (!q) return null;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return null;
  return {
    pre: text.slice(0, i),
    match: text.slice(i, i + q.length),
    post: text.slice(i + q.length),
  };
}
