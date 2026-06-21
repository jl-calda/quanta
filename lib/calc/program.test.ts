import { describe, expect, it } from "vitest";
import { compileProgram, evaluateProgram, type ProgramSpec } from "./program";
import { math } from "./math";
import type { Unit } from "./math";

/** A factorial(n): result := 1; if n > 1 { for i in 2..n { result := result*i } }; return result. */
function factorial(): ProgramSpec {
  return {
    name: "factorial",
    params: ["n"],
    body: [
      { kind: "assign", target: "result", expr: "1" },
      {
        kind: "if",
        branches: [
          {
            cond: "n > 1",
            body: [
              {
                kind: "for",
                var: "i",
                from: "2",
                to: "n",
                body: [{ kind: "assign", target: "result", expr: "result * i" }],
              },
            ],
          },
        ],
      },
      { kind: "return", expr: "result" },
    ],
  };
}

const mag = (value: unknown, unit?: string): number => {
  if (value && typeof (value as Unit).toNumber === "function") {
    const u = value as Unit;
    return u.toNumber(unit ?? u.formatUnits());
  }
  return Number(value);
};

describe("evaluateProgram — value programs", () => {
  it("runs a no-parameter program with a loop and a conditional to a value", () => {
    const spec: ProgramSpec = {
      name: "total",
      params: [],
      body: [
        { kind: "assign", target: "s", expr: "0" },
        {
          kind: "for",
          var: "k",
          from: "1",
          to: "5",
          body: [
            {
              kind: "if",
              branches: [{ cond: "mod(k, 2) == 0", body: [{ kind: "assign", target: "s", expr: "s + k" }] }],
              otherwise: [{ kind: "assign", target: "s", expr: "s + 0" }],
            },
          ],
        },
        { kind: "return", expr: "s" },
      ],
    };
    const result = evaluateProgram(spec);
    expect(result.status).toBe("value");
    expect(result.value).toBe(6); // 2 + 4
  });

  it("evaluates a while loop", () => {
    const spec: ProgramSpec = {
      name: "countdown",
      params: [],
      body: [
        { kind: "assign", target: "x", expr: "10" },
        { kind: "assign", target: "c", expr: "0" },
        { kind: "while", cond: "x > 0", body: [
          { kind: "assign", target: "x", expr: "x - 3" },
          { kind: "assign", target: "c", expr: "c + 1" },
        ] },
        { kind: "return", expr: "c" },
      ],
    };
    expect(evaluateProgram(spec).value).toBe(4); // 10,7,4,1 → 4 steps
  });

  it("uses the worksheet scope and carries units through control flow", () => {
    const spec: ProgramSpec = {
      name: "clampLoad",
      params: [],
      body: [
        {
          kind: "if",
          branches: [{ cond: "P > cap", body: [{ kind: "return", expr: "cap" }] }],
          otherwise: [{ kind: "return", expr: "P" }],
        },
      ],
    };
    const result = evaluateProgram(spec, { P: math.unit("12 kN"), cap: math.unit("10 kN") });
    expect(result.status).toBe("value");
    expect(mag(result.value, "kN")).toBeCloseTo(10);
  });

  it("reports an empty program", () => {
    expect(evaluateProgram({ name: "x", params: [], body: [] }).status).toBe("empty");
  });

  it("surfaces a typed parse error instead of throwing", () => {
    const result = evaluateProgram({ name: "x", params: [], body: [{ kind: "return", expr: "1 +" }] });
    expect(result.status).toBe("error");
    expect(result.error?.kind).toBe("parse");
  });

  it("bounds a runaway loop with a domain error", () => {
    const spec: ProgramSpec = {
      name: "spin",
      params: [],
      body: [{ kind: "while", cond: "true", body: [{ kind: "assign", target: "n", expr: "1" }] }],
    };
    const result = evaluateProgram(spec);
    expect(result.status).toBe("error");
    expect(result.error?.kind).toBe("domain");
  });
});

describe("evaluateProgram / compileProgram — function programs", () => {
  it("reports a parameterised program as a callable function (not a value)", () => {
    const result = evaluateProgram(factorial());
    expect(result.status).toBe("function");
    expect(result.name).toBe("factorial");
    expect(result.params).toEqual(["n"]);
    expect(result.value).toBeUndefined();
  });

  it("compiles to a closure that runs the loop + conditional", () => {
    const compiled = compileProgram(factorial());
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.run([0], {})).toBe(1); // n <= 1 → 1
    expect(compiled.run([5], {})).toBe(120);
    expect(compiled.run([6], {})).toBe(720);
  });

  it("binds parameters over the outer scope without leaking", () => {
    const spec: ProgramSpec = {
      name: "withBase",
      params: ["n"],
      body: [{ kind: "return", expr: "n + base" }],
    };
    const compiled = compileProgram(spec);
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.run([2], { base: 100 })).toBe(102);
  });
});
