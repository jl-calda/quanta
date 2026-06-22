/**
 * Solve-block engine (Functional Brief §2 "heavy numeric" + §6.5).
 *
 * A solve block defines guess values (the unknowns), a set of constraints
 * (equations + inequalities in math notation), and a solver call; this module
 * builds the residual / objective from those constraints and finds a solution,
 * binding the solved vector back to the unknown names so downstream regions and
 * plots can consume it.
 *
 * It is PURE, SYNCHRONOUS, and DETERMINISTIC — identical on the client, the Web
 * Worker, and Node (so the solve recomputes during server-side PDF export). It
 * reuses the engine's own value model (mathjs), unit conversion, formatter, and
 * typed errors — never a parallel system — and never throws into the UI (every
 * failure is a typed {@link CalcError}; non-convergence is `no-solution`).
 *
 * The numeric core is a small, dependency-free trio — Newton (square root
 * systems), Levenberg–Marquardt least-squares (over/under-determined + minerr),
 * and Nelder–Mead (minimize / maximize) — behind a {@link SolverBackend} seam so
 * a future SciPy/Pyodide heavy offload can slot in without changing solve-block
 * semantics. `odesolve` / `pdesolve` / `numol` are typed-but-deferred this pass:
 * their config round-trips through the schema and the view shows a placeholder.
 */
import { math } from "./math";
import type { MathNode, Unit } from "./math";
import { collectDeps, splitDefinition } from "./parse";
import { formatValue } from "./format";
import { toDisplayUnit, SI_SYSTEM, isUnit } from "./units";
import { serializeForScope } from "./table";
import { CalcEngineError, classifyThrow, makeError, inconsistentSystem, infiniteSolutions } from "./errors";
import type { CalcError, UnitSystem } from "./types";

/* ------------------------------------------------------------------ *
 * Public contract (structurally satisfied by lib/worksheet's SolveRegion,
 * so the engine stays decoupled from the content tree).
 * ------------------------------------------------------------------ */

export type SolveAlgorithm =
  | "find"
  | "minimize"
  | "maximize"
  | "minerr"
  | "odesolve"
  | "pdesolve"
  | "numol";

export interface SolveGuessSpec {
  /** Unknown variable name. */
  var: string;
  /** Initial-guess magnitude / expression, evaluated in scope (e.g. "10", "L/2"). */
  value: string;
  /** Optional unit appended to the guess (e.g. "mm", "deg"). */
  unit?: string;
  /** First-class lower bound (unit-bearing expression, e.g. "0", "2 mm"). */
  lower?: string;
  /** First-class upper bound (unit-bearing expression, e.g. "L", "50 mm"). */
  upper?: string;
  /** Restrict this unknown to integer values (mixed-integer solve). */
  integer?: boolean;
  /** Restrict this unknown to a discrete set (magnitudes in the guess's unit), e.g. rebar sizes. */
  discrete?: number[];
}

/** The full math source for a guess — its value with the optional unit juxtaposed. */
export function guessSource(g: SolveGuessSpec): string {
  const value = g.value?.trim() || "0";
  const unit = g.unit?.trim();
  return unit ? `${value} ${unit}` : value;
}

/**
 * Inverse of {@link guessSource} for inline editing: split a committed
 * `var := value` line back into a guess's `{ var, value }`. Any unit stays folded
 * into `value` (no separate `unit` key) — that is engine-equivalent, because
 * `buildProblem` derives the unknown's unit by parsing the combined `guessSource`
 * (`math.parse(guessSource(g))` → `formatUnits()`), never from `g.unit`. A bare
 * expression (no `:=` / `:`) keeps the caller's existing var name.
 *
 * Pure and synchronous. Assumes plain-text engine source (the MathLive field
 * already converts LaTeX via `latexToSource` on commit), mirroring
 * `splitDefinition`'s own contract. The caller merges the result onto the
 * existing guess so first-class bounds (`lower` / `upper` / `integer` /
 * `discrete`) are preserved.
 */
export function parseGuessLine(source: string, fallbackVar = ""): Pick<SolveGuessSpec, "var" | "value"> {
  const { name, expr } = splitDefinition(source);
  return name !== null
    ? { var: name.trim(), value: expr.trim() }
    : { var: fallbackVar, value: source.trim() };
}

/** ODE/PDE config (round-trips through the content tree; edited in the inspector). */
export interface SolveOdeConfig {
  system?: string[];
  indepVar?: string;
  range?: { min?: number; max?: number };
  conditions?: string[];
  step?: number;
  mesh?: number;
}

/**
 * Worker-computed ODE solution, cached on the region (worksheets.content JSONB) by
 * the async producer and read back here SYNCHRONOUSLY — exactly mirroring the
 * symbolic cache, so the pure engine and the Node export path return the solution
 * with no Pyodide. `inputs` snapshots the referenced scope constants so an upstream
 * change invalidates the cache (the `hash` covers only the config text + guesses).
 */
export interface SolveSolutionCache {
  v: 1;
  /** FNV-1a of the ODE config + guesses ({@link odeConfigHash}). */
  hash: string;
  /** Independent-variable name (e.g. "t"). */
  indepVar: string;
  /** Independent-variable sample points. */
  indep: number[];
  /** One sampled trajectory per state variable, keyed by name. */
  vars: Record<string, number[]>;
  /** Optional unit label per output name (dimensionless ODEs omit it this slice). */
  units?: Record<string, string>;
  /** Serialized snapshot of the referenced scope constants at compute time. */
  inputs?: Record<string, string>;
  /** ISO timestamp the solution was computed (provenance). */
  computedAt: string;
}

export interface SolveSpec {
  algorithm?: SolveAlgorithm;
  guesses?: SolveGuessSpec[];
  /** Equations / inequalities in math-source notation (`=`, `<=`, `>=`, `<`, `>`). */
  constraints?: string[];
  /** The expression to minimize / maximize (minimize / maximize only). */
  objective?: string;
  /** Constraint tolerance (convergence threshold). Defaults to 1e-9. */
  ctol?: number;
  /** Residual / objective scaling divisor (helps badly-scaled problems). */
  scaling?: number;
  /** Iteration cap. Defaults per method. */
  maxIter?: number;
  /** On non-convergence: surface `no-solution` (default) or bind the last iterate. */
  onNonConverge?: "error" | "last";
  /** Find up to N distinct solution sets (default 1) via deterministic multi-start. */
  maxSolutions?: number;
  ode?: SolveOdeConfig;
  /** Worker-computed ODE solution, read synchronously here (set by the producer). */
  solution?: SolveSolutionCache;
}

export interface SolveOutput {
  /** Bound output name (the unknown's name). */
  name: string;
  /** Raw unit-bearing value, folded back into worksheet scope. */
  value: unknown;
  /** Display string (carries the unit). */
  formatted: string;
  /** Unit label, or null for a dimensionless value. */
  unit: string | null;
}

export type SolveStatus = "solved" | "no-solution" | "deferred" | "empty" | "error";

/**
 * One distinct solution found by a multi-start `find` / optimisation (or one
 * feasible integer/discrete combination). Named `solutionSets` on the result to
 * avoid colliding with the ODE `SolveSolutionCache` / `SolveRegion.solution`.
 */
export interface SolveSolutionSet {
  outputs: SolveOutput[];
  /** L2 norm of the equality residuals at this solution. */
  residualNorm: number;
  iterations: number;
}

