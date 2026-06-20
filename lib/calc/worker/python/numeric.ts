/**
 * NumPy / SciPy snippet builders — the heavy-numeric facet of the worker backend.
 *
 * As with the symbolic builders, each returns envelope-wrapped Python and is a
 * pure string function. NumPy results are converted with `.tolist()` / `float()`
 * before `json.dumps` so the envelope only ever carries native, JSON-serializable
 * values.
 */
import { wrapEnvelope } from "./envelope";

/** Solve the linear system A·x = b via `numpy.linalg.solve`; returns the vector x. */
export function buildLinearSolve(a: number[][], b: number[]): string {
  // JSON arrays of numbers are valid Python list literals.
  return wrapEnvelope(
    [
      "import numpy as np",
      `__a = np.array(${JSON.stringify(a)}, dtype=float)`,
      `__b = np.array(${JSON.stringify(b)}, dtype=float)`,
      "return np.linalg.solve(__a, __b).tolist()",
    ].join("\n"),
  );
}

/**
 * Generic SciPy / NumPy escape hatch. `body` is Python that must end in
 * `return <json-serializable>` (cast NumPy values with `.tolist()` / `float()`).
 * The `numpy` and `scipy` packages are preloaded by the backend before this runs.
 */
export function buildScipy(body: string): string {
  return wrapEnvelope(body);
}
