import { describe, expect, it } from "vitest";
import { evaluateSweep, type SweepSpec } from "./sweep";

/** A sweep spec with sensible defaults; override per test. */
function spec(over: Partial<SweepSpec> = {}): SweepSpec {
  return { param: "x", from: "0", to: "10", steps: 11, outputs: [], ...over };
}

describe("evaluateSweep — series production", () => {
  it("produces a series of y = x^2 over [0, 4]", () => {
    const r = evaluateSweep(spec({ from: "0", to: "4", steps: 5, outputs: [{ expr: "x^2", name: "y" }] }));
    expect(r.status).toBe("ok");
    expect(r.rows).toBe(5);
    expect(r.param.values).toEqual([0, 1, 2, 3, 4]);
    expect(r.columns).toHaveLength(1);
    expect(r.columns[0].values).toEqual([0, 1, 4, 9, 16]);
  });

  it("derives the count from an explicit step size", () => {
    const r = evaluateSweep(spec({ from: "0", to: "4", steps: undefined, stepSize: "1", outputs: [{ expr: "2*x", name: "y" }] }));
    expect(r.status).toBe("ok");
    expect(r.rows).toBe(5);
    expect(r.columns[0].values).toEqual([0, 2, 4, 6, 8]);
  });

  it("is empty until a parameter and an output are set", () => {
    expect(evaluateSweep(spec({ outputs: [] })).status).toBe("empty");
    expect(evaluateSweep(spec({ param: "", outputs: [{ expr: "x^2", name: "y" }] })).status).toBe("empty");
  });
});

describe("evaluateSweep — units", () => {
  it("carries the parameter's unit and converts the output to its unit", () => {
    const r = evaluateSweep(
      spec({ param: "L", from: "0 m", to: "4 m", steps: 5, outputs: [{ expr: "L^2", name: "A", unit: "m^2" }] }),
    );
    expect(r.status).toBe("ok");
    expect(r.param.unit).toBe("m");
    expect(r.columns[0].unit).toBe("m^2");
    expect(r.columns[0].values).toEqual([0, 1, 4, 9, 16]);
  });

  it("flags a from/to dimensional mismatch as a typed error", () => {
    const r = evaluateSweep(spec({ from: "0 m", to: "4 kN", outputs: [{ expr: "x", name: "y" }] }));
    expect(r.status).toBe("error");
    expect(r.error?.kind).toBe("unit-mismatch");
  });
});

describe("evaluateSweep — named-output scope export", () => {
  it("exports the parameter and each named output as a vector", () => {
    const r = evaluateSweep(spec({ from: "0", to: "4", steps: 5, outputs: [{ expr: "x^2", name: "y" }] }));
    expect(Object.keys(r.exports).sort()).toEqual(["x", "y"]);
    expect((r.exports.x as unknown[]).length).toBe(5);
    expect((r.exports.y as unknown[]).length).toBe(5);
  });

  it("does not export an unnamed output (display-only)", () => {
    const r = evaluateSweep(spec({ from: "0", to: "4", steps: 5, outputs: [{ expr: "x^2" }] }));
    expect(Object.keys(r.exports)).toEqual(["x"]);
    expect(r.columns[0].name).toBeNull();
  });
});

describe("evaluateSweep — validation", () => {
  it("rejects a non-positive step size", () => {
    const r = evaluateSweep(spec({ steps: undefined, stepSize: "0", outputs: [{ expr: "x", name: "y" }] }));
    expect(r.status).toBe("error");
    expect(r.error?.kind).toBe("domain");
  });

  it("rejects fewer than 2 points", () => {
    const r = evaluateSweep(spec({ steps: 1, outputs: [{ expr: "x", name: "y" }] }));
    expect(r.status).toBe("error");
  });

  it("rejects an absurd number of points", () => {
    const r = evaluateSweep(spec({ steps: 100000, outputs: [{ expr: "x", name: "y" }] }));
    expect(r.status).toBe("error");
    expect(r.error?.kind).toBe("domain");
  });
});

describe("evaluateSweep — determinism & log scale", () => {
  it("samples geometrically on a log scale", () => {
    const r = evaluateSweep(spec({ from: "1", to: "1000", steps: 4, scale: "log", outputs: [{ expr: "x", name: "y" }] }));
    expect(r.status).toBe("ok");
    expect(r.param.values.map((v) => Math.round(v))).toEqual([1, 10, 100, 1000]);
  });

  it("is deterministic across repeated runs", () => {
    const s = spec({ from: "0", to: "4", steps: 5, outputs: [{ expr: "x^2", name: "y" }] });
    expect(evaluateSweep(s).columns[0].values).toEqual(evaluateSweep(s).columns[0].values);
  });
});