export interface SolveResult {
  status: SolveStatus;
  algorithm: SolveAlgorithm;
  /** Solved unknowns (empty unless `solved`, or `last` on non-convergence). The PRIMARY (best) solution. */
  outputs: SolveOutput[];
  /** The unknown names, for the read view's `(t, θ) :=` line even before solving. */
  unknowns: string[];
  error?: CalcError;
  iterations?: number;
  /** L2 norm of the equality residuals at the solution (find / minerr). */
  residualNorm?: number;
  /** All distinct solutions found (incl. the primary) when more than one — display-only; only `outputs` exports to scope. */
  solutionSets?: SolveSolutionSet[];
}

/* ------------------------------------------------------------------ *
 * SolverBackend seam — the future SciPy/Pyodide heavy offload implements this
 * same synchronous contract; solve-block semantics never change.
 * ------------------------------------------------------------------ */

export interface NumericProblem {
  /** Initial guess (unknown magnitudes, in each guess's own unit). */
  x0: number[];
  /** Box bounds; ±Infinity when unbounded. */
  lower: number[];
  upper: number[];
  /** Equality residuals (find / minerr). */
  residuals?: (x: number[]) => number[];
  /** Scalar to minimize (minimize / maximize; minimize-of-negated for maximize). */
  objective?: (x: number[]) => number;
  method: "newton" | "least-squares" | "nelder-mead";
  tol: number;
  maxIter: number;
}

export interface SolveRun {
  converged: boolean;
  x: number[];
  iterations: number;
  /** L2 norm of the residuals (or sqrt of the objective) at `x`. */
  residualNorm: number;
}

export interface SolverBackend {
  run(problem: NumericProblem): SolveRun;
}

const DEFAULT_CTOL = 1e-9;
const PENALTY = 1e6;

/* ------------------------------------------------------------------ *
 * Public entry
 * ------------------------------------------------------------------ */

export function evaluateSolve(
  spec: SolveSpec,
  externalScope: Record<string, unknown> = {},
  system: UnitSystem = SI_SYSTEM,
  backend: SolverBackend = jsSolverBackend,
): SolveResult {
  const algorithm = spec.algorithm ?? "find";

  // ODE/PDE algorithms integrate behind the async SciPy worker, whose result is
  // cached on the region and read SYNCHRONOUSLY here. `odesolve` returns the solved
  // trajectory when a fresh cache is present (else defers, awaiting the producer);
  // `pdesolve` / `numol` are typed stubs that always defer this slice.
  if (algorithm === "odesolve" || algorithm === "pdesolve" || algorithm === "numol") {
    if (algorithm === "odesolve") {
      const solved = readOdeSolution(spec, externalScope);
      if (solved) return solved;
    }
    return { status: "deferred", algorithm, outputs: [], unknowns: odeUnknowns(spec) };
  }

  const built = buildProblem(spec, externalScope);
  if ("error" in built) {
    return { status: built.status, algorithm, outputs: [], unknowns: built.unknowns, error: built.error };
  }
  if (built.unknowns.length === 0) {
    return { status: "empty", algorithm, outputs: [], unknowns: [] };
  }

  const names = built.unknowns.map((u) => u.name);
  const tol = positive(spec.ctol) ?? DEFAULT_CTOL;
  const maxIter = positiveInt(spec.maxIter);

  // Linear-system fast path: an all-equality `find` block that is provably linear
  // in the unknowns is solved EXACTLY (rank classification + lusolve) with precise
  // unique / infinitely-many / inconsistent diagnostics, rather than iterated. It
  // falls back to the iterative solver for anything nonlinear (or for a non-unique
  // system under `onNonConverge: "last"`, which wants a best-effort iterate).
  // Detection is purely numeric — no isSymbolic dispatch; numeric find stays numeric.
  if (algorithm === "find") {
    const linear = tryLinearFind(built, spec, system, tol);
    if (linear) return linear;
  }

  // Choose the numeric problem per algorithm.
  let problem: NumericProblem;
  if (algorithm === "find") {
    const square = built.equalities.length === built.unknowns.length && built.equalities.length > 0;
    problem = {
      x0: built.x0,
      lower: built.lower,
      upper: built.upper,
      residuals: built.residualVector,
      method: square ? "newton" : "least-squares",
      tol,
      maxIter: maxIter ?? 200,
    };
  } else if (algorithm === "minerr") {
    problem = {
      x0: built.x0,
      lower: built.lower,
      upper: built.upper,
      residuals: built.lsqResidualVector, // equalities + sqrt-penalty inequalities
      method: "least-squares",
      tol,
      maxIter: maxIter ?? 200,
    };
  } else {
    // minimize / maximize
    if (!built.objective) {
      return {
        status: "error",
        algorithm,
        outputs: [],
        unknowns: names,
        error: makeError(
          "parse",
          `The ${algorithm} solver needs an objective to ${algorithm}.`,
          "Set the objective expression in the inspector.",
        ),
      };
    }
    const obj = built.objective;
    problem = {
      x0: built.x0,
      lower: built.lower,
      upper: built.upper,
      objective: algorithm === "maximize" ? (x) => -obj(x) : obj,
      method: "nelder-mead",
      tol,
      maxIter: maxIter ?? 400,
    };
  }

  try {
    return solveProblem(built, problem, algorithm, spec, system, backend);
  } catch (error) {
    return { status: "error", algorithm, outputs: [], unknowns: names, error: classifyThrow(error) };
  }
}

/* ------------------------------------------------------------------ *
 * Orchestration — single run, multi-start (multiple solutions), or a
 * mixed-integer / discrete enumeration. All pure, synchronous, bounded.
 * ------------------------------------------------------------------ */

const COMBO_CAP = 4096; // integer/discrete combinations enumerated before falling back
const START_CAP = 16; // deterministic multi-start points for multiple solutions

function solveProblem(
  built: Problem,
  problem: NumericProblem,
  algorithm: SolveAlgorithm,
  spec: SolveSpec,
  system: UnitSystem,
  backend: SolverBackend,
): SolveResult {
  const discreteIdx = built.unknowns.map((_, i) => i).filter((i) => built.unknowns[i].integer || built.unknowns[i].discrete);
  const maxSolutions = Math.max(1, positiveInt(spec.maxSolutions) ?? 1);

  if (discreteIdx.length > 0) {
    return solveDiscrete(built, problem, discreteIdx, algorithm, spec, system, backend, maxSolutions);
  }
  if (maxSolutions > 1) {
    return solveMultiple(built, problem, algorithm, spec, system, backend, maxSolutions);
  }
  return interpretRun(backend.run(problem), built, algorithm, spec, system);
}

/* ------------------------------------------------------------------ *
 * Result interpretation + unit reattachment
 * ------------------------------------------------------------------ */

/** Convergence / feasibility / residual assessment of a single run (shared by all paths). */
interface RunAssessment {
  ok: boolean;
  feasible: boolean;
  residualNorm: number;
}

function assessRun(run: SolveRun, built: Problem, algorithm: SolveAlgorithm, tol: number): RunAssessment {
  // Equality residual norm at the solution (a clean number for the read view).
  let residualNorm = run.residualNorm;
  try {
    residualNorm = l2(built.residualVector(run.x));
  } catch {
    /* keep the backend's estimate */
  }

  // Feasibility: bounds + general inequalities must hold within tolerance.
  const feasible = built.feasible(run.x, Math.max(tol, 1e-6));

  let ok: boolean;
  if (algorithm === "find") {
    ok = run.converged && Number.isFinite(residualNorm) && residualNorm <= Math.max(tol, 1e-6) && feasible;
  } else if (algorithm === "minerr") {
    // minerr returns the least-error fit; only a numeric blow-up counts as failure.
    ok = run.x.every(Number.isFinite);
  } else {
    ok = run.x.every(Number.isFinite) && feasible;
  }
  return { ok, feasible, residualNorm };
}

