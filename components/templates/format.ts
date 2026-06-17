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
