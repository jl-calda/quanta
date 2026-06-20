/**
 * Symbolic-region detection (pure, synchronous — grammar truth next to the parser).
 *
 * A "symbolic" math region is one whose result must come from the SymPy worker
 * (simplify, factor, solve, integrate, …) rather than the pure numeric engine.
 * The pure engine can't compute these, so during server-side export they read a
 * cached result instead (see lib/worksheet/symbolic-cache). This module is the
 * single place that decides "is this region symbolic?", so the editor producer
 * and the export consumer agree.
 *
 * Detection is by AST CALLEE, not a raw-string regex: the source is normalized
 * (LaTeX → plain text) and split from its `name :=` prefix exactly as the engine
 * does, then parsed; the region is symbolic when any function call in the tree
 * targets a CAS function. This stays robust against a variable literally spelled
 * like a CAS name. No new `→` operator is introduced here (that is a grammar
 * change owned by the symbolic-evaluate session); it is intentionally absent.
 */
import { math } from "./math";
import type { MathNode } from "./math";
import { normalizeSource, splitDefinition } from "./parse";

/** CAS functions that route a region to the SymPy worker (Functional Brief §2). */
const CAS_FUNCTIONS = new Set([
  "simplify",
  "factor",
  "expand",
  "solve",
  "diff",
  "integrate",
  "limit",
  "series",
  "dsolve",
  "gradient",
  "assume",
]);

interface FunctionNodeLike extends MathNode {
  isFunctionNode: true;
  fn: { name?: string };
}
function isFunctionNode(n: MathNode): n is FunctionNodeLike {
  return (n as { isFunctionNode?: boolean }).isFunctionNode === true;
}

/**
 * True when a region's source is a symbolic (SymPy) computation. Pure and
 * synchronous — never touches the worker. Returns false for an empty source or
 * one that doesn't parse (those are handled as ordinary parse errors elsewhere).
 */
export function isSymbolic(source: string): boolean {
  const { expr } = splitDefinition(normalizeSource(source));
  if (!expr) return false;
  let node: MathNode;
  try {
    node = math.parse(expr);
  } catch {
    return false;
  }
  let found = false;
  node.traverse((n) => {
    if (found) return;
    if (isFunctionNode(n) && n.fn?.name && CAS_FUNCTIONS.has(n.fn.name)) found = true;
  });
  return found;
}