/** Reattach each unknown's unit and format like any region result. */
function buildOutputs(built: Problem, x: number[], system: UnitSystem): SolveOutput[] {
  return built.unknowns.map((u, i) => {
    const value = u.unit ? math.unit(x[i], u.unit) : x[i];
    return {
      name: u.name,
      value,
      formatted: formatValue(toDisplayUnit(value, u.unit ?? undefined, system)),
      unit: u.unit ?? null,
    };
  });
}

function interpretRun(
  run: SolveRun,
  built: Problem,
  algorithm: SolveAlgorithm,
  spec: SolveSpec,
  system: UnitSystem,
): SolveResult {
  const names = built.unknowns.map((u) => u.name);
  const tol = positive(spec.ctol) ?? DEFAULT_CTOL;
  const { ok, feasible, residualNorm } = assessRun(run, built, algorithm, tol);

  if (!ok && (spec.onNonConverge ?? "error") === "error") {
    return {
      status: "no-solution",
      algorithm,
      outputs: [],
      unknowns: names,
      iterations: run.iterations,
      residualNorm: Number.isFinite(residualNorm) ? residualNorm : undefined,
      error: noSolution(names, feasible),
    };
  }

  return {
    status: "solved",
    algorithm,
    outputs: buildOutputs(built, run.x, system),
    unknowns: names,
    iterations: run.iterations,
    residualNorm: Number.isFinite(residualNorm) ? residualNorm : undefined,
  };
}

/* ------------------------------------------------------------------ *
 * Multiple solutions (deterministic multi-start) + mixed-integer / discrete
 * enumeration — both gather candidate runs, dedupe, rank, and bind the best.
 * ------------------------------------------------------------------ */

interface Candidate {
  x: number[];
  ok: boolean;
  feasible: boolean;
  residualNorm: number;
  iterations: number;
  /** Ranking key (lower is better): objective value for optimise, residual norm otherwise. */
  score: number;
}

/** Run one numeric problem and assess it into a ranked candidate. */
function runCandidate(built: Problem, problem: NumericProblem, algorithm: SolveAlgorithm, tol: number, backend: SolverBackend): Candidate {
  const run = backend.run(problem);
  const a = assessRun(run, built, algorithm, tol);
  const score = problem.objective ? problem.objective(run.x) : a.residualNorm;
  return { x: run.x, ok: a.ok, feasible: a.feasible, residualNorm: a.residualNorm, iterations: run.iterations, score: Number.isFinite(score) ? score : Infinity };
}

/** A tolerance-rounded key so distinct roots separate but numeric noise collapses. */
function solutionKey(x: number[]): string {
  return x.map((v) => (Math.abs(v) < 1e-9 ? "0" : Number(v.toPrecision(6)).toString())).join("|");
}

/** Dedupe candidates by rounded position, keeping the best-scoring per key. */
function dedupeCandidates(cands: Candidate[]): Candidate[] {
  const best = new Map<string, Candidate>();
  for (const c of cands) {
    const k = solutionKey(c.x);
    const prev = best.get(k);
    if (!prev || c.score < prev.score) best.set(k, c);
  }
  return [...best.values()];
}

/** Turn gathered candidates into a result: rank, bind the best as primary, list the rest. */
function finalizeCandidates(
  built: Problem,
  cands: Candidate[],
  algorithm: SolveAlgorithm,
  spec: SolveSpec,
  system: UnitSystem,
  maxSolutions: number,
): SolveResult {
  const names = built.unknowns.map((u) => u.name);
  const solved = cands.filter((c) => c.ok);
  const pool = dedupeCandidates(solved.length > 0 ? solved : cands).sort((a, b) => a.score - b.score);

  if (solved.length === 0) {
    const best = pool[0];
    if ((spec.onNonConverge ?? "error") === "error" || !best) {
      return {
        status: "no-solution",
        algorithm,
        outputs: [],
        unknowns: names,
        iterations: best?.iterations,
        residualNorm: best && Number.isFinite(best.residualNorm) ? best.residualNorm : undefined,
        error: noSolution(names, best ? best.feasible : false),
      };
    }
    // onNonConverge === "last": bind the best-scoring iterate even though infeasible.
    return {
      status: "solved",
      algorithm,
      outputs: buildOutputs(built, best.x, system),
      unknowns: names,
      iterations: best.iterations,
      residualNorm: Number.isFinite(best.residualNorm) ? best.residualNorm : undefined,
    };
  }

  const sets: SolveSolutionSet[] = pool.slice(0, maxSolutions).map((c) => ({
    outputs: buildOutputs(built, c.x, system),
    residualNorm: Number.isFinite(c.residualNorm) ? c.residualNorm : 0,
    iterations: c.iterations,
  }));
  const best = pool[0];
  return {
    status: "solved",
    algorithm,
    outputs: buildOutputs(built, best.x, system),
    unknowns: names,
    iterations: best.iterations,
    residualNorm: Number.isFinite(best.residualNorm) ? best.residualNorm : undefined,
    solutionSets: sets.length > 1 ? sets : undefined,
  };
}

/**
 * Multiple solutions: run the same problem from a deterministic spread of starts
 * (the base guess, per-axis sign flips, an all-negated point, and ±decade scales),
 * gather the distinct converged solutions, and bind the best as primary.
 */
function solveMultiple(
  built: Problem,
  problem: NumericProblem,
  algorithm: SolveAlgorithm,
  spec: SolveSpec,
  system: UnitSystem,
  backend: SolverBackend,
  maxSolutions: number,
): SolveResult {
  const tol = positive(spec.ctol) ?? DEFAULT_CTOL;
  const cands = multiStarts(problem.x0).map((x0) => runCandidate(built, { ...problem, x0 }, algorithm, tol, backend));
  return finalizeCandidates(built, cands, algorithm, spec, system, maxSolutions);
}

/** Deterministic multi-start points around `x0` (capped, deduped). */
function multiStarts(x0: number[]): number[][] {
  const starts: number[][] = [x0.slice()];
  for (let i = 0; i < x0.length; i += 1) {
    const flip = x0.slice();
    flip[i] = x0[i] === 0 ? 1 : -x0[i];
    starts.push(flip);
    if (x0[i] === 0) {
      const neg = x0.slice();
      neg[i] = -1;
      starts.push(neg);
    }
  }
  starts.push(x0.map((v) => (v === 0 ? -1 : -v)));
  starts.push(x0.map((v) => (v === 0 ? 0.5 : v * 0.1)));
  starts.push(x0.map((v) => (v === 0 ? 5 : v * 10)));

  const seen = new Set<string>();
  const out: number[][] = [];
  for (const s of starts) {
    const k = s.join(",");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= START_CAP) break;
  }
  return out;
}

/**
 * Mixed-integer / discrete solve. When the discrete search space is bounded and
 * small, enumerate every combination — fixing the discrete unknowns and solving
 * the continuous remainder — and keep the feasible combos, ranked. Otherwise fall
 * back to solving the relaxation and snapping discrete unknowns to the nearest
 * allowed value, then re-solving. Pure + deterministic (fixed enumeration order).
 */
