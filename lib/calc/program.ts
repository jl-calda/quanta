/**
 * Program blocks — inline programs + user-defined functions (Functional Brief §2,
 * Coverage Matrix B8). A program region is the RHS of a Mathcad-style definition:
 * `name(params) := <program>` (a callable function) or `name := <program>` (a
 * value). Its body is a vertical stack of statements — local assignment, an
 * if / else-if / otherwise conditional, a for loop, and a while loop — with an
 * explicit or implicit return.
 *
 * This module is PURE, SYNCHRONOUS, and DETERMINISTIC — identical on the client,
 * the Web Worker, and Node (so a program recomputes during server-side PDF
 * export). It reuses the engine's own value model: every expression inside a
 * statement is parsed and evaluated with the shared mathjs instance, so units,
 * matrices, and complex numbers flow through control flow exactly as they do in a
 * plain math region. It never throws into the UI — every failure is a typed
 * {@link CalcError} — and loops are hard-bounded so a runaway program can't hang
 * the (synchronous) engine.
 *
 * Heavy / async work still belongs behind the Pyodide worker; programs here are
 * the light, instant-recompute construct, like the rest of /lib/calc.
 */
import { math } from "./math";
import type { MathNode } from "./math";
import { classifyThrow, makeError, CalcEngineError } from "./errors";
import { toDisplayUnit, SI_SYSTEM, isUnit } from "./units";
import { formatValue } from "./format";
import type { CalcError, UnitSystem } from "./types";

/* ------------------------------------------------------------------ *
 * Public contract (structurally satisfied by lib/worksheet's ProgramRegion,
 * so the engine stays decoupled from the content tree).
 * ------------------------------------------------------------------ */

export interface ProgramBranch {
  /** Condition expression (math source); the first truthy branch runs. */
  cond: string;
  body: ProgramStatement[];
}

export type ProgramStatement =
  /** Local assignment: `target := expr` (visible to later statements). */
  | { kind: "assign"; target: string; expr: string }
  /** Early return: `return expr` — stops the program with this value. */
  | { kind: "return"; expr: string }
  /** if / else-if / otherwise. */
  | { kind: "if"; branches: ProgramBranch[]; otherwise?: ProgramStatement[] }
  /** Counted loop: `for var ∈ from..to step` (inclusive, unit-bearing bounds ok). */
  | { kind: "for"; var: string; from: string; to: string; step?: string; body: ProgramStatement[] }
  /** Pre-tested loop: `while cond`. */
  | { kind: "while"; cond: string; body: ProgramStatement[] };

export interface ProgramSpec {
  /** Defined name (function or value), e.g. "factorial". */
  name?: string;
  /** Parameter names — non-empty ⇒ the program defines a callable function. */
  params?: string[];
  /** The statement body, evaluated top to bottom. */
  body?: ProgramStatement[];
  /** Display unit for the result of a no-parameter (value) program. */
  unit?: string;
}

export type ProgramStatus = "value" | "function" | "empty" | "error";

export interface ProgramResult {
  status: ProgramStatus;
  /** The defined name, or null when unnamed. */
  name: string | null;
  /** Parameter names (empty for a value program). */
  params: string[];
  /** Raw value (number / Unit / …) of a value program, when it ran. */
  value?: unknown;
  /** Display string carrying the unit (value programs only). */
  formatted?: string;
  /** Unit label of the value, or null when dimensionless. */
  unit?: string | null;
  error?: CalcError;
}

/** Hard ceiling so a runaway loop can never hang the synchronous engine. */
const MAX_ITERATIONS = 100_000;

/* ------------------------------------------------------------------ *
 * Compilation — parse every expression up front (parse errors surface here),
 * then return a closure that runs the body with bound parameters.
 * ------------------------------------------------------------------ */

interface CompiledOk {
  ok: true;
  name: string | null;
  params: string[];
  /** Run the program: bind args to params over `outerScope`, return its value. */
  run: (args: unknown[], outerScope: Record<string, unknown>) => unknown;
}
interface CompiledErr {
  ok: false;
  error: CalcError;
}
export type Compiled = CompiledOk | CompiledErr;

/**
 * Compile a program: validate its shape, parse all statement expressions once
 * (so loops don't re-parse), and hand back a closure. Pure — no scope is touched
 * until `run` is called.
 */
