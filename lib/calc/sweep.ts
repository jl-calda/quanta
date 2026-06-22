/**
 * Parametric-sweep engine (Functional Brief §2 "sensitivity / parametric study").
 *
 * A sweep varies one parameter across a bounded range and, at each step, overrides
 * that parameter in the worksheet scope and evaluates a set of output expressions —
 * producing a unit-aware SERIES per output. It is PURE, SYNCHRONOUS, and
 * DETERMINISTIC (client = worker = Node), and it deliberately REUSES the plot's
 * by-formula sampler (`resolveSampling` + `sweep` from `./plot`) rather than adding
 * a second sampler. Named outputs fold into worksheet scope as vector series
 * through the same scope-bridge tables and solve blocks use, so a downstream plot
 * or table can consume them by name.
 *
 * Solved-block variables are HELD at their settled value here — a sweep does NOT
 * re-run a solve per step (that is a deferred refinement; see `targetSolve` /
 * `reSolvePerStep`, which round-trip but are inert this slice). Steps are bounded
 * by an explicit count or step size; a zero/negative step or an absurd count is a
 * typed `CalcError`, never a thrown exception.
 */
import { math } from "./math";
import type { Unit } from "./math";
import { isUnit, SI_SYSTEM } from "./units";
import { resolveSampling, sweep, toAxisNumber } from "./plot";
import { CalcEngineError, classifyThrow, makeError } from "./errors";
import type { CalcError, UnitSystem } from "./types";

/** Hard cap on sample points — matches the plot sampler's own clamp. */
const STEPS_CAP = 400;
const DEFAULT_STEPS = 21;

/* ------------------------------------------------------------------ *
 * Input contract (structurally satisfied by lib/worksheet's SweepRegion).
 * ------------------------------------------------------------------ */

export interface SweepOutputSpec {
  /** Expression sampled across the parameter, e.g. "M(L)" or "sigma". */
  expr: string;
  /** Name this series binds in worksheet scope (so a plot/table can consume it); display-only when empty. */
  name?: string;
  /** Optional display label (defaults to the expression). */
  label?: string;
  /** Optional display unit; inferred from the result when omitted. */
  unit?: string;
}

export interface SweepSpec {
  /** The swept parameter's name. */
  param: string;
  /** Range start / end (unit-bearing expressions, e.g. "0", "L", "5 mm"). */
  from: string;
  to: string;
  /** Sample COUNT (>= 2). Ignored when `stepSize` is set. */
  steps?: number;
  /** Explicit step (unit-bearing expression); derives the count when set. */
  stepSize?: string;
  /** Linear (default) or geometric (log) spacing. */
  scale?: "linear" | "log";
  outputs: SweepOutputSpec[];
  /** Typed-but-inert seam — re-solve a solve block per step (deferred; ignored here). */
  targetSolve?: string;
  reSolvePerStep?: boolean;
}

export interface SweepSeries {
  /** Scope name (param, or a named output), or null for a display-only column. */
  name: string | null;
  label: string;
  unit: string | null;
  /** Display-unit numbers, one per sample. */
  values: number[];
}

export type SweepStatus = "ok" | "empty" | "error";

export interface SweepResult {
  status: SweepStatus;
  /** The swept parameter's display series. */
  param: SweepSeries;
  /** One display series per output expression. */
  columns: SweepSeries[];
  /** Number of samples. */
  rows: number;
  /** Named vector series (param + named outputs) folded into scope by the bridge. */
  exports: Record<string, unknown>;
  error?: CalcError;
}

/* ------------------------------------------------------------------ *
 * Public entry
 * ------------------------------------------------------------------ */