function solveDiscrete(
  built: Problem,
  problem: NumericProblem,
  discreteIdx: number[],
  algorithm: SolveAlgorithm,
  spec: SolveSpec,
  system: UnitSystem,
  backend: SolverBackend,
  maxSolutions: number,
): SolveResult {
  const tol = positive(spec.ctol) ?? DEFAULT_CTOL;
  const choices = discreteIdx.map((i) => candidateValues(built.unknowns[i], problem.lower[i], problem.upper[i]));

  // Unbounded integer (no finite candidate list) or too large ⇒ round-and-fix.
  const combos = choices.reduce((n, c) => n * (c?.length ?? Infinity), 1);
  if (choices.some((c) => c === null) || !Number.isFinite(combos) || combos > COMBO_CAP || combos < 1) {
    return roundAndFix(built, problem, discreteIdx, algorithm, spec, system, backend);
  }

  const lists = choices as number[][];
  const cands: Candidate[] = [];
  for (const combo of cartesian(lists)) {
    const lower = problem.lower.slice();
    const upper = problem.upper.slice();
    const x0 = problem.x0.slice();
    discreteIdx.forEach((idx, k) => {
      lower[idx] = combo[k];
      upper[idx] = combo[k];
      x0[idx] = combo[k];
    });
    cands.push(runCandidate(built, { ...problem, lower, upper, x0 }, algorithm, tol, backend));
  }
  return finalizeCandidates(built, cands, algorithm, spec, system, maxSolutions);
}

/** Allowed integer / discrete values for an unknown within its box bounds, or null when unbounded-integer. */
function candidateValues(u: Unknown, lo: number, hi: number): number[] | null {
  if (u.discrete && u.discrete.length > 0) {
    return u.discrete.filter((v) => v >= lo - 1e-9 && v <= hi + 1e-9);
  }
  // integer
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  const out: number[] = [];
  for (let v = Math.ceil(lo - 1e-9); v <= Math.floor(hi + 1e-9); v += 1) out.push(v);
  return out;
}

/** Cartesian product of value lists, in a fixed (deterministic) order. */
function cartesian(lists: number[][]): number[][] {
  return lists.reduce<number[][]>((acc, list) => acc.flatMap((row) => list.map((v) => [...row, v])), [[]]);
}

/** Round-and-fix fallback: solve the relaxation, snap discrete unknowns, re-solve the rest. */
function roundAndFix(
  built: Problem,
  problem: NumericProblem,
  discreteIdx: number[],
  algorithm: SolveAlgorithm,
  spec: SolveSpec,
  system: UnitSystem,
  backend: SolverBackend,
): SolveResult {
  const relaxed = backend.run(problem);
  const lower = problem.lower.slice();
  const upper = problem.upper.slice();
  const x0 = relaxed.x.slice();
  for (const idx of discreteIdx) {
    const u = built.unknowns[idx];
    const snapped = u.discrete && u.discrete.length > 0
      ? nearest(relaxed.x[idx], u.discrete)
      : clamp(Math.round(relaxed.x[idx]), problem.lower[idx], problem.upper[idx]);
    lower[idx] = snapped;
    upper[idx] = snapped;
    x0[idx] = snapped;
  }
  return interpretRun(backend.run({ ...problem, lower, upper, x0 }), built, algorithm, spec, system);
}

