/**
 * EngineBackend — the single typed, async seam onto the Pyodide runtime.
 *
 * Callers (Math symbolic regions today; Solve ODE/PDE later) talk to this
 * interface and NEVER touch Pyodide, a worker, or Python directly. The same
 * implementation drives both runtimes — only the underlying {@link PythonRunner}
 * differs — so a SymPy/SciPy result is identical in the browser and in Node.
 *
 * Naming: the heavy-numeric facet is {@link NumericBackend}, deliberately NOT
 * "SolverBackend". The synchronous, pure `SolverBackend` in ../solve.ts is a
 * different layer (the deterministic in-graph numeric seam used during recalc and
 * server-side PDF export) and must stay synchronous. A future solve that needs
 * SciPy delegates to {@link NumericBackend}; do not reintroduce an async
 * "SolverBackend". None of these async types are re-exported from ../index.ts —
 * the public engine entry stays pure and synchronous.
 */
import type { PythonRunner } from "./python-runner";
import { parseEnvelope } from "./python/envelope";
import { buildSimplify, buildSympy, buildSymbolicEval } from "./python/symbolic";
import { buildLinearSolve, buildScipy } from "./python/numeric";

export type { PyEnvelope, PyEnvelopeOk, PyEnvelopeErr } from "./python/envelope";
export { PyBackendError } from "./python/envelope";
export type { PythonRunner } from "./python-runner";

/** A symbolic-operator result: rendered TeX plus a plain-text form. */
export interface SymbolicEvalResult {
  /** The result as TeX (KaTeX-renderable), e.g. `2 x` for `diff(x^2, x)`. */
  tex: string;
  /** The result as plain text, e.g. `2*x` (or `[-2, 2]` for a solve). */
  value: string;
}

/** Symbolic algebra (SymPy) facet. */
export interface SymbolicBackend {
  /** Simplify an expression, returning the simplified form as a string. */
  simplify(expr: string): Promise<string>;
  /**
   * Evaluate a Mathcad symbolic-operator expression (diff / integrate /
   * simplify / solve / factor / substitute / series / limit) and return its
   * rendered TeX + plain-text value. `expr` is the engine's plain-text
   * expression with any `name :=` prefix already stripped.
   */
  symbolicEval(expr: string): Promise<SymbolicEvalResult>;
  /**
   * Run arbitrary SymPy. `body` must end in `return <json-serializable>`
   * (typically `return str(expr)`). The `sympy` package is loaded first.
   */
  sympy<T = unknown>(body: string): Promise<T>;
}

/** Heavy / scientific numeric (NumPy / SciPy) facet. NOT the sync SolverBackend. */
export interface NumericBackend {
  /** Solve the linear system A·x = b, returning the solution vector x. */
  linearSolve(a: number[][], b: number[]): Promise<number[]>;
  /**
   * Run arbitrary NumPy / SciPy. `body` must end in `return <json-serializable>`
   * (cast NumPy values with `.tolist()` / `float()`). `numpy` + `scipy` load first.
   */
  scipy<T = unknown>(body: string): Promise<T>;
}

/** The unified backend: both facets over one Pyodide runtime. */
export interface EngineBackend extends SymbolicBackend, NumericBackend {}

const SYMPY_PACKAGES = ["sympy"] as const;
const SCIPY_PACKAGES = ["numpy", "scipy"] as const;

/**
 * Build the typed backend over any {@link PythonRunner}. Runtime-agnostic: the
 * Python it generates is identical regardless of where it runs. Exposed for tests
 * (drive it with a fake runner) and for callers that already hold a runner.
 */
export function makeEngineBackend(runner: PythonRunner): EngineBackend {
  return {
    async simplify(expr) {
      return parseEnvelope<string>(
        await runner.run(buildSimplify(expr), { packages: SYMPY_PACKAGES }),
      );
    },
    async symbolicEval(expr) {
      return parseEnvelope<SymbolicEvalResult>(
        await runner.run(buildSymbolicEval(expr), { packages: SYMPY_PACKAGES }),
      );
    },
    async sympy<T = unknown>(body: string) {
      return parseEnvelope<T>(
        await runner.run(buildSympy(body), { packages: SYMPY_PACKAGES }),
      );
    },
    async linearSolve(a, b) {
      return parseEnvelope<number[]>(
        await runner.run(buildLinearSolve(a, b), { packages: SCIPY_PACKAGES }),
      );
    },
    async scipy<T = unknown>(body: string) {
      return parseEnvelope<T>(
        await runner.run(buildScipy(body), { packages: SCIPY_PACKAGES }),
      );
    },
  };
}

let cached: Promise<EngineBackend> | null = null;

/**
 * Resolve the backend for the current environment (cached). In the browser it
 * drives the Pyodide Web Worker; in Node it loads Pyodide in-process. The runner
 * modules are dynamic-imported so the Node-only runner (node:module + pyodide)
 * never enters a browser bundle and vice-versa.
 */
export function getBackend(): Promise<EngineBackend> {
  if (!cached) {
    cached = (async () => {
      const runner: PythonRunner =
        typeof window === "undefined"
          ? (await import("./node-runner")).createNodeRunner()
          : (await import("./browser-runner")).createBrowserRunner();
      return makeEngineBackend(runner);
    })().catch((error) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}

/** Drop the cached backend (mainly for tests / teardown). */
export function resetBackend(): void {
  cached = null;
}
