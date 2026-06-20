import { describe, expect, it } from "vitest";
import { isSymbolic, type RegionResult } from "@/lib/calc";
import { parseContent, type SymbolicCache, type WorksheetContent } from "./content";
import { applySymbolicCache, symbolicCacheHash, SYMBOLIC_PLACEHOLDER } from "./symbolic-cache";

const SYM_SOURCE = "y := simplify((x^2-1)/(x-1))";

/** A worksheet with one symbolic math region, optionally carrying a cache. */
function sheet(cache?: SymbolicCache): WorksheetContent {
  return parseContent({
    version: 1,
    rows: [
      {
        id: "r1",
        columns: 1,
        cells: [{ regions: [{ id: "s1", type: "math", source: SYM_SOURCE, indent: 0, ...(cache ? { cache } : {}) }] }],
      },
    ],
  });
}

/** A minimal results map mirroring what the pure engine yields (a symbolic region errors). */
function results(): Map<string, RegionResult> {
  return new Map<string, RegionResult>([
    ["s1", { id: "s1", name: "y", value: undefined, formatted: "", tex: "", status: "error", error: { kind: "undefined", message: "Undefined symbol x" } }],
  ]);
}

function freshCache(): SymbolicCache {
  return { v: 1, hash: symbolicCacheHash(SYM_SOURCE), tex: "x + 1", value: "x + 1", computedAt: "2026-06-20T00:00:00Z" };
}

describe("isSymbolic", () => {
  it("detects CAS-callee regions and ignores plain math", () => {
    expect(isSymbolic(SYM_SOURCE)).toBe(true);
    expect(isSymbolic("integrate(x^2, x)")).toBe(true);
    expect(isSymbolic("phi := 0.67")).toBe(false);
    expect(isSymbolic("N_Rd := phi * F_t")).toBe(false);
    expect(isSymbolic("")).toBe(false);
  });
});

describe("symbolicCacheHash", () => {
  it("is stable, whitespace-insensitive, and source-sensitive", () => {
    expect(symbolicCacheHash(SYM_SOURCE)).toBe(symbolicCacheHash(SYM_SOURCE));
    expect(symbolicCacheHash("  " + SYM_SOURCE + "  ")).toBe(symbolicCacheHash(SYM_SOURCE));
    expect(symbolicCacheHash("y := simplify((x^2-4)/(x-2))")).not.toBe(symbolicCacheHash(SYM_SOURCE));
  });
});

describe("applySymbolicCache", () => {
  it("overlays a fresh cache as the result and clears the engine error", () => {
    const out = applySymbolicCache(sheet(freshCache()), results());
    const r = out.get("s1");
    expect(r?.tex).toBe("x + 1");
    expect(r?.status).toBe("current");
    expect(r?.error).toBeUndefined();
  });

  it("degrades a stale cache to the committed form + placeholder, never blank", () => {
    const stale: SymbolicCache = { ...freshCache(), hash: "deadbeef" };
    const r = applySymbolicCache(sheet(stale), results()).get("s1");
    expect(r?.tex).not.toBe("");
    expect(r?.formatted).toBe(SYMBOLIC_PLACEHOLDER);
    expect(r?.status).toBe("stale");
    expect(r?.error).toBeUndefined();
  });

  it("degrades an absent cache the same way", () => {
    const r = applySymbolicCache(sheet(), results()).get("s1");
    expect(r?.tex).not.toBe("");
    expect(r?.formatted).toBe(SYMBOLIC_PLACEHOLDER);
  });

  it("leaves non-symbolic regions untouched (same map reference)", () => {
    const content = parseContent({
      version: 1,
      rows: [{ id: "r1", columns: 1, cells: [{ regions: [{ id: "m1", type: "math", source: "phi := 0.67", indent: 0 }] }] }],
    });
    const map = new Map<string, RegionResult>([
      ["m1", { id: "m1", name: "phi", value: 0.67, formatted: "0.67", tex: "\\phi := 0.67", status: "current" }],
    ]);
    expect(applySymbolicCache(content, map)).toBe(map);
  });
});
