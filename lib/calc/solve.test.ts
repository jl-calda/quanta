import { describe, expect, it } from "vitest";
import { evaluateSolve, jsSolverBackend, type SolveSpec } from "./solve";
import type { Unit } from "./math";

/** A find spec with sensible defaults; override per test. */
function spec(over: Partial<SolveSpec> = {}): SolveSpec {
  return { algorithm: "find", guesses: [], constraints: [], ...over };
}

/** The solved magnitude of an output (Unit → its own-unit number, else the number). */
function mag(value: unknown, unit?: string): number {
  if (value && typeof (value as Unit).toNumber === "function") {
    const u = value as Unit;
    return u.toNumber(unit ?? u.formatUnits());
  }
  return Number(value);
}

describe("evaluateSolve — find (root solving)", () => {
  it("solves a single equation in one unknown", () => {
    const r = evaluateSolve(spec({ guesses: [{ var: "x", value: "2" }], constraints: ["x^2 = 9"] }));
    expect(r.status).toBe("solved");
    expect(r.outputs).toHaveLength(1);
    expect(r.outputs[0].name).toBe("x");
    expect(mag(r.outputs[0].value)).toBeCloseTo(3, 6);
    expect(r.unknowns).toEqual(["x"]);
  });

  it("solves a 2×2 nonlinear system (Newton)", () => {
    const r = evaluateSolve(
      spec({
        guesses: [
          { var: "x", value: "0.5" },
          { var: "y", value: "0.5" },
        ],
        constraints: ["x^2 + y^2 = 1", "x = y"],
      }),
    );
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(Math.SQRT1_2, 5);
    expect(mag(r.outputs[1].value)).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it("reads worksheet scope names in constraints", () => {
    const r = evaluateSolve(spec({ guesses: [{ var: "x", value: "1" }], constraints: ["x = a"] }), { a: 7 });
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(7, 6);
  });

  it("respects a box-bound inequality (≥) via the optimizer", () => {
    // Minimize x² subject to x ≥ 2 ⇒ the constrained optimum is x = 2.
    const r = evaluateSolve(
      spec({ algorithm: "minimize", guesses: [{ var: "x", value: "5" }], objective: "x^2", constraints: ["x >= 2"] }),
    );
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(2, 2);
  });
});

describe("evaluateSolve — optimization", () => {
  it("minimizes a parabola", () => {
    const r = evaluateSolve(spec({ algorithm: "minimize", guesses: [{ var: "x", value: "0" }], objective: "(x-3)^2" }));
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(3, 2);
  });

  it("maximizes a downward parabola", () => {
    const r = evaluateSolve(spec({ algorithm: "maximize", guesses: [{ var: "x", value: "0" }], objective: "-(x-2)^2" }));
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(2, 2);
  });

  it("errors when minimize has no objective", () => {
    const r = evaluateSolve(spec({ algorithm: "minimize", guesses: [{ var: "x", value: "0" }] }));
    expect(r.status).toBe("error");
  });
});

describe("evaluateSolve — minerr (least squares)", () => {
  it("returns the best fit for an overdetermined system", () => {
    const r = evaluateSolve(
      spec({ algorithm: "minerr", guesses: [{ var: "c", value: "0" }], constraints: ["c = 1", "c = 2", "c = 3"] }),
    );
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(2, 4); // least-squares mean
    expect(r.residualNorm).toBeGreaterThan(0);
  });
});

describe("evaluateSolve — units", () => {
  it("solves a unit-bearing system and reattaches the guess unit", () => {
    // 100 kN / A = 200 MPa  ⇒  A = 500 mm².
    const r = evaluateSolve(
      spec({ guesses: [{ var: "A", value: "100", unit: "mm^2" }], constraints: ["100 kN / A = 200 MPa"] }),
    );
    expect(r.status).toBe("solved");
    expect(r.outputs[0].unit).toBe("mm^2");
    expect(mag(r.outputs[0].value, "mm^2")).toBeCloseTo(500, 1);
    expect(r.outputs[0].formatted).toMatch(/mm/);
  });

  it("classifies a dimensional mismatch as a unit error", () => {
    const r = evaluateSolve(spec({ guesses: [{ var: "x", value: "1", unit: "mm" }], constraints: ["x = 5 kN"] }));
    expect(r.status).toBe("error");
    expect(r.error?.kind).toBe("unit-mismatch");
  });
});

describe("evaluateSolve — exact linear systems", () => {
  it("solves a square linear system exactly in one step", () => {
    // x + y = 10, x − y = 2  ⇒  x = 6, y = 4 (exact, direct lusolve).
    const r = evaluateSolve(
      spec({
        guesses: [
          { var: "x", value: "0" },
          { var: "y", value: "0" },
        ],
        constraints: ["x + y = 10", "x - y = 2"],
      }),
    );
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(6, 12);
    expect(mag(r.outputs[1].value)).toBeCloseTo(4, 12);
    expect(r.iterations).toBe(1);
  });

  it("reattaches units on a unit-bearing linear system", () => {
    // x + y = 10 mm, x − y = 2 mm  ⇒  x = 6 mm, y = 4 mm.
    const r = evaluateSolve(
      spec({
        guesses: [
          { var: "x", value: "0", unit: "mm" },
          { var: "y", value: "0", unit: "mm" },
        ],
        constraints: ["x + y = 10 mm", "x - y = 2 mm"],
      }),
    );
    expect(r.status).toBe("solved");
    expect(r.outputs[0].unit).toBe("mm");
    expect(mag(r.outputs[0].value, "mm")).toBeCloseTo(6, 9);
    expect(mag(r.outputs[1].value, "mm")).toBeCloseTo(4, 9);
  });

  it("reads worksheet scope names in a linear system", () => {
    const r = evaluateSolve(
      spec({
        guesses: [
          { var: "x", value: "0" },
          { var: "y", value: "0" },
        ],
        constraints: ["x + y = a", "x - y = b"],
      }),
      { a: 10, b: 2 },
    );
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(6, 9);
    expect(mag(r.outputs[1].value)).toBeCloseTo(4, 9);
  });

  it("solves an overdetermined but consistent linear system exactly", () => {
    // x = 3 and 2x = 6 are consistent ⇒ unique x = 3 (normal equations + lusolve).
    const r = evaluateSolve(
      spec({ guesses: [{ var: "x", value: "0" }], constraints: ["x = 3", "2 * x = 6"] }),
    );
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(3, 12);
  });

  it("reports infinitely many solutions for an underdetermined system", () => {
    const r = evaluateSolve(
      spec({
        guesses: [
          { var: "x", value: "0" },
          { var: "y", value: "0" },
        ],
        constraints: ["x + y = 10"],
      }),
    );
    expect(r.status).toBe("no-solution");
    expect(r.error?.kind).toBe("singular");
    expect(r.error?.message).toMatch(/infinitely many/i);
  });

  it("reports a contradiction for an inconsistent linear system", () => {
    const r = evaluateSolve(
      spec({
        guesses: [
          { var: "x", value: "0" },
          { var: "y", value: "0" },
        ],
        constraints: ["x + y = 10", "x + y = 12"],
      }),
    );
    expect(r.status).toBe("no-solution");
    expect(r.error?.kind).toBe("no-solution");
    expect(r.error?.message).toMatch(/contradict/i);
  });

  it("defers a non-unique linear system to the iterate under onNonConverge 'last'", () => {
    const r = evaluateSolve(
      spec({
        guesses: [{ var: "x", value: "0" }],
        constraints: ["x = 1", "x = 2"],
        onNonConverge: "last",
      }),
    );
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(1.5, 1); // least-squares compromise
  });

  it("keeps a nonlinear find on the iterative path (not misrouted)", () => {
    const r = evaluateSolve(spec({ guesses: [{ var: "x", value: "2" }], constraints: ["x^2 = 9"] }));
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(3, 6);
  });

  it("is deterministic across runs for a linear system", () => {
    const s = spec({
      guesses: [
        { var: "x", value: "0" },
        { var: "y", value: "0" },
      ],
      constraints: ["x + y = 10", "x - y = 2"],
    });
    const a = evaluateSolve(s);
    const b = evaluateSolve(s);
    expect(mag(a.outputs[0].value)).toBe(mag(b.outputs[0].value));
    expect(mag(a.outputs[1].value)).toBe(mag(b.outputs[1].value));
  });
});

describe("evaluateSolve — failure + edge cases", () => {
  it("reports no-solution for inconsistent constraints", () => {
    const r = evaluateSolve(spec({ guesses: [{ var: "x", value: "0" }], constraints: ["x = 1", "x = 2"] }));
    expect(r.status).toBe("no-solution");
    expect(r.error?.kind).toBe("no-solution");
  });

  it("binds the last iterate when onNonConverge is 'last'", () => {
    const r = evaluateSolve(
      spec({ guesses: [{ var: "x", value: "0" }], constraints: ["x = 1", "x = 2"], onNonConverge: "last" }),
    );
    expect(r.status).toBe("solved");
    expect(mag(r.outputs[0].value)).toBeCloseTo(1.5, 1); // least-squares compromise
  });

  it("errors on a constraint with no relation", () => {
    const r = evaluateSolve(spec({ guesses: [{ var: "x", value: "1" }], constraints: ["x + 1"] }));
    expect(r.status).toBe("error");
    expect(r.error?.kind).toBe("parse");
  });

  it("is empty with no guesses", () => {
    const r = evaluateSolve(spec());
    expect(r.status).toBe("empty");
    expect(r.outputs).toHaveLength(0);
  });

  it("terminates (no hang) on a hard non-convergent system within the iteration cap", () => {
    const r = evaluateSolve(
      spec({ guesses: [{ var: "x", value: "1" }], constraints: ["exp(x) = -1"], maxIter: 50 }),
    );
    expect(["no-solution", "solved"]).toContain(r.status);
  });
});

describe("evaluateSolve — deferred ODE/PDE", () => {
  it("returns a deferred status for odesolve and preserves config", () => {
    const r = evaluateSolve(
      spec({
        algorithm: "odesolve",
        guesses: [{ var: "y", value: "0" }],
        ode: { system: ["y' = y"], indepVar: "t", range: { min: 0, max: 1 }, conditions: ["y(0) = 1"] },
      }),
    );
    expect(r.status).toBe("deferred");
    expect(r.algorithm).toBe("odesolve");
    expect(r.outputs).toHaveLength(0);
    expect(r.unknowns).toEqual(["y"]);
  });

  it("defers pdesolve and numol too", () => {
    expect(evaluateSolve(spec({ algorithm: "pdesolve", guesses: [{ var: "u", value: "0" }] })).status).toBe("deferred");
    expect(evaluateSolve(spec({ algorithm: "numol", guesses: [{ var: "u", value: "0" }] })).status).toBe("deferred");
  });
});

describe("evaluateSolve — determinism", () => {
  it("produces identical results across runs (client = worker = Node)", () => {
    const s = spec({
      guesses: [
        { var: "x", value: "0.5" },
        { var: "y", value: "0.5" },
      ],
      constraints: ["x^2 + y^2 = 1", "x = y"],
    });
    const a = evaluateSolve(s);
    const b = evaluateSolve(s);
    expect(mag(a.outputs[0].value)).toBe(mag(b.outputs[0].value));
    expect(mag(a.outputs[1].value)).toBe(mag(b.outputs[1].value));
    expect(a.iterations).toBe(b.iterations);
  });

  it("accepts a custom SolverBackend through the seam", () => {
    let called = false;
    const r = evaluateSolve(
      spec({ guesses: [{ var: "x", value: "2" }], constraints: ["x^2 = 9"] }),
      {},
      undefined,
      {
        run(p) {
          called = true;
          return jsSolverBackend.run(p);
        },
      },
    );
    expect(called).toBe(true);
    expect(r.status).toBe("solved");
  });
});
