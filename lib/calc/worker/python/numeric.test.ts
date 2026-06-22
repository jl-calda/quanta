import { describe, expect, it } from "vitest";
import { buildLinearSolve, buildScipy, buildOdesolve, buildPdesolve, buildNumol } from "./numeric";

describe("buildLinearSolve", () => {
  it("emits numpy arrays from the matrix/vector and returns a JSON-able list", () => {
    const code = buildLinearSolve(
      [
        [2, 1],
        [1, 3],
      ],
      [3, 5],
    );
    expect(code).toContain("import numpy as np");
    expect(code).toContain("np.array([[2,1],[1,3]], dtype=float)");
    expect(code).toContain("np.array([3,5], dtype=float)");
    expect(code).toContain("return np.linalg.solve(__a, __b).tolist()");
    expect(code).toContain("def __quanta_op__():"); // envelope-wrapped
  });
});

describe("buildScipy", () => {
  it("passes the body through, envelope-wrapped", () => {
    const code = buildScipy("from scipy import linalg\nreturn [1.0]");
    expect(code).toContain("    from scipy import linalg");
    expect(code).toContain("    return [1.0]");
    expect(code).toContain("__quanta_json.dumps");
  });
});

describe("buildOdesolve", () => {
  it("lowers an ODE config into solve_ivp and embeds the system, conditions, and scope", () => {
    const code = buildOdesolve({
      system: ["y' = -k*y"],
      indepVar: "t",
      range: { min: 0, max: 5 },
      conditions: ["y(0) = 1"],
      scope: { k: 2 },
    });
    expect(code).toContain("from scipy.integrate import solve_ivp");
    expect(code).toContain("solve_ivp(__f");
    expect(code).toContain("np.linspace(__t0, __t1, __N)");
    expect(code).toContain(JSON.stringify(["y' = -k*y"])); // system embedded verbatim
    expect(code).toContain(JSON.stringify(["y(0) = 1"])); // conditions embedded
    expect(code).toContain('{"k":2}'); // scope constants embedded
    expect(code).toContain('"t"'); // pyStr(indepVar)
    expect(code).toContain('return {"indepVar": __indep'); // returns the result dict
    expect(code).toContain("def __quanta_op__():"); // envelope-wrapped
  });

  it("derives the sample count from an explicit mesh", () => {
    const code = buildOdesolve({
      system: ["y' = y"],
      indepVar: "x",
      range: { min: 0, max: 10 },
      conditions: ["y(0) = 1"],
      mesh: 50,
      scope: {},
    });
    expect(code).toContain("__N = 50");
  });
});

describe("buildPdesolve / buildNumol (typed stubs)", () => {
  it("emit a deferred signal with no SciPy compute", () => {
    const pde = buildPdesolve();
    const numol = buildNumol();
    expect(pde).toContain('"deferred": True');
    expect(pde).toContain('"algorithm": "pdesolve"');
    expect(pde).not.toContain("solve_ivp");
    expect(numol).toContain('"algorithm": "numol"');
    expect(numol).not.toContain("solve_ivp");
    expect(pde).toContain("def __quanta_op__():"); // still envelope-wrapped
  });
});
