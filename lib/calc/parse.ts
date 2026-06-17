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

/**
 * Normalize incoming source to the engine's plain-text expression form.
 *
 * The primary editor (MathLive) emits LaTeX; a plain-text field is the
 * secondary path. For this milestone the engine consumes plain text directly;
 * `\\`-prefixed LaTeX is a seam to be filled when MathLive is wired in (M3+).
 */
export function normalizeSource(source: string): string {
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
 * (`sqrt`, `max`). Unit literals (`kN`, `mm`) are intentionally KEPT here: many
 * single letters are also mathjs units (`b`, `h`, `t`, `g`…) but engineers use
 * them as variables, and a user-defined name must shadow a unit. The resolution
 * step ({@link filterUnitLiterals}) drops only the references that no region
 * defines AND that are valid units — those are genuine unit literals.
 */
export function collectDeps(node: MathNode): string[] {
  const calleeNames = new Set<string>();
  node.traverse((n) => {
    if (isFunctionNode(n) && n.fn?.name) calleeNames.add(n.fn.name);
  });

  const deps = new Set<string>();
  node.traverse((n) => {
    if (!isSymbolNode(n)) return;
    if (calleeNames.has(n.name)) return;
    deps.add(n.name);
  });
  return [...deps];
}

/**
 * Drop references that are unit literals rather than dependencies: a name no
 * region defines, which mathjs recognizes as a unit (`kN`, `mm`, `MPa`). A name
 * the sheet defines is always kept — definitions shadow units.
 */
export function filterUnitLiterals(
  deps: string[],
  definedNames: Set<string>,
): string[] {
  return deps.filter(
    (name) => definedNames.has(name) || !math.Unit.isValuelessUnit(name),
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
    const node = math.parse(expr);
    return { name, node, deps: collectDeps(node) };
  } catch (error) {
    return { name, node: null, deps: [], error: classifyThrow(error) };
  }
}

/* mathjs node-type guards (its TS types don't narrow `traverse` callbacks). */
interface FunctionNodeLike extends MathNode {
  isFunctionNode: true;
  fn: { name?: string };
}
interface SymbolNodeLike extends MathNode {
  isSymbolNode: true;
  name: string;
}
function isFunctionNode(n: MathNode): n is FunctionNodeLike {
  return (n as { isFunctionNode?: boolean }).isFunctionNode === true;
}
function isSymbolNode(n: MathNode): n is SymbolNodeLike {
  return (n as { isSymbolNode?: boolean }).isSymbolNode === true;
}
