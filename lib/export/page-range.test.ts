import { describe, expect, it } from "vitest";
import { parsePageRange, toPdfPageRanges } from "./page-range";

describe("parsePageRange", () => {
  it("returns all pages for a blank spec", () => {
    expect(parsePageRange("", 3)).toEqual([1, 2, 3]);
    expect(parsePageRange("   ", 2)).toEqual([1, 2]);
  });

  it("parses ranges and singletons, sorted and de-duped", () => {
    expect(parsePageRange("1-3, 5", 6)).toEqual([1, 2, 3, 5]);
    expect(parsePageRange("5, 1, 1", 6)).toEqual([1, 5]);
  });

  it("accepts en-dash and em-dash separators", () => {
    expect(parsePageRange("1–3", 5)).toEqual([1, 2, 3]);
    expect(parsePageRange("2—4", 5)).toEqual([2, 3, 4]);
  });

  it("normalizes reversed ranges and clamps to bounds", () => {
    expect(parsePageRange("3-1", 5)).toEqual([1, 2, 3]);
    expect(parsePageRange("4-99", 5)).toEqual([4, 5]);
    expect(parsePageRange("0-2", 5)).toEqual([1, 2]);
  });

  it("ignores stray tokens but keeps the valid ones", () => {
    expect(parsePageRange("2, foo, 4", 5)).toEqual([2, 4]);
  });

  it("falls back to all pages when nothing parses", () => {
    expect(parsePageRange("foo, bar", 3)).toEqual([1, 2, 3]);
    expect(parsePageRange("99", 3)).toEqual([1, 2, 3]);
  });

  it("returns empty for a zero-page document", () => {
    expect(parsePageRange("1-3", 0)).toEqual([]);
  });
});

describe("toPdfPageRanges", () => {
  it("is empty when every page is selected", () => {
    expect(toPdfPageRanges("", 3)).toBe("");
    expect(toPdfPageRanges("1-3", 3)).toBe("");
  });

  it("collapses runs into compact ranges", () => {
    expect(toPdfPageRanges("1-3, 5", 6)).toBe("1-3, 5");
    expect(toPdfPageRanges("2, 4, 5, 6", 8)).toBe("2, 4-6");
  });
});
