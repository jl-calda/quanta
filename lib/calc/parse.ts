/**
 * Parsing: raw source → name + AST + dependencies.
 *
 * A region's source is either a DEFINITION (`name := expr`, the `:=` produced by
 * the Mathcad keymap from a typed `:`) or an EVALUATION (`expr`, shown as a
 * value). We split the name from the expression, parse the right-hand side to a
 * mathjs AST, and collect the variable names it references so the dependency
 * graph can be built. Pure: no scope is consulted here.
 */
import { math } from "./math";
import type { MathNode } from "./math";
import { classifyThrow } from "./errors";
import { latexToSource } from "./latex";
import type { CalcError } from "./types";

export interface ParsedRegion {
  /** Defined name (`N_Rd`), or `null` for a bare evaluation. */
  name: string | null;
  /** AST of the right-hand side, or `null` when parsing failed. */
  node: MathNode | null;
  /** Variable names referenced by the expression (units & callees excluded). */
  deps: string[];
  /** Parse error, if the source could not be read. */
  error?: CalcError;
}

/** Identifier allowed on the left of an assignment, incl. subscripts (`N_Rd`). */
const NAME = "[A-Za-z\\u0370-\\u03FF][A-Za-z0-9_\\u0370-\\u03FF]*";
// `*` (not `+`) so `x :=` is recognized as an (empty) definition, not an
// evaluation — parseRegion then reports the empty region with a clear message.
const ASSIGN_WALRUS = new RegExp(`^\\s*(${NAME})\\s*:=\\s*([\\s\\S]*)$`);
// Secondary plain-text form: a single `:` after a bare name (ranges use `..`).
const ASSIGN_COLON = new RegExp(`^\\s*(${NAME})\\s*:(?!=)\\s*([\\s\\S]+)$`);

/** Constructs that only appear in LaTeX, never in the engine's plain text. */
const LATEX_SIGNAL = /[\\{}~]/;

/* ------------------------------------------------------------------ *
 * Range variables — `a..b` (and stepped `a, s .. b`) → an inclusive
 * `__quantaRange(...)` call the engine evaluates (see ./iterators). The Mathcad
 * `..` operator has no mathjs equivalent, so we rewrite it to a function call
 * before parsing. Operates on a bare EXPRESSION (callers split the `name :=`
 * prefix first), so the stepped-form anchor comma is never confused with the
 * assignment. `..`-gated and TOTAL: returns the input unchanged when there is no
 * top-level range, leaving any malformed `..` for the parser to flag.
 * ------------------------------------------------------------------ */

/** Index of the first top-level `..` (bracket depth 0), or -1. */
function findTopLevelRangeOp(expr: string): number {
  let depth = 0;
  for (let i = 0; i < expr.length - 1; i += 1) {
    const c = expr[i];
    if (c === "(" || c === "[" || c === "{") depth += 1;
    else if (c === ")" || c === "]" || c === "}") depth -= 1;
    else if (depth === 0 && c === "." && expr[i + 1] === ".") return i;
  }
  return -1;
}

/** Index of the first top-level comma (bracket depth 0), or -1. */
function findTopLevelComma(expr: string): number {
  let depth = 0;
  for (let i = 0; i < expr.length; i += 1) {
    const c = expr[i];
    if (c === "(" || c === "[" || c === "{") depth += 1;
    else if (c === ")" || c === "]" || c === "}") depth -= 1;
    else if (depth === 0 && c === ",") return i;
  }
  return -1;
}

/** Rewrite the Mathcad `..` range operator in an expression to `__quantaRange(...)`. */
export function normalizeRanges(expr: string): string {
  if (!expr.includes("..")) return expr;
  const op = findTopLevelRangeOp(expr);
  if (op === -1) return expr;

  const left = expr.slice(0, op).trim();
  const right = normalizeRanges(expr.slice(op + 2)).trim();
  if (!left || !right) return expr; // half-typed `..x` / `x..` — let the parser flag it

  const comma = findTopLevelComma(left);
  if (comma !== -1) {
    const first = left.slice(0, comma).trim();
    const second = left.slice(comma + 1).trim();
    if (first && second) {
      return `__quantaRange(${first}, ${right}, (${second})-(${first}))`;
    }
  }
  return `__quantaRange(${left}, ${right})`;
}

/**
 * Normalize incoming source to the engine's plain-text expression form.
 *
 * The primary editor (MathLive) emits LaTeX; a plain-text field is the
 * secondary path. The plain-text grammar never contains a backslash, brace, or
 * `~`, so those are an unambiguous LaTeX signal: convert that input to plain
 * text ({@link latexToSource}); otherwise just trim. The editor's MathLive
 * commit path normalizes up front, so this is also a defensive seam — the
 * engine stays correct if LaTeX ever reaches it directly.
 */
export function normalizeSource(source: string): string {
  if (LATEX_SIGNAL.test(source)) return latexToSource(source);
  return source.trim();
}

/** Split `name := expr` / `name : expr` into its parts. No match ⇒ evaluation. */
export function splitDefinition(
  source: string,
): { name: string | null; expr: string } {
  const walrus = source.match(ASSIGN_WALRUS);
  if (walrus) return { name: walrus[1], expr: walrus[2].trim() };
  const colon = source.match(ASSIGN_COLON);
  if (colon) return { name: colon[1], expr: colon[2].trim() };
  return { name: null, expr: source };
}

