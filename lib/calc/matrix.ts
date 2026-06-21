/**
 * Matrix & vector operations — the unit-aware linear-algebra layer (pure, sync).
 *
 * mathjs already parses matrix/vector literals (`[1,2,3]`, `[[1,2],[3,4]]`),
 * 1-based indexing (`A[i,j]`), and — in v14 — carries units through `transpose`,
 * `det`, and `inv` natively. Two operations engineers expect are missing under
 * their Mathcad names and, crucially, reject unit-bearing inputs:
 *
 *   - `eigenvalues(M)` — mathjs exposes `eigs` (returns `{ values, … }`) but it
 *     throws on a matrix of Units.
 *   - `lsolve(M, b)` — Mathcad's "solve the linear system M·x = b". mathjs's
 *     builtin `lsolve` is forward-substitution; the general solver is `lusolve`,
 *     which also rejects Units and silently returns a particular solution for a
 *     singular system.
 *
 * This module registers both under their Mathcad names into the shared mathjs
 * instance, making them unit-aware (strip a consistent element unit → compute
 * numerically → reattach) and giving them app-voice errors for the non-square,
 * size-mismatch, and singular cases. It stays pure and synchronous: the same
 * result on the client, the Web Worker, and Node. The runtime `math` instance is
 * passed in (not imported) so this module never forms an import cycle with
 * ./math, which is the single place that calls {@link registerMatrixFunctions}.
 *
 * Note on `lsolve`: overriding the builtin would break mathjs's own `lusolve`
 * (which calls `lsolve` internally for forward substitution) and, in turn, the
 * Solve block's numeric backend (solve.ts → `math.lusolve`). So the Mathcad
 * solver is built on `inv` (independent of the triangular solvers) and `lusolve`
 * is re-provided as an `inv`-based equivalent that keeps solve.ts's contract:
 * same solution, still throws on a singular matrix.
 */
import type { MathJsInstance, MathType, Unit } from "mathjs";
import { CalcEngineError, makeError } from "./errors";

const nonSquare = () =>
  new CalcEngineError(
    makeError(
      "domain",
      "This needs a square matrix.",
      "Check that the matrix has the same number of rows and columns.",
    ),
  );

const sizeMismatch = () =>
  new CalcEngineError(
    makeError(
      "domain",
      "The matrix and vector sizes don't match.",
      "lsolve needs an n×n matrix and a length-n vector.",
    ),
  );

const singular = () =>
  new CalcEngineError(
    makeError(
      "singular",
      "The matrix is singular, so the system has no unique solution.",
      "Check the system for a redundant or missing equation.",
    ),
  );

const inconsistentUnits = () =>
  new CalcEngineError(
    makeError(
      "unit-mismatch",
      "Matrix and vector entries must share one unit.",
      "Give every entry the same dimension, or make them all unitless.",
    ),
  );

/**
 * Register the unit-aware Mathcad-named matrix functions into a mathjs instance.
 * `eigenvalues` is new; `lsolve` deliberately overrides mathjs's builtin
 * forward-substitution to mean the general linear solve, matching Mathcad.
 */
