import { describe, expect, it } from "vitest";
import { latexToSource, sourceToLatex } from "@/lib/calc/latex";
import {
  matrixLatex,
  matrixSource,
  MATRIX_TEMPLATES,
  OPERATOR_TEMPLATES,
  type MatrixOpKey,
  type OperatorKey,
} from "./math-entry";

const OP_KEYS: OperatorKey[] = [
  "fraction", "exponent", "root", "nthRoot", "subscript", "absolute", "factorial",
  "norm", "ceil", "floor", "crossProduct", "dotProduct",
  "summation", "product", "integral", "contourIntegral", "derivative", "partial", "limit",
  "range", "index", "assign", "evaluate", "global",
];

const MX_KEYS: MatrixOpKey[] = [
  "transpose", "inverse", "determinant", "identity", "augment", "stack", "indexing",
];

describe("OPERATOR_TEMPLATES", () => {
  it("defines every operator key with a latex template and a seed source", () => {
    for (const k of OP_KEYS) {
      const t = OPERATOR_TEMPLATES[k];
      expect(t, k).toBeDefined();
      expect(t.latex.length, k).toBeGreaterThan(0);
      expect(t.source.length, k).toBeGreaterThan(0);
    }
  });

  it("has exactly the documented keys (no stragglers)", () => {
    expect(Object.keys(OPERATOR_TEMPLATES).sort()).toEqual([...OP_KEYS].sort());
  });
});

describe("MATRIX_TEMPLATES", () => {
  it("defines every matrix-op key with a latex template and a seed source", () => {
    for (const k of MX_KEYS) {
      const t = MATRIX_TEMPLATES[k];
      expect(t.latex.length, k).toBeGreaterThan(0);
      expect(t.source.length, k).toBeGreaterThan(0);
    }
    expect(Object.keys(MATRIX_TEMPLATES).sort()).toEqual([...MX_KEYS].sort());
  });
});

describe("matrixLatex / matrixSource", () => {
  it("builds a rows×cols pmatrix template with empty slots", () => {
    expect(matrixLatex(2, 3)).toBe(
      "\\begin{pmatrix}#? & #? & #? \\\\ #? & #? & #?\\end{pmatrix}",
    );
  });

  it("builds a rows×cols zero matrix as nested arrays", () => {
    expect(matrixSource(2, 3)).toBe("[[0, 0, 0], [0, 0, 0]]");
    expect(matrixSource(1, 1)).toBe("[[0]]");
  });
});

describe("seed sources are valid engine expressions", () => {
  it("structural seeds round-trip through the engine without throwing", () => {
    const structural: OperatorKey[] = ["fraction", "exponent", "root", "absolute", "factorial"];
    for (const k of structural) {
      const src = OPERATOR_TEMPLATES[k].source;
      let out = "";
      expect(() => {
        out = latexToSource(sourceToLatex(src));
      }, k).not.toThrow();
      expect(out.length, k).toBeGreaterThan(0);
    }
  });
});
