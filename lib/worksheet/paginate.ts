/**
 * Page pagination (pure) — the shared decision behind "the export preview matches
 * the PDF". Given a reading-order list of atomic block heights plus the hard page
 * breaks, it assigns each block to a page exactly the way the print engine flows
 * the document: a block never splits across a page, and a hard break forces the
 * next block onto a fresh page.
 *
 * It is deliberately dependency-free (no React, no DOM, no Node globals, no page
 * geometry of its own) so it is identical wherever it runs and trivially unit-
 * tested. Callers supply the content height of one page; page geometry comes from
 * `lib/export/options.ts` (`pageBox` − chrome − margins) at the call site, never
 * here.
 */

export interface PageBlock {
  /** Measured layout height of the block, in px (includes its inter-block gap). */
  height: number;
  /** Force a new page before this block (a row's hard page break). */
  breakBefore?: boolean;
}

export interface PaginateResult {
  /** 0-based page index for each input block, parallel to the input array. */
  pageOfBlock: number[];
  /** Number of pages (always ≥ 1). */
  pageCount: number;
}

/**
 * Assign blocks to pages.
 *
 * Walking in reading order, a new page starts before a block when the current
 * page already holds something AND either the block carries a hard break or it
 * would overflow the page. The very first block never breaks (nothing precedes
 * page 1, so a stray `breakBefore` on index 0 is ignored). A block taller than a
 * whole page starts on a fresh page and then overflows it — the following block
 * breaks onto the next page — mirroring an un-splittable region in the print
 * engine. An empty list still reports one (blank) page.
 */
export function paginateBlocks(blocks: PageBlock[], pageHeight: number): PaginateResult {
  // A non-positive page height would loop forever on the overflow rule; treat it
  // as "everything on one page" rather than throw into the render path.
  const usablePage = pageHeight > 0 ? pageHeight : Infinity;
  const pageOfBlock: number[] = [];
  let page = 0;
  let used = 0; // height consumed on the current page

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const forceBreak = !!block.breakBefore && i > 0;
    if (used > 0 && (forceBreak || used + block.height > usablePage)) {
      page += 1;
      used = 0;
    }
    pageOfBlock.push(page);
    // Even an oversized block counts as "used"; the next block then breaks past
    // it onto a new page, so the oversized one keeps its own page.
    used += block.height;
  }

  return { pageOfBlock, pageCount: blocks.length > 0 ? page + 1 : 1 };
}
