import { describe, expect, it } from "vitest";
import { buildLinearSolve, buildScipy } from "./numeric";

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