function nearest(value: number, options: number[]): number {
  let best = options[0];
  let bestD = Infinity;
  for (const o of options) {
    const d = Math.abs(o - value);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function noSolution(names: string[], feasible: boolean): CalcError {
  const hint = feasible
    ? "Try different guess values, or loosen a constraint — the solver couldn't reach the target."
    : "The constraints can't be met together. Loosen a constraint or revise the guess values.";
  return makeError("no-solution", "No solution found.", hint);
}

/* ------------------------------------------------------------------ *
 * Linear-system fast path (exact, rank-classified)
 * ------------------------------------------------------------------ */

/**
 * Solve an all-equality `find` block that is provably linear in the unknowns
 * EXACTLY, with precise diagnostics. Returns a {@link SolveResult} when it
 * definitively handles the system (a unique solution, or a typed
 * infinitely-many / inconsistent diagnostic); returns null to fall back to the
 * iterative Newton / least-squares solver (nonlinear systems, or a non-unique
 * system under `onNonConverge: "last"`, which wants a best-effort iterate).
 *
 * The affine model F(x) = A·x + c is read from the existing (unit- and
 * scaling-aware) residual closure by exact evaluation, then VERIFIED at several
 * deterministic probe points — so a nonlinear block is never misrouted here, and
 * the numeric `find` path stays numeric (no isSymbolic involvement). The exact
 * solve prefers `lusolve` (square) or the normal equations (overdetermined, full
 * rank); dimensional consistency is already enforced upstream by buildProblem's
 * unit-aware residual probe.
 */
function tryLinearFind(
  built: Problem,
  spec: SolveSpec,
  system: UnitSystem,
  tol: number,
): SolveResult | null {
  const n = built.unknowns.length;
  const m = built.equalities.length;
  if (n === 0 || m === 0 || built.inequalities.length > 0) return null;
  // The exact linear solve handles only an unbounded, continuous, single-solution
  // find. Defer active box bounds, integer / discrete unknowns, and multi-solution
  // requests to the iterative + enumeration path (solveProblem) — it owns those.
  if ((positiveInt(spec.maxSolutions) ?? 1) > 1) return null;
  if (built.unknowns.some((u) => u.integer || (u.discrete?.length ?? 0) > 0)) return null;
  if (built.lower.some(Number.isFinite) || built.upper.some(Number.isFinite)) return null;

  const F = built.residualVector;
  let c: number[];
  try {
    c = F(new Array(n).fill(0));
  } catch {
    return null;
  }
  if (c.length !== m || !c.every(Number.isFinite)) return null;

  // Coefficient matrix A (m×n): column j is F(eⱼ) − F(0) — exact for an affine F.
  const A: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let j = 0; j < n; j += 1) {
    const e = new Array(n).fill(0);
    e[j] = 1;
    let Fj: number[];
    try {
      Fj = F(e);
    } catch {
      return null;
    }
    if (!Fj.every(Number.isFinite)) return null;
    for (let i = 0; i < m; i += 1) A[i][j] = Fj[i] - c[i];
  }

  // Verify affinity at deterministic probes; bail (→ iterative) if any disagrees.
  const scaleRef = Math.max(1, maxAbs(c), maxAbs(A.flat()));
  const affTol = 1e-6 * scaleRef;
  for (const p of [new Array(n).fill(1), new Array(n).fill(2), new Array(n).fill(-1)]) {
    let Fp: number[];
    try {
      Fp = F(p);
    } catch {
      return null;
    }
    if (!Fp.every(Number.isFinite)) return null;
    for (let i = 0; i < m; i += 1) {
      const model = c[i] + A[i].reduce((s, a, j) => s + a * p[j], 0);
      if (Math.abs(model - Fp[i]) > affTol) return null; // nonlinear ⇒ keep Newton
    }
  }

  // A·x = b, with b = −c (so F(x) = A·x + c = 0).
  const b = c.map((v) => -v);
  const names = built.unknowns.map((u) => u.name);

  // Classify by rank vs augmented-rank (relative tolerance inside matrixRank).
  const rankA = matrixRank(A);
  const rankAug = matrixRank(A.map((row, i) => [...row, b[i]]));
  const lastIterate = (spec.onNonConverge ?? "error") === "last";

  if (rankAug > rankA) {
    // Inconsistent — no assignment satisfies every equation. Under "last", defer
    // to the iterative least-squares best-effort iterate instead of erroring.
    return lastIterate
      ? null
      : { status: "no-solution", algorithm: "find", outputs: [], unknowns: names, error: inconsistentSystem() };
  }
  if (rankA < n) {
    // Rank deficient but consistent — infinitely many solutions; report rather
    // than silently picking one (under "last", defer to the iterative iterate).
    return lastIterate
      ? null
      : { status: "no-solution", algorithm: "find", outputs: [], unknowns: names, error: infiniteSolutions() };
  }

  // Full column rank ⇒ a unique solution. Prefer lusolve (square), else the
  // normal equations (overdetermined, full rank ⇒ square, non-singular).
  let x: number[];
  try {
    x = m === n ? solveLinear(A, b) : solveLinear(matMul(transpose(A), A), matVec(transpose(A), b));
  } catch {
    return null; // numerically singular subsystem ⇒ fall back to the iterative path
  }
  if (!x.every(Number.isFinite)) return null;

  // Defensive: confirm the residual is genuinely ~0 before trusting the result.
  let resid: number[];
  try {
    resid = F(x);
  } catch {
    return null;
  }
  if (!resid.every(Number.isFinite) || maxAbs(resid) > Math.max(tol, 1e-6) * (1 + maxAbs(b))) {
    return null;
  }

  // Reuse the shared interpreter for unit reattachment + formatting.
  return interpretRun(
    { converged: true, x, iterations: 1, residualNorm: l2(resid) },
    built,
    "find",
    spec,
    system,
  );
}

/** Rank of a numeric matrix via row echelon with partial pivoting (relative tol). */
function matrixRank(M: number[][]): number {
  const rows = M.length;
  if (rows === 0) return 0;
  const cols = M[0].length;
  const a = M.map((row) => [...row]); // work on a copy
  const eps = 1e-9 * Math.max(1, maxAbs(a.flat()));
  let rank = 0;
  for (let col = 0; col < cols && rank < rows; col += 1) {
    // Partial pivot: largest magnitude at or below the current rank row.
    let sel = rank;
    let best = Math.abs(a[rank][col]);
    for (let r = rank + 1; r < rows; r += 1) {
      const v = Math.abs(a[r][col]);
      if (v > best) {
        best = v;
        sel = r;
      }
    }
    if (best <= eps) continue; // no pivot in this column
    [a[rank], a[sel]] = [a[sel], a[rank]];
    const pv = a[rank][col];
    for (let r = rank + 1; r < rows; r += 1) {
      const f = a[r][col] / pv;
      if (f === 0) continue;
      for (let c2 = col; c2 < cols; c2 += 1) a[r][c2] -= f * a[rank][c2];
    }
    rank += 1;
  }
  return rank;
}

/* ------------------------------------------------------------------ *
 * Problem building (pure + unit-aware)
 * ------------------------------------------------------------------ */

interface Unknown {
  name: string;
  /** Display unit string the guess carried, or null (dimensionless). */
  unit: string | null;
  /** Restrict to integer values (mixed-integer solve). */
  integer: boolean;
  /** Restrict to this discrete set (magnitudes in `unit`), or null when continuous. */
  discrete: number[] | null;
}

interface Problem {
  unknowns: Unknown[];
  x0: number[];
  lower: number[];
  upper: number[];
  /** Equality residuals only (find system / read-view residual norm). */
  residualVector: (x: number[]) => number[];
  /** Equalities + sqrt(penalty)·max(0,violation) inequality residuals (minerr). */
  lsqResidualVector: (x: number[]) => number[];
  equalities: Equality[];
  inequalities: Inequality[];
  /** Objective closure (minimize / maximize) + inequality penalties, or null. */
  objective: ((x: number[]) => number) | null;
  /** True when bounds + general inequalities hold within `tol`. */
  feasible: (x: number[], tol: number) => boolean;
}

interface BuildError {
  status: "error";
  error: CalcError;
  unknowns: string[];
}

interface Equality {
  /** left − right, reduced to a base number (in left's unit), divided by scale. */
  residual: (scope: Record<string, unknown>) => number;
}

interface Inequality {
  /** Constraint violation: ≤ 0 is feasible, > 0 is infeasible (in scaled units). */
  violation: (scope: Record<string, unknown>) => number;
}

function buildProblem(
  spec: SolveSpec,
  externalScope: Record<string, unknown>,
): Problem | BuildError {
  const scale = positive(spec.scaling) ?? 1;

  // --- unknowns + initial guess (unit-bearing) ------------------------------
  const unknowns: Unknown[] = [];
  const x0: number[] = [];
  const guessSpecs: SolveGuessSpec[] = []; // parallel to unknowns, for first-class bound parsing
  const seen = new Set<string>();
  for (const g of spec.guesses ?? []) {
    const name = g.var?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    let value: unknown;
    try {
      value = math.parse(guessSource(g)).evaluate({ ...externalScope });
    } catch (error) {
      return { status: "error", error: classifyThrow(error), unknowns: [...seen] };
    }
    const integer = !!g.integer;
    const discrete = Array.isArray(g.discrete) && g.discrete.length > 0 ? g.discrete.filter((n) => Number.isFinite(n)) : null;
    if (isUnit(value)) {
      const u = value as Unit;
      const unit = u.formatUnits();
      unknowns.push({ name, unit: unit || null, integer, discrete });
      x0.push(u.toNumber(unit));
      guessSpecs.push(g);
    } else if (typeof value === "number") {
      unknowns.push({ name, unit: null, integer, discrete });
      x0.push(value);
      guessSpecs.push(g);
    } else {
      return {
        status: "error",
        error: makeError(
          "parse",
          `The guess for ${name} isn't a number.`,
          "Use a numeric initial value, e.g. 10 mm or 0.5.",
        ),
        unknowns: [...seen],
      };
    }
  }
  const names = unknowns.map((u) => u.name);
  if (unknowns.length === 0) {
    return { unknowns, x0, lower: [], upper: [], residualVector: () => [], lsqResidualVector: () => [], equalities: [], inequalities: [], objective: null, feasible: () => true };
  }

  const lower = unknowns.map(() => -Infinity);
  const upper = unknowns.map(() => Infinity);
  const indexOf = new Map(names.map((n, i) => [n, i] as const));

  // --- first-class bounds (per-guess lower / upper, unit-bearing) -----------
  // These compose with the box bounds inferred from `var ⋛ const` constraints
  // below: the tightest wins. A bad bound expression / dimensional mismatch
  // surfaces as a typed error (parse / unit-mismatch), like any other source.
  for (let i = 0; i < unknowns.length; i += 1) {
    const g = guessSpecs[i];
    try {
      if (g.lower?.trim()) lower[i] = Math.max(lower[i], boundMagnitude(g.lower, unknowns[i], externalScope));
      if (g.upper?.trim()) upper[i] = Math.min(upper[i], boundMagnitude(g.upper, unknowns[i], externalScope));
    } catch (error) {
      return { status: "error", error: classifyThrow(error), unknowns: names };
    }
    // Clamp the start into the box so the search begins feasible.
    x0[i] = Math.min(upper[i], Math.max(lower[i], x0[i]));
  }

  const bind = (x: number[]): Record<string, unknown> => {
    const s: Record<string, unknown> = { ...externalScope };
    for (let i = 0; i < unknowns.length; i += 1) {
      const u = unknowns[i];
      s[u.name] = u.unit ? math.unit(x[i], u.unit) : x[i];
    }
    return s;
  };

  // --- constraints ----------------------------------------------------------
  const equalities: Equality[] = [];
  const inequalities: Inequality[] = [];

  for (const raw of spec.constraints ?? []) {
    const src = raw?.trim();
    if (!src) continue;
    const split = splitRelational(src);
    if (!split) {
      return {
        status: "error",
        error: makeError(
          "parse",
          `This constraint needs a relation (=, ≤, ≥, <, >): ${src}`,
          "Write each constraint as an equation or inequality.",
        ),
        unknowns: names,
      };
    }
    // Each adjacent (side, op, side) pair is one relation (chained inequalities split here).
    for (let k = 0; k < split.ops.length; k += 1) {
      const leftSrc = split.sides[k];
      const rightSrc = split.sides[k + 1];
      const op = split.ops[k];
      let leftNode: MathNode;
      let rightNode: MathNode;
      try {
        leftNode = math.parse(leftSrc);
        rightNode = math.parse(rightSrc);
      } catch (error) {
        return { status: "error", error: classifyThrow(error), unknowns: names };
      }

      // Reduce (left − right) to a base number in left's unit. Throws on a true
      // dimensional mismatch (classified as `unit-mismatch`), not on conversion.
      const diff = (scope: Record<string, unknown>): number =>
        toScalar(math.subtract(leftNode.evaluate(scope), rightNode.evaluate(scope)) as unknown);

      if (op === "=" || op === "==") {
        equalities.push({ residual: (scope) => diff(scope) / scale });
      } else {
        // Inequality → a one-sided violation (≤0 feasible) + a box bound when it
        // is the simple `var ⋛ const` (or `const ⋛ var`) form.
        const ge = op === ">=" || op === ">";
        inequalities.push({ violation: (scope) => (ge ? -diff(scope) : diff(scope)) / scale });
        applyBoxBound(leftSrc, leftNode, rightSrc, rightNode, op, unknowns, indexOf, lower, upper, externalScope);
      }
    }
  }

  // --- objective (minimize / maximize) -------------------------------------
  let objectiveNode: MathNode | null = null;
  if (spec.objective?.trim()) {
    try {
      objectiveNode = math.parse(spec.objective.trim());
    } catch (error) {
      return { status: "error", error: classifyThrow(error), unknowns: names };
    }
  }

  // --- closures over the numeric vector ------------------------------------
  const residualVector = (x: number[]): number[] => {
    const scope = bind(x);
    return equalities.map((e) => e.residual(scope));
  };
  const penalties = (scope: Record<string, unknown>): number => {
    let p = 0;
    for (const ineq of inequalities) {
      const v = ineq.violation(scope);
      if (Number.isFinite(v) && v > 0) p += v * v;
    }
    return p;
  };
  const lsqResidualVector = (x: number[]): number[] => {
    const scope = bind(x);
    const out = equalities.map((e) => e.residual(scope));
    for (const ineq of inequalities) {
      const v = ineq.violation(scope);
      out.push(v > 0 && Number.isFinite(v) ? Math.sqrt(PENALTY) * v : 0);
    }
    return out;
  };
  const objective = objectiveNode
    ? (x: number[]): number => {
        const scope = bind(x);
        const base = toScalar(objectiveNode!.evaluate(scope));
        return base / scale + PENALTY * penalties(scope);
      }
    : null;
  const feasible = (x: number[], tol: number): boolean => {
    for (let i = 0; i < x.length; i += 1) {
      if (x[i] < lower[i] - tol || x[i] > upper[i] + tol) return false;
    }
    const scope = bind(x);
    for (const ineq of inequalities) {
      const v = ineq.violation(scope);
      if (Number.isFinite(v) && v > tol) return false;
    }
    return true;
  };

  // Probe at x0 to surface structural errors (bad expression / undefined name /
  // unit mismatch) up front with a clear, app-voice message.
  try {
    residualVector(x0);
    bind(x0); // re-bind cheap; inequalities/objective probed below
    for (const ineq of inequalities) ineq.violation(bind(x0));
    if (objective) objective(x0);
  } catch (error) {
    return { status: "error", error: classifyThrow(error), unknowns: names };
  }

  return {
    unknowns,
    x0,
    lower,
    upper,
    residualVector,
    lsqResidualVector,
    equalities,
    inequalities,
    objective,
    feasible,
  };
}

/**
 * When an inequality is the simple `var ⋛ const` (or `const ⋛ var`), capture it
 * as a box bound on that unknown — clamping for Newton and projection for
 * Nelder–Mead. The constant side must not depend on any unknown.
 */
function applyBoxBound(
  leftSrc: string,
  leftNode: MathNode,
  rightSrc: string,
  rightNode: MathNode,
  op: RelOp,
  unknowns: Unknown[],
  indexOf: Map<string, number>,
  lower: number[],
  upper: number[],
  scope: Record<string, unknown>,
): void {
  const leftIdx = indexOf.get(leftSrc.trim());
  const rightIdx = indexOf.get(rightSrc.trim());
  const ge = op === ">=" || op === ">";

  // `var OP const`
  if (leftIdx !== undefined && rightIdx === undefined && constOf(rightNode, indexOf)) {
    const c = toMagnitude(rightNode, unknowns[leftIdx], scope);
    if (c === null) return;
    if (ge) lower[leftIdx] = Math.max(lower[leftIdx], c);
    else upper[leftIdx] = Math.min(upper[leftIdx], c);
    return;
  }
  // `const OP var`  ⇒ flips direction
  if (rightIdx !== undefined && leftIdx === undefined && constOf(leftNode, indexOf)) {
    const c = toMagnitude(leftNode, unknowns[rightIdx], scope);
    if (c === null) return;
    if (ge) upper[rightIdx] = Math.min(upper[rightIdx], c); // const >= var ⇒ var <= const
    else lower[rightIdx] = Math.max(lower[rightIdx], c); // const <= var ⇒ var >= const
  }
}

/** A node that references no unknown — a constant w.r.t. the solve. */
function constOf(node: MathNode, indexOf: Map<string, number>): boolean {
  for (const dep of collectDeps(node)) if (indexOf.has(dep)) return false;
  return true;
}

/** Evaluate a constant node and express it in the unknown's unit magnitude. */
function toMagnitude(node: MathNode, unknown: Unknown, scope: Record<string, unknown>): number | null {
  try {
    const v = node.evaluate({ ...scope });
    if (isUnit(v)) {
      const u = v as Unit;
      return unknown.unit ? u.to(unknown.unit).toNumber(unknown.unit) : u.toNumber(u.formatUnits());
    }
    if (typeof v === "number") return v;
    return null;
  } catch {
    return null;
  }
}

/**
 * Evaluate a first-class bound EXPRESSION to a magnitude in the unknown's unit.
 * Unlike {@link toMagnitude} it THROWS on failure (a parse slip or a true
 * dimensional mismatch) so the caller surfaces a typed error, not a silent drop.
 */
function boundMagnitude(expr: string, unknown: Unknown, scope: Record<string, unknown>): number {
  const v = math.parse(expr).evaluate({ ...scope });
  if (isUnit(v)) {
    const u = v as Unit;
    return unknown.unit ? u.to(unknown.unit).toNumber(unknown.unit) : u.toNumber(u.formatUnits());
  }
  if (typeof v === "number" && Number.isFinite(v)) return v;
  throw new CalcEngineError(
    makeError("parse", `The bound "${expr}" isn't a number.`, "Use a numeric bound, e.g. 0 or 50 mm."),
  );
}

/* ------------------------------------------------------------------ *
 * Default JS backend — Newton / Levenberg–Marquardt / Nelder–Mead
 * ------------------------------------------------------------------ */

export const jsSolverBackend: SolverBackend = {
  run(p: NumericProblem): SolveRun {
    if (p.method === "nelder-mead") return nelderMead(p);
    if (p.method === "newton") {
      const run = newton(p);
      // Singular / stalled Newton falls back to robust least-squares.
      if (run.converged) return run;
      return leastSquares({ ...p, method: "least-squares" }, run.x);
    }
    return leastSquares(p);
  },
};

const clampVec = (x: number[], lo: number[], hi: number[]): number[] =>
  x.map((v, i) => Math.min(hi[i], Math.max(lo[i], v)));

function newton(p: NumericProblem): SolveRun {
  const residuals = p.residuals!;
  let x = clampVec([...p.x0], p.lower, p.upper);
  let F = residuals(x);
  for (let iter = 0; iter < p.maxIter; iter += 1) {
    if (!F.every(Number.isFinite)) return { converged: false, x, iterations: iter, residualNorm: Infinity };
    const fn = l2(F);
    if (maxAbs(F) < p.tol) return { converged: true, x, iterations: iter, residualNorm: fn };

    const J = jacobian(residuals, x, F);
    let dx: number[];
    try {
      dx = solveLinear(J, F.map((v) => -v));
    } catch {
      return { converged: false, x, iterations: iter, residualNorm: fn };
    }
    if (!dx.every(Number.isFinite)) return { converged: false, x, iterations: iter, residualNorm: fn };

    // Damped step: accept the largest fraction that reduces ‖F‖.
    let step = 1;
    let accepted = false;
    for (let ls = 0; ls < 24; ls += 1) {
      const xn = clampVec(x.map((v, i) => v + step * dx[i]), p.lower, p.upper);
      const Fn = residuals(xn);
      if (Fn.every(Number.isFinite) && l2(Fn) < fn) {
        x = xn;
        F = Fn;
        accepted = true;
        break;
      }
      step /= 2;
    }
    if (!accepted) return { converged: maxAbs(F) < p.tol, x, iterations: iter, residualNorm: l2(F) };
  }
  return { converged: maxAbs(F) < p.tol, x, iterations: p.maxIter, residualNorm: l2(F) };
}

function leastSquares(p: NumericProblem, seed?: number[]): SolveRun {
  const residuals = p.residuals!;
  let x = clampVec(seed ? [...seed] : [...p.x0], p.lower, p.upper);
  let F = residuals(x);
  let cost = sumSq(F);
  let lambda = 1e-3;
  let iter = 0;
  for (; iter < p.maxIter; iter += 1) {
    if (!F.every(Number.isFinite)) break;
    if (maxAbs(F) < p.tol) return { converged: true, x, iterations: iter, residualNorm: l2(F) };

    const J = jacobian(residuals, x, F); // m×n
    const JT = transpose(J); // n×m
    const A = matMul(JT, J); // n×n
    const g = matVec(JT, F); // n
    let improved = false;
    for (let tries = 0; tries < 12; tries += 1) {
      const damped = A.map((row, i) => row.map((v, j) => (i === j ? v + lambda * (v || 1) : v)));
      let dx: number[];
      try {
        dx = solveLinear(damped, g.map((v) => -v));
      } catch {
        lambda *= 4;
        continue;
      }
      const xn = clampVec(x.map((v, i) => v + dx[i]), p.lower, p.upper);
      const Fn = residuals(xn);
      const costN = sumSq(Fn);
      if (Fn.every(Number.isFinite) && costN < cost) {
        x = xn;
        F = Fn;
        const rel = (cost - costN) / (cost || 1);
        cost = costN;
        lambda = Math.max(lambda * 0.5, 1e-12);
        improved = true;
        if (rel < p.tol) return { converged: maxAbs(F) < Math.max(p.tol, 1e-6), x, iterations: iter, residualNorm: l2(F) };
        break;
      }
      lambda *= 4;
      if (lambda > 1e12) break;
    }
    if (!improved) break;
  }
  return { converged: maxAbs(F) < Math.max(p.tol, 1e-6), x, iterations: iter, residualNorm: l2(F) };
}

/**
 * Nelder–Mead simplex (deterministic — fixed initial simplex, no randomness).
 * Minimizes `p.objective`; box bounds are enforced by projection on evaluation.
 */
function nelderMead(p: NumericProblem): SolveRun {
  const f0 = p.objective!;
  const f = (x: number[]): number => {
    const xc = clampVec(x, p.lower, p.upper);
    const v = f0(xc);
    return Number.isFinite(v) ? v : 1e15;
  };
  const n = p.x0.length;
  const alpha = 1;
  const gamma = 2;
  const rho = 0.5;
  const sigma = 0.5;

  // Initial simplex: x0 plus a fixed step along each axis.
  const simplex: number[][] = [clampVec([...p.x0], p.lower, p.upper)];
  for (let i = 0; i < n; i += 1) {
    const pt = [...p.x0];
    pt[i] += Math.max(1e-4, Math.abs(p.x0[i]) * 0.05);
    simplex.push(clampVec(pt, p.lower, p.upper));
  }
  const fv = simplex.map(f);

  let iter = 0;
  for (; iter < p.maxIter; iter += 1) {
    // Order by objective.
    const order = fv.map((v, i) => i).sort((a, b) => fv[a] - fv[b]);
    const s = order.map((i) => simplex[i]);
    const fs = order.map((i) => fv[i]);

    // Convergence: simplex + objective spread both tiny. Return the best vertex
    // projected onto the box bounds, so a boundary optimum reads as feasible.
    if (Math.abs(fs[n] - fs[0]) <= p.tol * (Math.abs(fs[0]) + p.tol) && simplexSize(s) <= p.tol * (vecNorm(s[0]) + p.tol)) {
      return { converged: true, x: clampVec(s[0], p.lower, p.upper), iterations: iter, residualNorm: Math.sqrt(Math.max(0, fs[0])) };
    }

    // Centroid of all but the worst.
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) centroid[j] += s[i][j] / n;

    const reflect = centroid.map((c, j) => c + alpha * (c - s[n][j]));
    const fr = f(reflect);
    if (fr < fs[0]) {
      const expand = centroid.map((c, j) => c + gamma * (reflect[j] - c));
      const fe = f(expand);
      replaceWorst(s, fs, fe < fr ? expand : reflect, Math.min(fe, fr));
    } else if (fr < fs[n - 1]) {
      replaceWorst(s, fs, reflect, fr);
    } else {
      const contract = centroid.map((c, j) => c + rho * (s[n][j] - c));
      const fc = f(contract);
      if (fc < fs[n]) {
        replaceWorst(s, fs, contract, fc);
      } else {
        // Shrink toward the best.
        for (let i = 1; i <= n; i += 1) {
          s[i] = s[i].map((v, j) => s[0][j] + sigma * (v - s[0][j]));
          fs[i] = f(s[i]);
        }
      }
    }
    // Write the reordered simplex back.
    for (let i = 0; i <= n; i += 1) {
      simplex[i] = s[i];
      fv[i] = fs[i];
    }
  }
  const best = fv.map((v, i) => i).sort((a, b) => fv[a] - fv[b])[0];
  return { converged: false, x: clampVec(simplex[best], p.lower, p.upper), iterations: iter, residualNorm: Math.sqrt(Math.max(0, fv[best])) };
}

