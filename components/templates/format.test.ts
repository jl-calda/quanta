import { describe, expect, it } from "vitest";
import { fmtUses, variantFor, initialsOf } from "./format";

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
