import { describe, expect, it } from "vitest";
import { paginateBlocks, type PageBlock } from "./paginate";

const h = (...heights: number[]): PageBlock[] => heights.map((height) => ({ height }));

describe("paginateBlocks — no-break baseline", () => {
  it("keeps everything that fits on one page", () => {
    const { pageOfBlock, pageCount } = paginateBlocks(h(100, 100, 100), 1000);
    expect(pageOfBlock).toEqual([0, 0, 0]);
    expect(pageCount).toBe(1);
  });

  it("flows to a new page when a block would overflow", () => {
    // 400 + 400 fit (800 ≤ 1000); the third (400) would make 1200 > 1000 → page 2.
    const { pageOfBlock, pageCount } = paginateBlocks(h(400, 400, 400), 1000);
    expect(pageOfBlock).toEqual([0, 0, 1]);
    expect(pageCount).toBe(2);
  });

  it("packs across several pages at the right boundaries", () => {
    const { pageOfBlock, pageCount } = paginateBlocks(h(600, 600, 600, 600), 1000);
    // 600 | 600+600>1000 → 600 | 600+600>1000 → 600 | 600 ...
    expect(pageOfBlock).toEqual([0, 1, 2, 3]);
    expect(pageCount).toBe(4);
  });

  it("reports a single page for an empty document", () => {
    expect(paginateBlocks([], 1000)).toEqual({ pageOfBlock: [], pageCount: 1 });
  });
});

describe("paginateBlocks — hard breaks", () => {
  it("forces the flagged block (and everything after) onto a new page", () => {
    const blocks: PageBlock[] = [
      { height: 100 },
      { height: 100, breakBefore: true },
      { height: 100 },
    ];
    const { pageOfBlock, pageCount } = paginateBlocks(blocks, 1000);
    expect(pageOfBlock).toEqual([0, 1, 1]);
    expect(pageCount).toBe(2);
  });

  it("ignores a break on the very first block (nothing precedes page 1)", () => {
    const blocks: PageBlock[] = [{ height: 100, breakBefore: true }, { height: 100 }];
    const { pageOfBlock, pageCount } = paginateBlocks(blocks, 1000);
    expect(pageOfBlock).toEqual([0, 0]);
    expect(pageCount).toBe(1);
  });
});

describe("paginateBlocks — region taller than a page", () => {
  it("gives an oversized block its own page, then breaks the next block past it", () => {
    // 100 fits; the 1500 block overflows but starts fresh (page 1); 100 → page 2.
    const { pageOfBlock, pageCount } = paginateBlocks(h(100, 1500, 100), 1000);
    expect(pageOfBlock).toEqual([0, 1, 2]);
    expect(pageCount).toBe(3);
  });

  it("keeps an oversized first block on page 0 (it overflows in place)", () => {
    const { pageOfBlock, pageCount } = paginateBlocks(h(1500, 100), 1000);
    expect(pageOfBlock).toEqual([0, 1]);
    expect(pageCount).toBe(2);
  });
});
