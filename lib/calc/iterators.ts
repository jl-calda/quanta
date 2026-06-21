/**
 * Range variables + live-evaluating iterator operators — summation, product, and
 * the numeric definite integral (Functional Brief §2, Coverage Matrix Part A).
 *
 * These are the Mathcad ∑ / ∏ / ∫ operators and the `a..b` range variable, made
 * to evaluate and recalculate like any other region. They register as functions
 * on the shared mathjs instance (see ./math), so the UNMODIFIED recalc engine
 * evaluates them through `node.evaluate(scope)` and renders them through
 * `node.toTex()` — graph.ts and recalc.ts are untouched.
 *
 * PURE, SYNCHRONOUS, DETERMINISTIC — identical on the client, the Web Worker, and
 * Node (so a summation recomputes during server-side export). It reuses the
 * engine's value model: every body/limit is parsed and evaluated with the shared
 * mathjs instance, so units, matrices, and complex numbers flow through exactly as
 * in a plain math region. Loops are hard-bounded (MAX_ITERATIONS) so a runaway
 * range/sum can't hang the synchronous engine, and failures are typed CalcErrors,
 * never raw throws. Heavy / async symbolic work still belongs behind the Pyodide
 * worker; these are the light, instant operators.
 *
 * Design notes (see DECISIONS.md):
 *  - The iterated operators are NEW names (`summation`, `product`, `integral`),
 *    NOT overrides of mathjs `sum`/`prod`. Overriding would collide with table
 *    aggregates (`=sum(A2,A3,A4,A5)` is a 4-arg call whose first arg is a symbol)
 *    and with statistics that may route through the builtins; new names keep the
 *    builtins 100% intact while the ribbon's ∑/∏ buttons emit the iterated forms.
 *  - `integral` is the DEFINITE, numeric integral; the symbolic indefinite
 *    `integrate` stays on the SymPy path (see symbolic.ts CAS_FUNCTIONS).
 *  - Every `.toTex` is TOTAL (never throws): recalc builds a region's TeX with a
 *    bare `node.toTex()` OUTSIDE its try/catch, so a throwing toTex would crash
 *    the whole sheet sweep. Each handler degrades to a plain functional rendering.
 *  - The runtime `math` instance is passed in (not imported) so this module never
 *    forms an import cycle with ./math — which is the single caller.
 */
import type { MathJsInstance, MathNode, Unit } from "mathjs";
import { CalcEngineError, makeError } from "./errors";
import { isUnit } from "./units";

/** Hard ceiling so a runaway range/loop can never hang the synchronous engine. */
const MAX_ITERATIONS = 100_000;
/** Tiny tolerance so an inclusive integer endpoint is reached despite float drift. */
const EPS = 1e-9;
/** Panel count for composite Simpson (even) — ~1e-9 accuracy on smooth integrands. */
const SIMPSON_PANELS = 1000;

/* ------------------------------------------------------------------ *
 * Evaluation scope — mathjs hands a rawArgs function a scope object. Across
 * versions it may be a plain object or a Map-like; detect the method shape.
 * ------------------------------------------------------------------ */

type IterScope = Record<string, unknown> | Map<string, unknown>;

function scopeHas(s: IterScope, k: string): boolean {
  const a = s as { has?: (k: string) => boolean };
  return typeof a.has === "function" ? a.has(k) : Object.prototype.hasOwnProperty.call(s, k);
}
function scopeGet(s: IterScope, k: string): unknown {
  const a = s as { get?: (k: string) => unknown };
  return typeof a.get === "function" ? a.get(k) : (s as Record<string, unknown>)[k];
}
function scopeSet(s: IterScope, k: string, v: unknown): void {
  const a = s as { set?: (k: string, v: unknown) => void };
  if (typeof a.set === "function") a.set(k, v);
  else (s as Record<string, unknown>)[k] = v;
}
function scopeDelete(s: IterScope, k: string): void {
  const a = s as { delete?: (k: string) => void };
  if (typeof a.delete === "function") a.delete(k);
  else delete (s as Record<string, unknown>)[k];
}

/* ------------------------------------------------------------------ *
 * mathjs node-type guards (its TS types don't narrow rawArgs/toTex args).
 * ------------------------------------------------------------------ */

interface SymbolNodeLike extends MathNode {
  isSymbolNode: true;
  name: string;
}
interface FunctionNodeLike extends MathNode {
  args: MathNode[];
  name?: string;
  fn?: { name?: string };
}
function isSymbolNode(n: MathNode | undefined): n is SymbolNodeLike {
  return !!n && (n as { isSymbolNode?: boolean }).isSymbolNode === true;
}

