import { describe, expect, it } from "vitest";
import { constraintToLatex, latexToSource, looksLikeLatex, sourceToLatex } from "./latex";
import { normalizeSource, splitDefinition } from "./parse";
import { math } from "./math";

describe("looksLikeLatex", () => {
  it("detects LaTeX commands, brace groups, and braced scripts", () => {
    expect(looksLikeLatex("\\frac{a}{b}")).toBe(true);
    expect(looksLikeLatex("\\sqrt{x}")).toBe(true);
    expect(looksLikeLatex("x^{2}")).toBe(true);
    expect(looksLikeLatex("N_{Rd}")).toBe(true);
    expect(looksLikeLatex("a~b")).toBe(true);
  });

  it("treats plain engine source as not-LaTeX", () => {
    expect(looksLikeLatex("a^2 / b")).toBe(false);
    expect(looksLikeLatex("0.75 * A_s * f_ub")).toBe(false);
    expect(looksLikeLatex("12 kN")).toBe(false);
    expect(looksLikeLatex("")).toBe(false);
  });

  it("pasted LaTeX round-trips to engine source via latexToSource", () => {
    expect(looksLikeLatex("\\frac{a}{b}")).toBe(true);
    expect(latexToSource("\\frac{a}{b}")).toBe("((a)/(b))");
  });
});

describe("latexToSource", () => {
  it("keeps a subscript name as a single identifier", () => {
    expect(latexToSource("N_{Rd}")).toBe("N_Rd");
    expect(latexToSource("f_{ub}")).toBe("f_ub");
  });

  it("reads the assignment, literal `:=` or `\\coloneq`", () => {
    expect(latexToSource("N_{Rd}:=12")).toBe("N_Rd:=12");
    expect(latexToSource("x\\coloneq5")).toBe("x:=5");
  });

  it("turns a fraction into a parenthesised quotient", () => {
    expect(latexToSource("\\frac{a}{b}")).toBe("((a)/(b))");
  });

  it("converts roots", () => {
    expect(latexToSource("\\sqrt{x}")).toBe("sqrt(x)");
    expect(latexToSource("\\sqrt[3]{x}")).toBe("nthRoot(x,3)");
  });

  it("maps multiplication operators", () => {
    expect(latexToSource("a\\cdot b")).toBe("a*b");
    expect(latexToSource("a\\times b")).toBe("a*b");
    expect(latexToSource("0.75\\cdot A_{s}\\cdot f_{ub}")).toBe("0.75*A_s*f_ub");
  });

  it("unwraps \\mathrm units and keeps them attached to the value", () => {
    expect(latexToSource("12\\mathrm{kN}")).toBe("12kN");
    expect(latexToSource("700\\,\\mathrm{MPa}\\cdot 16\\,\\mathrm{mm}^{2}")).toBe(
      "700 MPa*16 mm^2",
    );
  });

  it("handles superscripts (braced and bare)", () => {
    expect(latexToSource("x^{2}")).toBe("x^2");
    expect(latexToSource("x^2")).toBe("x^2");
    expect(latexToSource("x^{a+b}")).toBe("x^(a+b)");
  });

  it("drops \\left / \\right delimiters", () => {
    expect(latexToSource("\\left(a+b\\right)\\cdot c")).toBe("(a+b)*c");
  });

  it("folds Greek commands onto mathjs symbol names", () => {
    expect(latexToSource("\\alpha\\cdot\\beta")).toBe("alpha*beta");
    expect(latexToSource("\\varphi")).toBe("phi");
    expect(latexToSource("\\Sigma")).toBe("Sigma");
  });

  it("converts a full Mathcad-style definition", () => {
    expect(latexToSource("N_{Rd}:=\\frac{w\\cdot L^{2}}{8}")).toBe(
      "N_Rd:=((w*L^2)/(8))",
    );
  });

  it("never throws on malformed input", () => {
    expect(() => latexToSource("\\frac{a}")).not.toThrow();
    expect(() => latexToSource("}{^_\\")).not.toThrow();
  });
});

describe("sourceToLatex", () => {
  it("renders a bare expression with mathjs toTex", () => {
    expect(sourceToLatex("a + b")).toBe(math.parse("a + b").toTex());
  });

  it("rebuilds a `name := …` assignment MathLive can parse", () => {
    const tex = sourceToLatex("N_Rd := 0.75 * A_s");
    expect(tex.startsWith("N_{Rd} := ")).toBe(true);
  });

  it("falls back to the raw source when the expression doesn't parse", () => {
    expect(sourceToLatex("x := ")).toBe("x :=");
  });

  it("returns empty for empty source", () => {
    expect(sourceToLatex("   ")).toBe("");
  });
});

