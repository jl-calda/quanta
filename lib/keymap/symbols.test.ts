import { describe, expect, it } from "vitest";
import {
  ALL_SYMBOLS,
  OPERATOR_TEMPLATES,
  SYMBOL_GROUPS,
  type OperatorKey,
} from "./symbols";

const OP_KEYS: OperatorKey[] = [
  "fraction", "exponent", "root", "subscript", "absolute", "factorial",
  "summation", "product", "integral", "derivative", "partial", "limit",
  "range", "index", "assign", "evaluate", "global",
];

describe("symbol catalog", () => {
  it("has populated, ordered groups", () => {
    expect(SYMBOL_GROUPS.length).toBe(6);
    expect(SYMBOL_GROUPS.map((g) => g.group)).toEqual([
      "Greek", "Operators", "Calculus", "Relational", "Arrows", "Misc",
    ]);
    for (const g of SYMBOL_GROUPS) expect(g.entries.length, g.group).toBeGreaterThan(0);
  });

  it("gives every entry a non-empty glyph, latex, source, and a unique id", () => {
    const ids = new Set<string>();
    for (const s of ALL_SYMBOLS) {
      expect(s.glyph.length, s.id).toBeGreaterThan(0);
      expect(s.latex.length, s.id).toBeGreaterThan(0);
      expect(s.source.length, s.id).toBeGreaterThan(0);
      expect(ids.has(s.id), `duplicate id ${s.id}`).toBe(false);
      ids.add(s.id);
    }
  });

  it("surfaces every operator-palette key in the catalog (one shared table)", () => {
    for (const key of OP_KEYS) {
      const entry = ALL_SYMBOLS.find((s) => s.id === `op:${key}`);
      expect(entry, key).toBeDefined();
      // The grid entry reuses the canonical operator template — not a second list.
      expect(entry!.latex).toBe(OPERATOR_TEMPLATES[key].latex);
      expect(entry!.source).toBe(OPERATOR_TEMPLATES[key].source);
    }
  });
});