/**
 * Collect every variable name an AST references, excluding only function callees
 * (`sqrt`, `max`) and the bound parameters of any function definition it contains
 * (`f(x) = …` — `x` is local, not a worksheet dependency). Unit literals (`kN`,
 * `mm`) are intentionally KEPT here: many single letters are also mathjs units
 * (`b`, `h`, `t`, `g`…) but engineers use them as variables, and a user-defined
 * name must shadow a unit. The resolution step ({@link filterUnitLiterals}) drops
 * only the references that no region defines AND that are valid units — those are
 * genuine unit literals.
 */
export function collectDeps(node: MathNode): string[] {
  const calleeNames = new Set<string>();
  const boundParams = new Set<string>();
  node.traverse((n) => {
    if (isFunctionNode(n) && n.fn?.name) {
      calleeNames.add(n.fn.name);
      // An iterator's index is bound locally, not a worksheet dependency:
      // `summation(i, 1, n, i^2)` depends on `n`, never `i`. The range-driven
      // 2-arg form `summation(i, expr)` keeps `i` (it IS the range variable).
      const bound = iteratorBoundVar(n);
      if (bound) boundParams.add(bound);
    }
    if (isFunctionAssignmentNode(n)) for (const p of n.params) boundParams.add(p);
  });

  const deps = new Set<string>();
  node.traverse((n) => {
    if (!isSymbolNode(n)) return;
    if (calleeNames.has(n.name)) return;
    if (boundParams.has(n.name)) return;
    deps.add(n.name);
  });
  return [...deps];
}

/**
 * Built-in symbols that resolve at evaluation time but are NOT worksheet
 * dependencies. The imaginary unit `i` is the key case: mathjs parses `3 + 4i`
 * as `3 + 4*i` (a `SymbolNode`), and without this it would be flagged as an
 * undefined name before evaluation. Like a unit literal, it is only dropped when
 * no region defines it — a sheet that uses `i` as its own variable still shadows
 * it. (Numeric constants such as `e`/`pi` are already handled downstream because
 * mathjs exposes them as numbers.)
 */
const BUILTIN_CONSTANTS = new Set(["i"]);

/**
 * Drop references that are unit literals or built-in constants rather than
 * dependencies: a name no region defines, which mathjs recognizes as a unit
 * (`kN`, `mm`, `MPa`) or as the imaginary unit `i`. A name the sheet defines is
 * always kept — definitions shadow units and constants.
 */
export function filterUnitLiterals(
  deps: string[],
  definedNames: Set<string>,
): string[] {
  return deps.filter(
    (name) =>
      definedNames.has(name) ||
      (!math.Unit.isValuelessUnit(name) && !BUILTIN_CONSTANTS.has(name)),
  );
}

export function parseRegion(source: string): ParsedRegion {
  const normalized = normalizeSource(source);
  const { name, expr } = splitDefinition(normalized);

  if (expr.length === 0) {
    return {
      name,
      node: null,
      deps: [],
      error: {
        kind: "parse",
        message: "This region is empty.",
        fixHint: name
          ? `Give ${name} a value, e.g. ${name} := 0.`
          : "Type a formula to evaluate.",
      },
    };
  }

  try {
    const node = math.parse(normalizeRanges(expr));
    return { name, node, deps: collectDeps(node) };
  } catch (error) {
    return { name, node: null, deps: [], error: classifyThrow(error) };
  }
}

/**
 * The locally-bound index of an iterator call, or null. The index of a 4-arg
 * `summation`/`product` (`(i, lo, hi, body)`) and of any `integral`
 * (`(x, a, b, f)`) is bound, not a dependency. The 2-arg `summation(i, expr)`
 * form returns null — there `i` is a real range-variable reference.
 */
function iteratorBoundVar(n: FunctionNodeLike): string | null {
  const name = n.fn?.name;
  const first = n.args?.[0];
  if (!isSymbolNode(first)) return null;
  if ((name === "summation" || name === "product") && n.args?.length === 4) return first.name;
  if (name === "integral") return first.name;
  return null;
}

/* mathjs node-type guards (its TS types don't narrow `traverse` callbacks). */
interface FunctionNodeLike extends MathNode {
  isFunctionNode: true;
  fn: { name?: string };
  args: MathNode[];
}
interface SymbolNodeLike extends MathNode {
  isSymbolNode: true;
  name: string;
}
interface FunctionAssignmentNodeLike extends MathNode {
  isFunctionAssignmentNode: true;
  params: string[];
}
function isFunctionNode(n: MathNode): n is FunctionNodeLike {
  return (n as { isFunctionNode?: boolean }).isFunctionNode === true;
}
function isSymbolNode(n: MathNode): n is SymbolNodeLike {
  return (n as { isSymbolNode?: boolean }).isSymbolNode === true;
}
function isFunctionAssignmentNode(n: MathNode): n is FunctionAssignmentNodeLike {
  return (n as { isFunctionAssignmentNode?: boolean }).isFunctionAssignmentNode === true;
}
