/**
 * Page-range parsing for export (Functional Brief §4.10). Turns a Mathcad-style
 * range spec ("1-3, 5", en-dash or hyphen) into a sorted, de-duped, 1-based list
 * of page numbers clamped to `[1, total]`. An empty/blank spec means "all pages".
 * Pure and unit-tested; shared by the docx/xlsx filters and the PDF range mapper.
 */

/** All pages `1..total`. */
function allPages(total: number): number[] {
  return Array.from({ length: Math.max(0, total) }, (_, i) => i + 1);
}

/**
 * Parse a range spec into page numbers. Tolerant: unparsable tokens are skipped,
 * reversed ranges are normalized, out-of-bounds values are clamped. Returns all
 * pages when nothing usable parses (so an export never silently produces zero
 * pages from a typo).
 */
export function parsePageRange(spec: string, total: number): number[] {
  if (total <= 0) return [];
  const trimmed = (spec ?? "").trim();
  if (!trimmed) return allPages(total);

  const pages = new Set<number>();
  // Split on commas; tolerate hyphen, en-dash, or em-dash as the range separator.
  for (const rawPart of trimmed.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;
    const match = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (match) {
      let lo = Number(match[1]);
      let hi = Number(match[2]);
      if (lo > hi) [lo, hi] = [hi, lo];
      lo = Math.max(1, lo);
      hi = Math.min(total, hi);
      for (let p = lo; p <= hi; p += 1) pages.add(p);
      continue;
    }
    if (/^\d+$/.test(part)) {
      const p = Number(part);
      if (p >= 1 && p <= total) pages.add(p);
    }
    // Anything else (stray text) is ignored.
  }

  if (pages.size === 0) return allPages(total);
  return [...pages].sort((a, b) => a - b);
}

/**
 * Map a parsed page list back to Puppeteer's `pageRanges` string ("1-3, 5").
 * Empty/all ⇒ "" (Puppeteer prints every page). Collapses runs into ranges.
 */
export function toPdfPageRanges(spec: string, total: number): string {
  const pages = parsePageRange(spec, total);
  if (pages.length === 0 || pages.length === total) return "";

  const runs: string[] = [];
  let start = pages[0];
  let prev = pages[0];
  for (let i = 1; i <= pages.length; i += 1) {
    const cur = pages[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    runs.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = cur;
    prev = cur;
  }
  return runs.join(", ");
}
