/**
 * Pure helpers for the template gallery — kept dependency-free so they're unit
 * testable and safe to share across server/client components.
 */

/** Compact "uses" count: 4820 → "4.8k", 612 → "612". */
export function fmtUses(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

/** Stable hash of a template id → one of the 8 thumbnail variants (0..7). */
export function variantFor(seed: string | undefined): number {
  if (!seed) return 0;
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return sum % 8;
}

/** Initials for a community author byline ("M. Okafor" → "MO"). */
export function initialsOf(name: string): string {
  return name
    .replace(/[^A-Za-z. ]/g, "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** A template is archived once it carries an `archived_at` timestamp; restoring
 * clears it back to null. */
export function isArchived(t: { archived_at: string | null }): boolean {
  return t.archived_at != null;
}

/** The complement of {@link isArchived} — i.e. lives in the active gallery. */
export function isActive(t: { archived_at: string | null }): boolean {
  return !isArchived(t);
}

/** Gallery ordering — featured first, then most-used, then newest. Mirrors the
 * SQL order `listTemplates` applies, kept here so the precedence is pinned and
 * any client-side re-sort stays consistent with the server. */
export function sortFeaturedFirst<
  T extends {
    is_featured: boolean;
    usage_count: number;
    created_at?: string | null;
  },
>(a: T, b: T): number {
  if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
  if (a.usage_count !== b.usage_count) return b.usage_count - a.usage_count;
  return (b.created_at ?? "").localeCompare(a.created_at ?? "");
}
