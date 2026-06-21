import { describe, expect, it } from "vitest";
import {
  collectDeps,
  filterUnitLiterals,
  parseRegion,
  splitDefinition,
  normalizeSource,
} from "./parse";
import { math } from "./math";

describe("splitDefinition", () => {
  it("splits a := definition into name and expression", () => {
    expect(splitDefinition("N_Rd := 0.75 * A_s")).toEqual({
      name: "N_Rd",
      expr: "0.75 * A_s",
    });
  });

  it("accepts a single colon as assignment (Mathcad keymap)", () => {
    expect(splitDefinition("F_t : 12 kN")).toEqual({
      name: "F_t",
      expr: "12 kN",
    });
  });

  it("treats a bare expression as an evaluation, not a definition", () => {
    expect(splitDefinition("F_t / N_Rd")).toEqual({
      name: null,
      expr: "F_t / N_Rd",
    });
  });

  it("does not mistake a colon-equals inside the name boundary", () => {
    // `:=` wins over a stray `:` and the lhs must be a single identifier.
    expect(splitDefinition("a := b : c").name).toBe("a");
  });
});

describe("collectDeps", () => {
  it("collects variable references", () => {
    const deps = collectDeps(math.parse("phi * A_s * f_ub"));
    expect(deps.sort()).toEqual(["A_s", "f_ub", "phi"]);
  });

  it("excludes function callees", () => {
    const deps = collectDeps(math.parse("sqrt(x) + max(a, b)"));
    expect(deps.sort()).toEqual(["a", "b", "x"]);
  });

  it("keeps unit-looking names (definitions shadow units)", () => {
    // collectDeps keeps `kN`; the resolution step decides if it is a literal.
    const deps = collectDeps(math.parse("12 kN + F_t"));
    expect(deps.sort()).toEqual(["F_t", "kN"]);
  });
});

describe("filterUnitLiterals", () => {
  it("drops undefined unit literals but keeps real variables", () => {
    const filtered = filterUnitLiterals(["kN", "F_t"], new Set(["F_t"]));
    expect(filtered).toEqual(["F_t"]);
  });

  it("keeps a unit-named variable that the sheet defines (shadowing)", () => {
    // `b` is a mathjs unit (bit), but here it is a defined variable.
    expect(filterUnitLiterals(["b"], new Set(["b"]))).toEqual(["b"]);
    expect(filterUnitLiterals(["b"], new Set())).toEqual([]);
  });
});

describe("parseRegion", () => {
  it("parses a definition with a name and deps", () => {
    const p = parseRegion("N_Rd := 0.75 * A_s * f_ub");
    expect(p.name).toBe("N_Rd");
    expect(p.error).toBeUndefined();
    expect(p.deps.sort()).toEqual(["A_s", "f_ub"]);
  });

  it("parses an evaluation (no name)", () => {
    const p = parseRegion("F_t / N_Rd");
    expect(p.name).toBeNull();
    expect(p.deps.sort()).toEqual(["F_t", "N_Rd"]);
  });

  it("reports a parse error for malformed input", () => {
    const p = parseRegion("3 * (");
    expect(p.node).toBeNull();
    expect(p.error?.kind).toBe("parse");
  });

  it("reports an empty region", () => {
    const p = parseRegion("x :=");
    expect(p.error?.kind).toBe("parse");
    expect(p.error?.message).toContain("empty");
  });

  it("normalizeSource trims surrounding whitespace", () => {
    expect(normalizeSource("  2 + 2  ")).toBe("2 + 2");
  });
});
