/**
 * NumPy / SciPy snippet builders — the heavy-numeric facet of the worker backend.
 *
 * As with the symbolic builders, each returns envelope-wrapped Python and is a
 * pure string function. NumPy results are converted with `.tolist()` / `float()`
 * before `json.dumps` so the envelope only ever carries native, JSON-serializable
 * values.
 */
import { pyStr, wrapEnvelope } from "./envelope";

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

/* ------------------------------------------------------------------ *
 * ODE / PDE integrators (Functional Brief §2 "heavy numeric", §6.5).
 *
 * `buildOdesolve` is the live integrator: it lowers a solve-block ODE config
 * into `scipy.integrate.solve_ivp` and returns sampled trajectories the engine
 * folds into worksheet scope. `buildPdesolve` / `buildNumol` are typed STUBS for
 * this slice — they emit a deterministic `deferred` signal (no SciPy compute);
 * method-of-lines lands in a follow-up. All three are pure string builders.
 * ------------------------------------------------------------------ */

/** A solve-block ODE/PDE config reduced to the integrator's numeric inputs. */
export interface IntegratorRequest {
  /** Differential equations in prime notation, e.g. `["y' = -k*y"]` or a system. */
  system: string[];
  /** Independent variable name (default "x"). */
  indepVar: string;
  /** Solution interval. */
  range: { min: number; max: number };
  /** Initial conditions, e.g. `["y(0) = 1", "y'(0) = 0"]`. */
  conditions: string[];
  /** Optional step size → derives the sample count. */
  step?: number;
  /** Optional explicit sample count (PDE mesh / ODE resolution). */
  mesh?: number;
  /** Numeric constants the equations/conditions reference (name → magnitude). */
  scope: Record<string, number>;
}

/** Sample count from the config — bounded so the cached trajectory stays small. */
function sampleCount(req: IntegratorRequest): number {
  const span = req.range.max - req.range.min;
  let n = 120;
  if (req.mesh && req.mesh > 1) n = req.mesh;
  else if (req.step && req.step > 0 && Number.isFinite(span)) n = Math.round(span / req.step) + 1;
  return Math.max(2, Math.min(400, Math.round(n)));
}

/**
 * Integrate an ODE system via `scipy.integrate.solve_ivp`. Lowers prime notation
 * (`y'`, `y''`) to a first-order state vector, substitutes the numeric `scope`
 * constants, lambdifies the right-hand sides, reads initial conditions, and
 * returns `{indepVar, indep:[…], vars:{name:[…]}, names:[…]}` — JSON-safe floats.
 */
export function buildOdesolve(req: IntegratorRequest): string {
  const n = sampleCount(req);
  // String.raw keeps regex backslashes literal; values embed as JSON/Python literals.
  return wrapEnvelope(String.raw`import json
import re
import numpy as np
import sympy as sp
from scipy.integrate import solve_ivp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, convert_xor, implicit_multiplication_application

__indep = ${pyStr(req.indepVar || "x")}
__t = sp.Symbol(__indep)
__scope = ${JSON.stringify(req.scope ?? {})}
__system = ${JSON.stringify(req.system ?? [])}
__conditions = ${JSON.stringify(req.conditions ?? [])}
__t0 = ${req.range.min}
__t1 = ${req.range.max}
__N = ${n}

__subs = {sp.Symbol(__k): __v for __k, __v in __scope.items()}
__tr = standard_transformations + (convert_xor, implicit_multiplication_application)

def __canon(__s):
    __s = __s.replace("′", "'")
    return re.sub(r"([A-Za-z_]\w*)('+)", lambda __m: __m.group(1) + "_" + str(len(__m.group(2))), __s)

def __parse(__s):
    return parse_expr(__canon(__s), transformations=__tr, local_dict={__indep: __t})

__eqs = []
for __raw in __system:
    if not str(__raw).strip():
        continue
    if "=" not in __raw:
        raise ValueError("Each ODE needs '=' (e.g. y' = -k*y): " + __raw)
    __lhs, __rhs = __raw.split("=", 1)
    __lhs_c = __canon(__lhs).replace(" ", "")
    __m = re.match(r"^([A-Za-z_]\w*)_(\d+)$", __lhs_c)
    if not __m:
        raise ValueError("Left side must be a derivative like y' or y'': " + __lhs.strip())
    __eqs.append((__m.group(1), int(__m.group(2)), __parse(__rhs)))

if not __eqs:
    raise ValueError("Add at least one differential equation (e.g. y' = -k*y).")

__state = []
for (__base, __order, __rhs) in __eqs:
    for __i in range(__order):
        __sym = sp.Symbol(__base) if __i == 0 else sp.Symbol(__base + "_" + str(__i))
        __state.append((__base, __i, __sym))

__state_syms = [__s for (__b, __i, __s) in __state]
__rhs_list = []
for (__base, __order, __rhs) in __eqs:
    for __i in range(__order):
        if __i < __order - 1:
            __rhs_list.append(sp.Symbol(__base + "_" + str(__i + 1)))
        else:
            __rhs_list.append(__rhs.subs(__subs))

__lam = sp.lambdify([__t] + __state_syms, __rhs_list, modules=["numpy"])
def __f(__tt, __yy):
    return __lam(__tt, *__yy)

__ic = {}
for __raw in __conditions:
    if not str(__raw).strip():
        continue
    __c = __canon(__raw)
    __m = re.match(r"^\s*([A-Za-z_]\w*?)(?:_(\d+))?\s*\(([^)]*)\)\s*=\s*(.+)$", __c)
    if not __m:
        raise ValueError("Condition must look like y(0) = 1: " + __raw)
    __ic[(__m.group(1), int(__m.group(2) or 0))] = float(__parse(__m.group(4)).subs(__subs))

__y0 = [__ic.get((__b, __i), 0.0) for (__b, __i, __s) in __state]

__sol = solve_ivp(__f, (__t0, __t1), __y0, t_eval=np.linspace(__t0, __t1, __N), method="RK45")
if not __sol.success:
    raise RuntimeError("The ODE integrator failed: " + str(__sol.message))

__base_to_row = {}
for __idx, (__b, __i, __s) in enumerate(__state):
    if __i == 0 and __b not in __base_to_row:
        __base_to_row[__b] = __idx

__names = []
for (__base, __order, __rhs) in __eqs:
    if __base not in __names:
        __names.append(__base)

__vars_out = {}
for __nm in __names:
    __vars_out[__nm] = [float(__v) for __v in __sol.y[__base_to_row[__nm]]]

return {"indepVar": __indep, "indep": [float(__v) for __v in __sol.t], "vars": __vars_out, "names": __names}`);
}

/** Typed STUB: PDE solve (method-of-lines) ships next — emits a `deferred` signal. */
export function buildPdesolve(): string {
  return wrapEnvelope(String.raw`return {"deferred": True, "algorithm": "pdesolve"}`);
}

/** Typed STUB: numeric method-of-lines ships next — emits a `deferred` signal. */
export function buildNumol(): string {
  return wrapEnvelope(String.raw`return {"deferred": True, "algorithm": "numol"}`);
}