/** Evaluate the right-hand side of a (possibly-assigned) source under a scope. */
function evalRhs(src: string, scope: Record<string, number>): unknown {
  const { expr } = splitDefinition(src);
  return math.evaluate(expr, { ...scope });
}

describe("round-trip: source → LaTeX → source preserves the result", () => {
  const cases: Array<[string, Record<string, number>]> = [
    ["0.75 * A_s * f_ub", { A_s: 2, f_ub: 3 }],
    ["w * L^2 / 8", { w: 4, L: 5 }],
    ["sqrt(x) + nthRoot(y, 3)", { x: 16, y: 8 }],
    ["(a + b) / c", { a: 1, b: 2, c: 3 }],
    ["alpha * beta", { alpha: 2, beta: 5 }],
    ["N_Rd := 0.75 * A_s * f_ub", { A_s: 2, f_ub: 3 }],
  ];

  for (const [src, scope] of cases) {
    it(src, () => {
      const roundTripped = latexToSource(sourceToLatex(src));
      expect(evalRhs(roundTripped, scope)).toEqual(evalRhs(src, scope));
    });
  }
});

describe("normalizeSource LaTeX detection", () => {
  it("passes plain-text source through untouched (just trimmed)", () => {
    expect(normalizeSource("  N_Rd := 0.75 * A_s  ")).toBe("N_Rd := 0.75 * A_s");
    expect(normalizeSource("700 MPa * 16 mm^2")).toBe("700 MPa * 16 mm^2");
  });

  it("converts input carrying LaTeX constructs (backslash / braces)", () => {
    expect(normalizeSource("\\frac{a}{b}")).toBe("((a)/(b))");
    expect(normalizeSource("x^{2}")).toBe("x^2");
  });
});

describe("iterator operators ⇄ source", () => {
  it("reads a MathLive summation into a summation() call", () => {
    expect(latexToSource("\\sum_{i=1}^{n}\\left(i^2\\right)")).toBe("summation(i,1,n,i^2)");
    // the engine's own toTex spacing (`i = 1`) round-trips too
    expect(latexToSource("\\sum_{i = 1}^{n}\\left({i}^{2}\\right)")).toBe("summation(i,1,n,i^2)");
  });

  it("reads a product", () => {
    expect(latexToSource("\\prod_{i=1}^{5}\\left(i\\right)")).toBe("product(i,1,5,i)");
  });

  it("reads a definite integral, taking the variable from the differential", () => {
    expect(latexToSource("\\int_{0}^{1}\\left(x^2\\right)\\,dx")).toBe("integral(x,0,1,x^2)");
    expect(latexToSource("\\int_{0}^{L}\\left(w \\cdot x\\right)\\,\\mathrm{d}t")).toBe(
      "integral(t,0,L,w*x)",
    );
  });

  it("renders operators back to ∑ / ∏ / ∫ notation", () => {
    expect(sourceToLatex("S := summation(i, 1, n, i^2)")).toContain("\\sum");
    expect(sourceToLatex("P := product(i, 1, 5, i)")).toContain("\\prod");
    expect(sourceToLatex("A := integral(x, 0, 1, x^2)")).toContain("\\int");
  });

  it("keeps the `..` range form in source (round-trips through the editor seed)", () => {
    expect(latexToSource("1..n")).toBe("1..n");
    expect(sourceToLatex("i := 1..n")).toContain("..");
  });
});

describe("constraint round-trip (solve-block inline editing)", () => {
  // The inline constraint field seeds via constraintToLatex and commits via
  // latexToSource; the relational operators must survive the loop.
  const roundTrip = (src: string) => latexToSource(constraintToLatex(src)).replace(/\s+/g, "");

  it("round-trips equations", () => {
    expect(roundTrip("a = b")).toBe("a=b");
    // A power survives; its base may pick up harmless parens from the bridge
    // (mathjs emits `{ x}^{2}`), so tolerate them — the relation is preserved.
    expect(roundTrip("x^2 = 9")).toMatch(/^\(?x\)?\^2=9$/);
  });

  it("round-trips inequalities (the bridge gap this fills)", () => {
    expect(roundTrip("x >= 2")).toBe("x>=2");
    expect(roundTrip("t <= 50 mm")).toBe("t<=50mm");
  });

  it("round-trips a chained bound", () => {
    expect(roundTrip("0 <= x <= 1")).toBe("0<=x<=1");
  });

  it("maps the relational LaTeX commands MathLive emits", () => {
    expect(latexToSource("x \\ge 2")).toBe("x >= 2");
    expect(latexToSource("x \\le 2")).toBe("x <= 2");
    expect(latexToSource("a \\ne b")).toBe("a != b");
  });
});