export function compileProgram(spec: ProgramSpec): Compiled {
  const name = spec.name?.trim() || null;
  const params = (spec.params ?? []).map((p) => p.trim()).filter(Boolean);
  const body = spec.body ?? [];

  let compiledBody: CompiledStmt[];
  try {
    compiledBody = compileBlock(body);
  } catch (error) {
    return { ok: false, error: asCalcError(error) };
  }

  const run = (args: unknown[], outerScope: Record<string, unknown>): unknown => {
    const scope: Record<string, unknown> = { ...outerScope };
    params.forEach((p, i) => {
      if (i < args.length) scope[p] = args[i];
    });
    const out = execBlock(compiledBody, scope);
    return out.value;
  };

  return { ok: true, name, params, run };
}

/* ------------------------------------------------------------------ *
 * Public entry — evaluate a program for its read view.
 * ------------------------------------------------------------------ */

/**
 * Evaluate a program region. A parameterised program is a function *definition* —
 * there's nothing to compute standalone, so it reports `function` with its
 * signature (the engine binding is made callable via the scope-bridge). A
 * no-parameter program runs immediately and reports its `value` (unit-aware,
 * formatted like any region result). Never throws — failures are typed errors.
 */
export function evaluateProgram(
  spec: ProgramSpec,
  scope: Record<string, unknown> = {},
  system: UnitSystem = SI_SYSTEM,
): ProgramResult {
  const compiled = compileProgram(spec);
  const name = spec.name?.trim() || null;
  const params = (spec.params ?? []).map((p) => p.trim()).filter(Boolean);

  if (!compiled.ok) {
    return { status: "error", name, params, error: compiled.error };
  }

  if ((spec.body ?? []).length === 0) {
    return { status: "empty", name, params };
  }

  if (params.length > 0) {
    // A callable function — referenced (and run) by other regions, not here.
    return { status: "function", name, params };
  }

  // A value program: run it now over the worksheet scope.
  let value: unknown;
  try {
    value = compiled.run([], scope);
  } catch (error) {
    return { status: "error", name, params, error: asCalcError(error) };
  }

  let formatted: string;
  let display: unknown;
  try {
    display = toDisplayUnit(value, spec.unit, system);
    formatted = formatValue(display);
  } catch (error) {
    return { status: "error", name, params, error: asCalcError(error) };
  }

  return {
    status: "value",
    name,
    params,
    value,
    formatted,
    unit: isUnit(value) ? (value.formatUnits() || null) : null,
  };
}

/* ------------------------------------------------------------------ *
 * Compiled statements — the parsed, ready-to-run form.
 * ------------------------------------------------------------------ */

type CompiledStmt =
  | { kind: "assign"; target: string; node: MathNode }
  | { kind: "return"; node: MathNode }
  | { kind: "if"; branches: { node: MathNode; body: CompiledStmt[] }[]; otherwise: CompiledStmt[] | null }
  | { kind: "for"; varName: string; from: MathNode; to: MathNode; step: MathNode | null; body: CompiledStmt[] }
  | { kind: "while"; cond: MathNode; body: CompiledStmt[] };

function compileBlock(stmts: ProgramStatement[]): CompiledStmt[] {
  return stmts.map(compileStmt);
}

function compileStmt(stmt: ProgramStatement): CompiledStmt {
  switch (stmt.kind) {
    case "assign": {
      const target = stmt.target?.trim();
      if (!target) throw makeError("parse", "A local assignment needs a name.", "Name the value on the left of :=.");
      return { kind: "assign", target, node: parseExpr(stmt.expr) };
    }
    case "return":
      return { kind: "return", node: parseExpr(stmt.expr) };
    case "if": {
      const branches = (stmt.branches ?? []).map((b) => ({
        node: parseExpr(b.cond),
        body: compileBlock(b.body ?? []),
      }));
      if (branches.length === 0) {
        throw makeError("parse", "This 'if' has no condition.", "Add a condition, e.g. x > 0.");
      }
      return { kind: "if", branches, otherwise: stmt.otherwise ? compileBlock(stmt.otherwise) : null };
    }
    case "for": {
      const varName = stmt.var?.trim();
      if (!varName) throw makeError("parse", "This 'for' loop needs a counter name.", "Name the loop variable, e.g. i.");
      return {
        kind: "for",
        varName,
        from: parseExpr(stmt.from),
        to: parseExpr(stmt.to),
        step: stmt.step?.trim() ? parseExpr(stmt.step) : null,
        body: compileBlock(stmt.body ?? []),
      };
    }
    case "while":
      return { kind: "while", cond: parseExpr(stmt.cond), body: compileBlock(stmt.body ?? []) };
    default: {
      // Exhaustiveness guard for future statement kinds.
      const bad = stmt as { kind?: string };
      throw makeError("parse", `Unknown program statement: ${bad.kind ?? "?"}.`, "Use assign, if, for, while, or return.");
    }
  }
}