/** A registered function carrying mathjs's rawArgs flag + custom toTex. */
type EngineFn = {
  (...args: unknown[]): unknown;
  rawArgs?: boolean;
  toTex?: (node: MathNode, options?: object) => string;
};

/* ------------------------------------------------------------------ *
 * Numeric coercions + bounded ranges (shared by every operator).
 * ------------------------------------------------------------------ */

function toNumber(value: unknown, where: string): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (isUnit(value)) return (value as Unit).toNumber((value as Unit).formatUnits());
  throw new CalcEngineError(
    makeError("domain", `The ${where} must be a number.`, "Use a numeric value, e.g. 1 or n."),
  );
}

function loopOverrun(what: string): CalcEngineError {
  return new CalcEngineError(
    makeError(
      "domain",
      `This ${what} ran more than ${MAX_ITERATIONS.toLocaleString()} times.`,
      "Narrow the bounds or widen the step so it terminates.",
    ),
  );
}

/** Inclusive magnitudes `start, start+step, … end`, bounded by MAX_ITERATIONS. */
function rangeMagnitudes(s: number, e: number, step: number): number[] {
  if (step === 0) {
    throw new CalcEngineError(
      makeError("domain", "A range step can't be zero.", "Use a non-zero step, e.g. 1."),
    );
  }
  const count = Math.floor((e - s) / step + EPS) + 1;
  if (!Number.isFinite(count) || count < 1) return [];
  if (count > MAX_ITERATIONS) {
    throw new CalcEngineError(
      makeError(
        "domain",
        `This range would have more than ${MAX_ITERATIONS.toLocaleString()} values.`,
        "Widen the step or narrow the bounds.",
      ),
    );
  }
  const out: number[] = new Array(count);
  for (let i = 0; i < count; i += 1) out[i] = s + i * step;
  return out;
}

/* ------------------------------------------------------------------ *
 * TeX rendering — TOTAL handlers (never throw): see file header / Risk E.
 * ------------------------------------------------------------------ */

function texOf(node: MathNode | undefined, options?: object): string {
  try {
    return node ? node.toTex(options) : "";
  } catch {
    return "";
  }
}
function fnName(node: MathNode): string {
  const f = node as { name?: string; fn?: { name?: string } };
  return f.fn?.name ?? f.name ?? "f";
}
function defaultFnToTex(node: MathNode, options?: object): string {
  try {
    const args = ((node as FunctionNodeLike).args ?? []).map((a) => texOf(a, options)).join(",\\, ");
    return `\\mathrm{${fnName(node)}}\\left(${args}\\right)`;
  } catch {
    return "\\ldots";
  }
}
/** `\sum` / `\prod` with a bound index: 4-arg `(i,lo,hi,body)` or 2-arg `(i,body)`. */
function iteratorToTex(symbol: string, node: MathNode, options?: object): string {
  try {
    const args = (node as FunctionNodeLike).args ?? [];
    if (args.length === 4 && isSymbolNode(args[0])) {
      return `${symbol}_{${texOf(args[0], options)} = ${texOf(args[1], options)}}^{${texOf(
        args[2],
        options,
      )}}\\left(${texOf(args[3], options)}\\right)`;
    }
    if (args.length === 2 && isSymbolNode(args[0])) {
      return `${symbol}_{${texOf(args[0], options)}}\\left(${texOf(args[1], options)}\\right)`;
    }
    return defaultFnToTex(node, options);
  } catch {
    return defaultFnToTex(node, options);
  }
}
function sumToTex(node: MathNode, options?: object): string {
  return iteratorToTex("\\sum", node, options);
}
function prodToTex(node: MathNode, options?: object): string {
  return iteratorToTex("\\prod", node, options);
}
function integralToTex(node: MathNode, options?: object): string {
  try {
    const args = (node as FunctionNodeLike).args ?? [];
    if (args.length === 4 && isSymbolNode(args[0])) {
      return `\\int_{${texOf(args[1], options)}}^{${texOf(args[2], options)}}\\left(${texOf(
        args[3],
        options,
      )}\\right)\\,\\mathrm{d}${texOf(args[0], options)}`;
    }
    return defaultFnToTex(node, options);
  } catch {
    return defaultFnToTex(node, options);
  }
}
/** `__quantaRange(a, b[, step])` → `a .. b` (the Mathcad range notation). */
function rangeToTex(node: MathNode, options?: object): string {
  try {
    const args = (node as FunctionNodeLike).args ?? [];
    if (args.length >= 2) {
      return `${texOf(args[0], options)}\\,..\\,${texOf(args[1], options)}`;
    }
    return defaultFnToTex(node, options);
  } catch {
    return defaultFnToTex(node, options);
  }
}

