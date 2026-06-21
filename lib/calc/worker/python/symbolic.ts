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

/**
 * Evaluate a Mathcad symbolic-operator expression and return BOTH its rendered
 * TeX and a plain-text form: `{"tex": latex(result), "value": str(result)}`.
 *
 * `expr` is the engine's plain-text expression (already split from any `name :=`
 * prefix) — e.g. `diff(x^2, x)`, `simplify((x+1)^2 - x^2)`, `solve(x^2 - 4, x)`.
 * It is parsed with SymPy's `parse_expr`, NOT the engine's mathjs parser:
 *  - `convert_xor` rewrites the engine's `^` power to Python `**`;
 *  - the default global dict exposes the CAS functions as callables, so the
 *    operator (diff / integrate / simplify / solve / factor / expand / limit /
 *    series) evaluates as it parses, and free names auto-create as symbols;
 *  - a small `substitute(expr, var, val, …)` helper is injected via `local_dict`
 *    because SymPy has no `substitute` function — it maps to `expr.subs(var, val)`
 *    over each pair, matching the engine's `substitute(...)` CAS call.
 *
 * Pure string builder — no Pyodide, no async — so it unit-tests without Python.
 */
export function buildSymbolicEval(expr: string): string {
  return wrapEnvelope(
    [
      "from sympy import latex",
      "from sympy.parsing.sympy_parser import (",
      "    parse_expr, standard_transformations, convert_xor,",
      ")",
      "def substitute(__e, *__pairs):",
      "    __r = __e",
      "    __it = iter(__pairs)",
      "    for __old in __it:",
      "        __r = __r.subs(__old, next(__it))",
      "    return __r",
      "__transforms = standard_transformations + (convert_xor,)",
      `__result = parse_expr(${pyStr(expr)}, transformations=__transforms, local_dict={"substitute": substitute})`,
      'return {"tex": latex(__result), "value": str(__result)}',
    ].join("\n"),
  );
}