function parseExpr(src: string | undefined): MathNode {
  const text = (src ?? "").trim();
  if (text.length === 0) {
    throw makeError("parse", "This program line is empty.", "Type an expression, or remove the line.");
  }
  try {
    return math.parse(text);
  } catch (error) {
    throw asCalcError(error);
  }
}

/* ------------------------------------------------------------------ *
 * Execution — a small tree-walking interpreter over the compiled body.
 *
 * `value` is the running result (Mathcad: the last evaluated line); `returned`
 * short-circuits the whole program when an explicit `return` fires.
 * ------------------------------------------------------------------ */

interface ExecOut {
  returned: boolean;
  value: unknown;
}

function execBlock(stmts: CompiledStmt[], scope: Record<string, unknown>): ExecOut {
  let value: unknown;
  for (const stmt of stmts) {
    const out = execStmt(stmt, scope);
    value = out.value;
    if (out.returned) return { returned: true, value };
  }
  return { returned: false, value };
}

function execStmt(stmt: CompiledStmt, scope: Record<string, unknown>): ExecOut {
  switch (stmt.kind) {
    case "assign": {
      const v = stmt.node.evaluate(scope);
      scope[stmt.target] = v;
      return { returned: false, value: v };
    }
    case "return":
      return { returned: true, value: stmt.node.evaluate(scope) };
    case "if": {
      for (const branch of stmt.branches) {
        if (toBool(branch.node.evaluate(scope))) return execBlock(branch.body, scope);
      }
      if (stmt.otherwise) return execBlock(stmt.otherwise, scope);
      return { returned: false, value: undefined };
    }
    case "for":
      return execFor(stmt, scope);
    case "while":
      return execWhile(stmt, scope);
  }
}

function execFor(
  stmt: Extract<CompiledStmt, { kind: "for" }>,
  scope: Record<string, unknown>,
): ExecOut {
  const from = toNumber(stmt.from.evaluate(scope), "for-loop start");
  const to = toNumber(stmt.to.evaluate(scope), "for-loop end");
  const step = stmt.step ? toNumber(stmt.step.evaluate(scope), "for-loop step") : 1;
  if (step === 0) {
    throw makeError("domain", "A for-loop step can't be zero.", "Use a non-zero step.");
  }
  let value: unknown;
  let count = 0;
  for (let i = from; step > 0 ? i <= to + EPS : i >= to - EPS; i += step) {
    scope[stmt.varName] = i;
    const out = execBlock(stmt.body, scope);
    value = out.value;
    if (out.returned) return { returned: true, value };
    if (++count > MAX_ITERATIONS) throw loopOverrun();
  }
  return { returned: false, value };
}

function execWhile(
  stmt: Extract<CompiledStmt, { kind: "while" }>,
  scope: Record<string, unknown>,
): ExecOut {
  let value: unknown;
  let count = 0;
  while (toBool(stmt.cond.evaluate(scope))) {
    const out = execBlock(stmt.body, scope);
    value = out.value;
    if (out.returned) return { returned: true, value };
    if (++count > MAX_ITERATIONS) throw loopOverrun();
  }
  return { returned: false, value };
}

/* ------------------------------------------------------------------ *
 * Coercions + helpers
 * ------------------------------------------------------------------ */

/** Tiny tolerance so a unit-step counted loop reaches its inclusive endpoint. */
const EPS = 1e-9;

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0 && !Number.isNaN(value);
  if (isUnit(value)) return value.toNumber(value.formatUnits()) !== 0;
  throw makeError(
    "domain",
    "A condition must be true or false.",
    "Use a comparison like i <= n.",
  );
}

function toNumber(value: unknown, where: string): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (isUnit(value)) return value.toNumber(value.formatUnits());
  throw makeError("domain", `The ${where} must be a number.`, "Use a numeric bound, e.g. 1 or n.");
}

function loopOverrun(): CalcEngineError {
  return new CalcEngineError(
    makeError(
      "domain",
      `This program looped more than ${MAX_ITERATIONS.toLocaleString()} times.`,
      "Check the loop bound or while-condition so it terminates.",
    ),
  );
}

/** mathjs / engine throw → typed CalcError (CalcEngineError carries one already). */
function asCalcError(error: unknown): CalcError {
  if (error instanceof CalcEngineError) return error.calcError;
  if (isCalcError(error)) return error;
  return classifyThrow(error);
}

function isCalcError(value: unknown): value is CalcError {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string"
  );
}