function replaceWorst(s: number[][], fs: number[], pt: number[], fp: number): void {
  s[s.length - 1] = pt;
  fs[fs.length - 1] = fp;
}

/* ------------------------------------------------------------------ *
 * Relational-constraint splitting
 * ------------------------------------------------------------------ */

type RelOp = "<=" | ">=" | "==" | "!=" | "<" | ">" | "=";

/**
 * Split a constraint at its top-level relational operators (paren-depth 0).
 * Returns the `sides` (one more than `ops`) or null when there's no relation.
 * Handles a single relation (`a = b`) and a chained inequality (`lo ≤ x ≤ hi`).
 */
function splitRelational(src: string): { sides: string[]; ops: RelOp[] } | null {
  const sides: string[] = [];
  const ops: RelOp[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
    else if (depth === 0) {
      const two = src.slice(i, i + 2);
      if (two === "<=" || two === ">=" || two === "==" || two === "!=") {
        sides.push(src.slice(start, i));
        ops.push(two as RelOp);
        i += 1;
        start = i + 1;
        continue;
      }
      if ((ch === "<" || ch === ">" || ch === "=") && src[i + 1] !== "=" && src[i - 1] !== ":") {
        sides.push(src.slice(start, i));
        ops.push(ch as RelOp);
        start = i + 1;
      }
    }
  }
  if (ops.length === 0) return null;
  sides.push(src.slice(start));
  if (sides.some((s) => s.trim() === "")) return null;
  return { sides, ops };
}