/* ------------------------------------------------------------------ *
 * Registration — the single caller is ./math.
 * ------------------------------------------------------------------ */

export function registerIteratorFunctions(math: MathJsInstance): void {
  const evalNode = (node: MathNode, scope: IterScope): unknown =>
    node.compile().evaluate(scope as object);

  const isVector = (v: unknown): boolean => math.isMatrix(v) || Array.isArray(v);
  const toItems = (v: unknown): unknown[] => {
    if (math.isMatrix(v)) return (v as { toArray(): unknown[] }).toArray();
    if (Array.isArray(v)) return v as unknown[];
    return [v];
  };

  /** Inclusive integer sequence `lo, lo+1, … hi` as a lazy generator. */
  function* boundedSeq(lo: number, hi: number): Generator<number> {
    for (let i = lo; i <= hi + EPS; i += 1) yield i;
  }

  /**
   * Run a summation/product. Two forms, distinguished by the unevaluated args:
   *   (i, lo, hi, body)  → iterate i = lo..hi (step 1)
   *   (i, body)          → iterate i over the range variable i (a vector in scope)
   * The index is bound in a private window of `scope` and restored afterwards, so
   * it never leaks to other regions.
   */
  const reduce = (op: "sum" | "prod", args: MathNode[], scope: IterScope): unknown => {
    const combine = (op === "prod" ? math.multiply : math.add) as (a: unknown, b: unknown) => unknown;
    const empty: unknown = op === "prod" ? 1 : 0;
    const label = op === "prod" ? "product" : "summation";

    const runOver = (name: string, values: Iterable<unknown>, bodyNode: MathNode): unknown => {
      const body = bodyNode.compile();
      const had = scopeHas(scope, name);
      const prev = had ? scopeGet(scope, name) : undefined;
      let acc: unknown;
      let count = 0;
      try {
        for (const v of values) {
          scopeSet(scope, name, v);
          const term = body.evaluate(scope as object);
          acc = acc === undefined ? term : combine(acc, term);
          if (++count > MAX_ITERATIONS) throw loopOverrun(label);
        }
      } finally {
        if (had) scopeSet(scope, name, prev);
        else scopeDelete(scope, name);
      }
      return acc === undefined ? empty : acc;
    };

    if (args.length === 4 && isSymbolNode(args[0])) {
      const lo = toNumber(evalNode(args[1], scope), `${label} lower limit`);
      const hi = toNumber(evalNode(args[2], scope), `${label} upper limit`);
      return runOver(args[0].name, boundedSeq(lo, hi), args[3]);
    }
    if (args.length === 2 && isSymbolNode(args[0])) {
      const rangeVal = evalNode(args[0], scope);
      if (isVector(rangeVal)) return runOver(args[0].name, toItems(rangeVal), args[1]);
    }
    throw new CalcEngineError(
      makeError(
        "domain",
        `A ${label} needs an index and an expression.`,
        `Write ${label}(i, 1, n, expr), or over a range variable: ${label}(i, expr).`,
      ),
    );
  };

  const summation: EngineFn = (...a: unknown[]) =>
    reduce("sum", a[0] as MathNode[], a[2] as IterScope);
  summation.rawArgs = true;
  summation.toTex = sumToTex;

  const product: EngineFn = (...a: unknown[]) =>
    reduce("prod", a[0] as MathNode[], a[2] as IterScope);
  product.rawArgs = true;
  product.toTex = prodToTex;

  /**
   * Definite numeric integral `integral(x, a, b, f)` via composite Simpson.
   * Unit-aware: if the limits carry a unit, the magnitudes are integrated and the
   * result carries unit(f)·unit(x). `x` is bound privately and restored.
   */
  const integral: EngineFn = (...a: unknown[]) => {
    const args = a[0] as MathNode[];
    const scope = a[2] as IterScope;
    if (args.length !== 4 || !isSymbolNode(args[0])) {
      throw new CalcEngineError(
        makeError(
          "domain",
          "An integral needs a variable, two limits, and an expression.",
          "Write integral(x, a, b, f) — e.g. integral(x, 0, 1, x^2).",
        ),
      );
    }
    const name = args[0].name;
    const aVal = evalNode(args[1], scope);
    const bVal = evalNode(args[2], scope);
    const body = args[3].compile();

    let aMag: number;
    let bMag: number;
    let xUnit: Unit | null;
    if (isUnit(aVal) || isUnit(bVal)) {
      if (!(isUnit(aVal) && isUnit(bVal)) || !(aVal as Unit).equalBase(bVal as Unit)) {
        throw new CalcEngineError(
          makeError(
            "unit-mismatch",
            "The integral limits must share one unit.",
            "Give both limits the same dimension, e.g. 0 m and 2 m.",
          ),
        );
      }
      xUnit = math.unit((aVal as Unit).formatUnits()); // value-1 reference unit
      aMag = (aVal as Unit).toNumber(xUnit.formatUnits());
      bMag = (bVal as Unit).toNumber(xUnit.formatUnits());
    } else {
      aMag = toNumber(aVal, "integral lower limit");
      bMag = toNumber(bVal, "integral upper limit");
      xUnit = null;
    }

    const h = (bMag - aMag) / SIMPSON_PANELS;
    const had = scopeHas(scope, name);
    const prev = had ? scopeGet(scope, name) : undefined;
    let acc: unknown; // running Σ wₖ·f(xₖ), carrying unit(f)
    try {
      for (let k = 0; k <= SIMPSON_PANELS; k += 1) {
        const xMag = aMag + k * h;
        const xVal = xUnit ? math.multiply(xMag, xUnit) : xMag;
        scopeSet(scope, name, xVal);
        const f = body.evaluate(scope as object);
        const w = k === 0 || k === SIMPSON_PANELS ? 1 : k % 2 === 1 ? 4 : 2;
        const term = math.multiply(w as number, f as number);
        acc = acc === undefined ? term : math.add(acc as number, term as number);
      }
    } finally {
      if (had) scopeSet(scope, name, prev);
      else scopeDelete(scope, name);
    }

    if (acc === undefined) return 0;
    let result: unknown = math.multiply(acc as number, h / 3); // Simpson weight
    if (xUnit) result = math.multiply(result as number, xUnit); // dx carries unit(x)
    return result;
  };
  integral.rawArgs = true;
  integral.toTex = integralToTex;

  /**
   * Inclusive range `__quantaRange(start, end[, step])` — the engine target of the
   * `a..b` source produced by `normalizeRanges` (see parse.ts). Plain function
   * (evaluated args). Unit-aware: unit bounds yield a vector of unit values.
   */
  const quantaRange: EngineFn = (...a: unknown[]) => {
    const [start, end, step] = a;
    const stepGiven = step !== undefined;
    if (isUnit(start) || isUnit(end)) {
      if (!(isUnit(start) && isUnit(end)) || !(start as Unit).equalBase(end as Unit)) {
        throw new CalcEngineError(
          makeError(
            "unit-mismatch",
            "A range's bounds must share one unit.",
            "Give the start and end the same dimension, e.g. 0 m .. 5 m.",
          ),
        );
      }
      const ref = math.unit((start as Unit).formatUnits());
      const s = (start as Unit).toNumber(ref.formatUnits());
      const e = (end as Unit).toNumber(ref.formatUnits());
      const st = stepGiven
        ? isUnit(step)
          ? (step as Unit).toNumber(ref.formatUnits())
          : toNumber(step, "range step")
        : 1;
      return math.matrix(
        rangeMagnitudes(s, e, st).map((m) => math.multiply(m, ref)) as Parameters<
          typeof math.matrix
        >[0],
      );
    }
    const s = toNumber(start, "range start");
    const e = toNumber(end, "range end");
    const st = stepGiven ? toNumber(step, "range step") : 1;
    return math.matrix(rangeMagnitudes(s, e, st));
  };
  quantaRange.toTex = rangeToTex;

  math.import(
    { summation, product, integral, __quantaRange: quantaRange } as Record<string, unknown>,
    { override: true },
  );

  // Belt-and-suspenders: ensure the custom toTex is on whatever object mathjs
  // exposes as math[name] (the object FunctionNode reads at render time).
  const ns = math as unknown as Record<string, EngineFn>;
  if (ns.summation) ns.summation.toTex = sumToTex;
  if (ns.product) ns.product.toTex = prodToTex;
  if (ns.integral) ns.integral.toTex = integralToTex;
  if (ns.__quantaRange) ns.__quantaRange.toTex = rangeToTex;
}
