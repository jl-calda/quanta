import { describe, expect, it } from "vitest";
import {
  fmtUses,
  variantFor,
  initialsOf,
  isArchived,
  isActive,
  sortFeaturedFirst,
} from "./format";

describe("fmtUses", () => {
  it("formats thousands compactly, trimming a trailing .0", () => {
    expect(fmtUses(4820)).toBe("4.8k");
    expect(fmtUses(9120)).toBe("9.1k");
    expect(fmtUses(2000)).toBe("2k");
  });

  it("leaves sub-1000 counts as plain integers", () => {
    expect(fmtUses(612)).toBe("612");
    expect(fmtUses(0)).toBe("0");
    expect(fmtUses(999)).toBe("999");
  });
});

describe("variantFor", () => {
  it("is stable for a given seed and within 0..7", () => {
    const a = variantFor("template-abc");
    expect(a).toBe(variantFor("template-abc"));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(8);
  });

  it("defaults to 0 with no seed", () => {
    expect(variantFor(undefined)).toBe(0);
  });
});

describe("initialsOf", () => {
  it("derives up to two uppercase initials", () => {
    expect(initialsOf("M. Okafor")).toBe("MO");
    expect(initialsOf("Nadia Brunel")).toBe("NB");
    expect(initialsOf("Quanta")).toBe("Q");
  });
});

describe("isArchived / isActive", () => {
  it("treats a non-null archived_at as archived", () => {
    expect(isArchived({ archived_at: "2026-06-25T00:00:00Z" })).toBe(true);
    expect(isActive({ archived_at: "2026-06-25T00:00:00Z" })).toBe(false);
  });

  it("treats a null archived_at as active", () => {
    expect(isArchived({ archived_at: null })).toBe(false);
    expect(isActive({ archived_at: null })).toBe(true);
  });
});

describe("sortFeaturedFirst", () => {
  const t = (
    is_featured: boolean,
    usage_count: number,
    created_at?: string,
  ) => ({ is_featured, usage_count, created_at });

  it("floats featured templates ahead of non-featured ones", () => {
    expect(sortFeaturedFirst(t(true, 1), t(false, 999))).toBeLessThan(0);
    expect(sortFeaturedFirst(t(false, 999), t(true, 1))).toBeGreaterThan(0);
  });

  it("breaks ties by usage (most used first), then recency", () => {
    expect(sortFeaturedFirst(t(true, 50), t(true, 10))).toBeLessThan(0);
    expect(
      sortFeaturedFirst(
        t(true, 10, "2026-06-25T00:00:00Z"),
        t(true, 10, "2026-01-01T00:00:00Z"),
      ),
    ).toBeLessThan(0);
  });

  it("sorts a mixed list featured-first deterministically", () => {
    const rows = [
      t(false, 100),
      t(true, 5),
      t(true, 80),
      t(false, 300),
    ];
    const ordered = [...rows].sort(sortFeaturedFirst);
    expect(ordered.map((r) => r.usage_count)).toEqual([80, 5, 300, 100]);
  });
});