/* ------------------------------------------------------------------ *
 * Numeric helpers
 * ------------------------------------------------------------------ */

/** A mathjs value → plain number (Unit → its own-unit magnitude). NaN otherwise. */
function toScalar(value: unknown): number {
  if (isUnit(value)) {
    const u = value as Unit;
    return u.toNumber(u.formatUnits());
  }
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/** Finite-difference Jacobian of `fn` at `x` (m×n), reusing F0 = fn(x). */
function jacobian(fn: (x: number[]) => number[], x: number[], F0: number[]): number[][] {
  const n = x.length;
  const m = F0.length;
  const J: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j += 1) {
    const h = 1e-7 * Math.max(1, Math.abs(x[j]));
    const xj = [...x];
    xj[j] += h;
    const Fj = fn(xj);
    for (let i = 0; i < m; i += 1) J[i][j] = (Fj[i] - F0[i]) / h;
  }
  return J;
}

/** Solve A·x = b for a square system via mathjs LU (throws when singular). */
function solveLinear(A: number[][], b: number[]): number[] {
  const sol = math.lusolve(A, b) as unknown;
  const arr = (math.isMatrix(sol) ? (sol as { toArray(): unknown[] }).toArray() : (sol as unknown[]));
  return (arr as unknown[]).map((r) => (Array.isArray(r) ? Number(r[0]) : Number(r)));
}