export function evaluateSweep(
  spec: SweepSpec,
  externalScope: Record<string, unknown> = {},
  system: UnitSystem = SI_SYSTEM,
): SweepResult {
  const param = spec.param?.trim();
  const outputs = (spec.outputs ?? []).filter((o) => o.expr?.trim());
  const emptyParam: SweepSeries = { name: param || null, label: param || "x", unit: null, values: [] };

  if (!param || outputs.length === 0) {
    return { status: "empty", param: emptyParam, columns: [], rows: 0, exports: {} };
  }

  // --- range endpoints (unit-bearing) --------------------------------------
  let fromVal: unknown;
  let toVal: unknown;
  try {
    fromVal = math.parse(spec.from?.trim() || "0").evaluate({ ...externalScope });
    toVal = math.parse(spec.to?.trim() || "0").evaluate({ ...externalScope });
  } catch (error) {
    return errorResult(emptyParam, classifyThrow(error));
  }
  const unit = unitOf(fromVal) ?? unitOf(toVal);
  let fromMag: number;
  let toMag: number;
  try {
    fromMag = magnitudeIn(fromVal, unit);
    toMag = magnitudeIn(toVal, unit);
  } catch (error) {
    return errorResult({ ...emptyParam, unit }, classifyThrow(error));
  }

  // --- sample count (from steps or step size), validated -------------------
  const counted = resolveCount(spec, fromMag, toMag, unit, externalScope);
  if ("error" in counted) return errorResult({ ...emptyParam, unit }, counted.error);

  // --- parameter grid via the REUSED plot sampler --------------------------
  const scale = spec.scale === "log" ? "log" : "linear";
  const sampling = resolveSampling(undefined, { min: fromMag, max: toMag, unit: unit ?? undefined }, scale, false, counted.count, externalScope, system);
  if (sampling.error) return errorResult({ ...emptyParam, unit }, sampling.error);
  if (sampling.display.length === 0) {
    return errorResult({ ...emptyParam, unit }, makeError("domain", "The sweep range is empty.", "Set distinct from and to values."));
  }

  const paramSeries: SweepSeries = { name: param, label: param, unit: unit ?? null, values: sampling.display };
  const exports: Record<string, unknown> = {};
  // Export the parameter domain as a unit-bearing vector (Mathcad range-variable style).
  exports[param] = sampling.raw.slice();

  // --- each output via the REUSED sweep() evaluator ------------------------
  const columns: SweepSeries[] = [];
  let firstError: CalcError | undefined;
  for (const out of outputs) {
    const label = out.label?.trim() || out.expr.trim();
    const name = out.name?.trim() || null;
    const explicitUnit = out.unit?.trim() || null;

    let pairs: { x: number; raw: unknown }[];
    try {
      pairs = sweep(math.parse(out.expr.trim()), undefined, sampling, param, externalScope);
    } catch (error) {
      if (!firstError) firstError = classifyThrow(error);
      columns.push({ name, label, unit: explicitUnit, values: [] });
      continue;
    }

    let inferredUnit = explicitUnit;
    const values: number[] = [];
    for (const p of pairs) {
      if (!inferredUnit && isUnit(p.raw)) inferredUnit = (p.raw as Unit).formatUnits() || null;
      const n = safeAxisNumber(p.raw, explicitUnit ?? undefined, system);
      if (Number.isFinite(n)) values.push(n);
    }
    columns.push({ name, label, unit: inferredUnit, values });

    // Export the raw series ONLY when gap-free, so it aligns 1:1 with the param grid.
    if (name && pairs.length === sampling.display.length) {
      exports[name] = pairs.map((p) => p.raw);
    }
  }

  // Every output failed structurally (e.g. an undefined name) ⇒ surface the error.
  if (columns.every((c) => c.values.length === 0) && firstError) {
    return { status: "error", param: paramSeries, columns, rows: sampling.display.length, exports, error: firstError };
  }
  return { status: "ok", param: paramSeries, columns, rows: sampling.display.length, exports };
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function resolveCount(
  spec: SweepSpec,
  fromMag: number,
  toMag: number,
  unit: string | null,
  scope: Record<string, unknown>,
): { count: number } | { error: CalcError } {
  const stepRaw = spec.stepSize?.trim();
  if (stepRaw) {
    let stepMag: number;
    try {
      stepMag = magnitudeIn(math.parse(stepRaw).evaluate({ ...scope }), unit);
    } catch (error) {
      return { error: classifyThrow(error) };
    }
    if (!Number.isFinite(stepMag) || stepMag <= 0) {
      return { error: makeError("domain", "The sweep step must be greater than zero.", "Set a positive step size.") };
    }
    const span = Math.abs(toMag - fromMag);
    const count = Math.floor(span / stepMag + 1e-9) + 1;
    if (count < 2) return { error: makeError("domain", "The sweep range is too small for that step.", "Use a smaller step or a wider range.") };
    if (count > STEPS_CAP) return { error: makeError("domain", `That step makes ${count} points (max ${STEPS_CAP}).`, "Use a larger step or a narrower range.") };
    return { count };
  }

  const steps = spec.steps;
  if (steps == null) return { count: DEFAULT_STEPS };
  if (!Number.isFinite(steps) || steps < 2) {
    return { error: makeError("domain", "A sweep needs at least 2 points.", "Set the number of points to 2 or more.") };
  }
  if (steps > STEPS_CAP) {
    return { error: makeError("domain", `Too many sweep points (max ${STEPS_CAP}).`, `Set the number of points to ${STEPS_CAP} or fewer.`) };
  }
  return { count: Math.round(steps) };
}

/** The unit label of a value, or null when dimensionless. */
function unitOf(value: unknown): string | null {
  return isUnit(value) ? (value as Unit).formatUnits() || null : null;
}

/** Reduce a value to a magnitude in `unit` (throws unit-mismatch / parse on failure). */
function magnitudeIn(value: unknown, unit: string | null): number {
  if (isUnit(value)) {
    const u = value as Unit;
    return unit ? u.to(unit).toNumber(unit) : u.toNumber(u.formatUnits());
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new CalcEngineError(
    makeError("parse", "The sweep range must be numeric.", "Use numeric from / to values, e.g. 0 and 10."),
  );
}

/** `toAxisNumber` that never throws — a bad point becomes NaN (a gap), not a crash. */
function safeAxisNumber(raw: unknown, unit: string | undefined, system: UnitSystem): number {
  try {
    return toAxisNumber(raw, unit, system);
  } catch {
    return NaN;
  }
}

function errorResult(param: SweepSeries, error: CalcError): SweepResult {
  return { status: "error", param, columns: [], rows: 0, exports: {}, error };
}
