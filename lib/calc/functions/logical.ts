/**
 * Logical family — Excel-style conditionals and boolean combinators.
 *
 * IF / IFS / SWITCH / IFERROR / IFNA are LAZY: they carry `rawArgs` so mathjs
 * hands them the UNEVALUATED argument nodes (`a[0]`) and the evaluation scope
 * (`a[2]`) — the same mechanism `iterators.ts` uses. Laziness matters twice: the
 * untaken branch is never computed, and IFERROR can wrap a call that THROWS (a
 * unit mismatch, an undefined name) and recover. AND / OR / NOT / XOR are eager,
 * variadic boolean reducers. UPPERCASE names keep mathjs's lowercase
 * `and`/`or`/`not`/`xor` intact. PURE and SYNCHRONOUS; no `math` needed.
 */
import type { MathNode } from "mathjs";
import { truthy, asText, magnitude, flattenValues, fail } from "./shared";
import { CalcEngineError } from "../errors";

type Fn = (...args: unknown[]) => unknown;
type RawFn = Fn & { rawArgs?: boolean };

/** Evaluate one raw argument node against the call's scope. */
const evalNode = (node: MathNode, scope: unknown): unknown =>
  node.evaluate(scope as Parameters<MathNode["evaluate"]>[0]);

/** Equality for SWITCH cases: magnitude for numbers/quantities, text otherwise. */
const equalValues = (a: unknown, b: unknown): boolean => {
  if (typeof a === "string" || typeof b === "string") return asText(a) === asText(b);
  return magnitude(a) === magnitude(b);
};

export function makeLogicalFunctions(): Record<string, Fn> {
  const IF: RawFn = (...a) => {
    const args = a[0] as MathNode[];
    const scope = a[2];
    if (args.length < 2 || args.length > 3) {
      fail("domain", "IF takes a condition, a then-value, and an optional else-value.", "Write IF(cond, then, else).");
    }
    if (truthy(evalNode(args[0], scope))) return evalNode(args[1], scope);
    return args.length === 3 ? evalNode(args[2], scope) : false;
  };
  IF.rawArgs = true;

  const IFS: RawFn = (...a) => {
    const args = a[0] as MathNode[];
    const scope = a[2];
    if (args.length < 2 || args.length % 2 !== 0) {
      fail("domain", "IFS needs condition/value pairs.", "Write IFS(c1, v1, c2, v2, …).");
    }
    for (let i = 0; i < args.length; i += 2) {
      if (truthy(evalNode(args[i], scope))) return evalNode(args[i + 1], scope);
    }
    return fail("no-solution", "IFS: no condition was true.", "Add a final true case as a catch-all.");
  };
  IFS.rawArgs = true;

  const SWITCH: RawFn = (...a) => {
    const args = a[0] as MathNode[];
    const scope = a[2];
    if (args.length < 3) {
      fail("domain", "SWITCH needs an expression and at least one case/value pair.", "Write SWITCH(expr, case1, val1, …, default).");
    }
    const subject = evalNode(args[0], scope);
    let i = 1;
    for (; i + 1 < args.length; i += 2) {
      if (equalValues(subject, evalNode(args[i], scope))) return evalNode(args[i + 1], scope);
    }
    if (i < args.length) return evalNode(args[i], scope); // trailing default
    return fail("no-solution", "SWITCH: no case matched and there's no default.", "Add a final default value.");
  };
  SWITCH.rawArgs = true;

  const IFERROR: RawFn = (...a) => {
    const args = a[0] as MathNode[];
    const scope = a[2];
    if (args.length !== 2) fail("domain", "IFERROR takes a value and a fallback.", "Write IFERROR(value, fallback).");
    try {
      return evalNode(args[0], scope);
    } catch {
      return evalNode(args[1], scope);
    }
  };
  IFERROR.rawArgs = true;

  const IFNA: RawFn = (...a) => {
    const args = a[0] as MathNode[];
    const scope = a[2];
    if (args.length !== 2) fail("domain", "IFNA takes a value and a fallback.", "Write IFNA(value, fallback).");
    let v: unknown;
    try {
      v = evalNode(args[0], scope);
    } catch (e) {
      if (e instanceof CalcEngineError && e.calcError.kind === "no-solution") return evalNode(args[1], scope);
      throw e;
    }
    return typeof v === "number" && Number.isNaN(v) ? evalNode(args[1], scope) : v;
  };
  IFNA.rawArgs = true;

  const AND: Fn = (...args) => flattenValues(args).every(truthy);
  const OR: Fn = (...args) => flattenValues(args).some(truthy);
  const NOT: Fn = (v) => !truthy(v);
  const XOR: Fn = (...args) => flattenValues(args).reduce<boolean>((acc, v) => acc !== truthy(v), false);

  return { IF, IFS, SWITCH, IFERROR, IFNA, AND, OR, NOT, XOR };
}
