/**
 * SymPy snippet builders — the symbolic (CAS) facet of the worker backend.
 *
 * Each builder returns Python source already wrapped in the JSON envelope (see
 * ./envelope) so it runs identically in the browser worker and in Node. The
 * builders are pure string functions — no Pyodide, no async — so they are unit
 * tested without booting Python.
 */
import { pyStr, wrapEnvelope } from "./envelope";

/** Simplify an expression; returns the simplified expression as a string. */
export function buildSimplify(expr: string): string {
  return wrapEnvelope(
    [
      "from sympy import simplify, sympify",
      `__expr = sympify(${pyStr(expr)})`,
      "return str(simplify(__expr))",
    ].join("\n"),
  );
}

/**
 * Generic SymPy escape hatch. `body` is Python that must end in
 * `return <json-serializable>` (typically `return str(expr)`). The `sympy`
 * package is preloaded by the backend before this runs.
 */
export function buildSympy(body: string): string {
  return wrapEnvelope(body);
}