function transpose(A: number[][]): number[][] {
  if (A.length === 0) return [];
  return A[0].map((_, j) => A.map((row) => row[j]));
}
function matMul(A: number[][], B: number[][]): number[][] {
  return A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
}
function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, v, k) => s + v * x[k], 0));
}
function l2(v: number[]): number {
  return Math.sqrt(sumSq(v));
}
function sumSq(v: number[]): number {
  return v.reduce((s, x) => s + x * x, 0);
}
function maxAbs(v: number[]): number {
  return v.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
}
function vecNorm(v: number[]): number {
  return l2(v);
}
function simplexSize(s: number[][]): number {
  let max = 0;
  for (let i = 1; i < s.length; i += 1) {
    const d = Math.sqrt(s[i].reduce((acc, v, j) => acc + (v - s[0][j]) ** 2, 0));
    if (d > max) max = d;
  }
  return max;
}

function positive(v: number | undefined): number | undefined {
  return v != null && Number.isFinite(v) && v > 0 ? v : undefined;
}
function positiveInt(v: number | undefined): number | undefined {
  return v != null && Number.isFinite(v) && v > 0 ? Math.round(v) : undefined;
}

/** The independent variable(s) a deferred ODE/PDE block nominally binds. */
function odeUnknowns(spec: SolveSpec): string[] {
  return (spec.guesses ?? []).map((g) => g.var?.trim()).filter((n): n is string => !!n);
}

/* ------------------------------------------------------------------ *
 * ODE solution cache (produced by the async worker, read here pure/sync)
 * ------------------------------------------------------------------ */

/**
 * Stable hash of the ODE config + guesses (FNV-1a, 32-bit) — deterministic and
 * dependency-free so the producer and this consumer agree. It deliberately covers
 * only the config TEXT (not scope values); referenced constants are tracked
 * separately via {@link SolveSolutionCache.inputs}. Mirrors `symbolicCacheHash`.
 */
export function odeConfigHash(spec: SolveSpec): string {
  const ode = spec.ode ?? {};
  const canonical = JSON.stringify({
    algorithm: spec.algorithm ?? "find",
    system: (ode.system ?? []).map((s) => s.trim()).filter(Boolean),
    indepVar: (ode.indepVar ?? "x").trim(),
    range: { min: ode.range?.min ?? null, max: ode.range?.max ?? null },
    conditions: (ode.conditions ?? []).map((s) => s.trim()).filter(Boolean),
    step: ode.step ?? null,
    mesh: ode.mesh ?? null,
    guesses: (spec.guesses ?? []).map((g) => ({
      var: g.var?.trim() ?? "",
      value: g.value?.trim() ?? "",
      unit: g.unit?.trim() ?? null,
    })),
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Return the solved result from a fresh cached ODE solution, or null when the
 * cache is absent / stale. Freshness = the config hash matches AND (no live scope
 * — the export path trusts the cache, like tables/plots) OR every referenced
 * constant re-serializes to the same value in the current scope.
 */
function readOdeSolution(
  spec: SolveSpec,
  externalScope: Record<string, unknown>,
): SolveResult | null {
  const cache = spec.solution;
  if (!cache || cache.v !== 1) return null;
  if (cache.hash !== odeConfigHash(spec)) return null;
  if (Object.keys(externalScope).length > 0 && cache.inputs) {
    for (const [name, snapshot] of Object.entries(cache.inputs)) {
      const live = name in externalScope ? serializeForScope(externalScope[name]) : null;
      if (live !== snapshot) return null; // referenced constant changed or vanished
    }
  }
  return {
    status: "solved",
    algorithm: "odesolve",
    outputs: buildOdeOutputs(cache),
    unknowns: odeUnknowns(spec),
  };
}

/**
 * Map a cached solution to solve outputs: the independent-variable samples plus
 * one sampled series per state variable, each as a plain `number[]` so the
 * scope-bridge (`serializeForScope`) folds it into downstream regions and plots.
 */
function buildOdeOutputs(cache: SolveSolutionCache): SolveOutput[] {
  const outputs: SolveOutput[] = [];
  const n = cache.indep.length;
  const t1 = n > 0 ? cache.indep[n - 1] : 0;
  outputs.push({
    name: cache.indepVar,
    value: cache.indep,
    formatted: n > 0
      ? `${n} pts · ${cache.indepVar} ∈ [${formatValue(cache.indep[0])}, ${formatValue(t1)}]`
      : "no samples",
    unit: cache.units?.[cache.indepVar] ?? null,
  });
  for (const name of Object.keys(cache.vars)) {
    const series = cache.vars[name];
    if (!series) continue;
    const last = series.length > 0 ? series[series.length - 1] : 0;
    outputs.push({
      name,
      value: series,
      formatted: `${series.length} pts · ${name}(${formatValue(t1)}) = ${formatValue(last)}`,
      unit: cache.units?.[name] ?? null,
    });
  }
  return outputs;
}
