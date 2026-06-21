import { describe, expect, it } from "vitest";
import { buildSimplify, buildSympy, buildSymbolicEval } from "./symbolic";

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

describe("buildSymbolicEval", () => {
  it("parses with convert_xor and returns both tex and value of the result", () => {
    const code = buildSymbolicEval("diff(x^2, x)");
    expect(code).toContain("from sympy import latex");
    expect(code).toContain("convert_xor"); // engine `^` → Python `**`
    expect(code).toContain('parse_expr("diff(x^2, x)"'); // escaped literal, unchanged
    expect(code).toContain('return {"tex": latex(__result), "value": str(__result)}');
    expect(code).toContain("def __quanta_op__():"); // envelope-wrapped
  });
  it("injects a substitute helper bound through local_dict", () => {
    const code = buildSymbolicEval("substitute(x^2, x, 3)");
    expect(code).toContain("def substitute(__e, *__pairs):");
    expect(code).toContain('local_dict={"substitute": substitute}');
  });
  it("escapes quotes so the expression literal can't break out", () => {
    const code = buildSymbolicEval('solve(x - "y", x)');
    expect(code).toContain('parse_expr("solve(x - \\"y\\", x)"');
  });
});
