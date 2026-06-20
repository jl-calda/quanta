import { describe, expect, it } from "vitest";
import { buildSimplify, buildSympy } from "./symbolic";

describe("buildSimplify", () => {
  it("imports sympy, sympifies a SAFELY-ESCAPED expression, and returns a string", () => {
    const code = buildSimplify("(x + 1)**2 - x**2");
    expect(code).toContain("from sympy import simplify, sympify");
    expect(code).toContain('sympify("(x + 1)**2 - x**2")'); // escaped literal
    expect(code).toContain("return str(simplify(__expr))");
    expect(code).toContain("def __quanta_op__():"); // envelope-wrapped
  });
  it("escapes quotes in the expression so the literal can't break out", () => {
    const code = buildSimplify('x + "y"');
    expect(code).toContain('sympify("x + \\"y\\"")');
  });
});

describe("buildSympy", () => {
  it("passes the body through, envelope-wrapped", () => {
    const code = buildSympy("from sympy import Symbol\nreturn str(Symbol('a'))");
    expect(code).toContain("    from sympy import Symbol");
    expect(code).toContain("    return str(Symbol('a'))");
    expect(code).toContain("__quanta_json.dumps");
  });
});