export function registerMatrixFunctions(math: MathJsInstance): void {
  /** The shared element unit of a flat list, or `null` when all are unitless. */
  function commonUnit(elems: unknown[]): Unit | null {
    let ref: Unit | null = null;
    let sawUnit = false;
    let sawScalar = false;
    for (const e of elems) {
      if (math.isUnit(e)) {
        sawUnit = true;
        if (!ref) ref = math.unit(e.formatUnits()); // value-1 reference unit
        else if (!e.equalBase(ref)) throw inconsistentUnits();
      } else {
        sawScalar = true;
      }
    }
    if (sawUnit && sawScalar) throw inconsistentUnits();
    return sawUnit ? ref : null;
  }

  /** Magnitude of an element expressed in `ref`'s unit (e.g. `3 m` in `mm` → 3000). */
  function magnitudeIn(value: unknown, ref: Unit): number {
    return (value as Unit).toNumber(ref.formatUnits());
  }

  /** Normalize to a plain 2-D number array, validating squareness. */
  function squareNumericMatrix(
    M: unknown,
  ): { numeric: number[][]; unit: Unit | null; order: number } {
    const mat = math.matrix(M as Parameters<typeof math.matrix>[0]);
    const size = mat.size();
    if (size.length !== 2 || size[0] !== size[1]) throw nonSquare();
    const rows = mat.toArray() as unknown[][];
    const unit = commonUnit(rows.flat());
    const numeric = unit
      ? rows.map((r) => r.map((x) => magnitudeIn(x, unit)))
      : (rows as number[][]);
    return { numeric, unit, order: size[0] };
  }

  /** Reattach `unit` to each computed value (a no-op when `unit` is null). */
  function attach(values: unknown[], unit: Unit | null): unknown[] {
    return unit == null ? values : values.map((v) => math.multiply(v as MathType, unit));
  }

  /**
   * Eigenvalues of a square matrix. The matrix must carry one consistent unit
   * (or none); each eigenvalue carries that unit. Eigenvalues may be complex.
   */
  function eigenvalues(M: unknown): unknown {
    const { numeric, unit } = squareNumericMatrix(M);
    const raw = math.eigs(numeric).values;
    const values = (Array.isArray(raw) ? raw : math.flatten(raw).toArray()) as unknown[];
    return math.matrix(attach(values, unit) as number[]);
  }

  /**
   * Solve the linear system M·x = b for the vector x. M must be n×n and b
   * length-n. Units propagate as unit(b)/unit(M); a singular M is reported, not
   * silently solved with a particular solution.
   */
  function lsolve(M: unknown, b: unknown): unknown {
    const { numeric, unit: unitM, order } = squareNumericMatrix(M);

    const bVec = math.matrix(b as Parameters<typeof math.matrix>[0]);
    const bSize = bVec.size();
    if (bSize.length !== 1 || bSize[0] !== order) throw sizeMismatch();
    const bElems = bVec.toArray() as unknown[];
    const unitB = commonUnit(bElems);
    const bNumeric = unitB ? bElems.map((x) => magnitudeIn(x, unitB)) : (bElems as number[]);

    // Guard the (near-)singular case explicitly: a tolerance relative to the
    // entry scale catches systems mathjs's inverse would solve with huge values.
    const det = Number(math.det(numeric));
    const scale = Math.max(1, ...numeric.flat().map((v) => Math.abs(v)));
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12 * scale ** order) throw singular();

    // inv-based solve (independent of the triangular solvers — see file header).
    const raw = math.multiply(math.inv(numeric), bNumeric);
    const solution = (math.isMatrix(raw) ? raw.toArray() : raw) as number[];

    // x carries unit(b)/unit(M); divide(1m,1m) collapses to a plain ratio.
    let resultUnit: unknown = null;
    if (unitB && unitM) resultUnit = math.divide(unitB, unitM);
    else if (unitB) resultUnit = unitB;
    else if (unitM) resultUnit = math.divide(1, unitM);
    const out =
      resultUnit == null
        ? solution
        : solution.map((v) => math.multiply(v, resultUnit as MathType));
    return math.matrix(out as number[]);
  }

  /**
   * Replacement for mathjs's builtin `lusolve` that does not depend on the
   * (now-overridden) `lsolve`. Solves A·x = b via the inverse; `math.inv` throws
   * "determinant is zero" on a singular A, preserving solve.ts's throw-on-singular
   * contract, and the result shape matches the builtin (column for a column b).
   */
  function lusolve(A: unknown, b: unknown): unknown {
    return math.multiply(
      math.inv(A as Parameters<typeof math.inv>[0]),
      b as Parameters<typeof math.multiply>[1],
    );
  }

  math.import({ eigenvalues, lsolve, lusolve }, { override: true });
}
