/**
 * Program dispatcher seam (kept tiny and import-cycle-free).
 *
 * A program region (if/otherwise, for/while, locals, user-defined functions —
 * see {@link ./program}) compiles to a plain JS closure. To make that closure
 * referenceable from ordinary math regions through the UNMODIFIED recalc engine,
 * the bridge layer registers it here under a token and folds the program into the
 * engine as a synthetic function-assignment that delegates to a single static
 * dispatcher: `name(p1, p2) = __quantaProgram("token", p1, p2)`. mathjs resolves
 * `__quantaProgram` from its namespace (registered once, like the matrix helpers),
 * looks the token up here, and calls the closure — so units and values flow
 * through normally and graph.ts / recalc.ts never change.
 *
 * This module deliberately imports nothing from ./math, so math.ts can register
 * the dispatcher without an import cycle (math.ts → program-registry; program.ts →
 * program-registry; flatten → program-registry).
 */

export type ProgramFn = (...args: unknown[]) => unknown;

/**
 * Token → compiled program closure. Populated synchronously by the scope-bridge
 * (`settleTables`) immediately before it drives the engine, and read by the
 * dispatcher during that same synchronous run. Keyed by region id, so a worksheet
 * with N program regions holds N live entries; a token cleared on removal.
 */
const registry = new Map<string, ProgramFn>();

/** Bind (or replace) the closure a token resolves to. */
export function setProgram(token: string, fn: ProgramFn): void {
  registry.set(token, fn);
}

/** Drop a token's closure (region deleted or no longer a callable program). */
export function clearProgram(token: string): void {
  registry.delete(token);
}

/** Replace the whole registry with `tokens` (drops any stale entries first). */
export function syncPrograms(tokens: Map<string, ProgramFn>): void {
  registry.clear();
  for (const [token, fn] of tokens) registry.set(token, fn);
}

/** The dispatcher's lookup — throws a clear message when a token is unbound. */
export function callProgram(token: string, args: unknown[]): unknown {
  const fn = registry.get(token);
  if (!fn) {
    throw new Error(`This program isn't available yet. Recalculate the worksheet.`);
  }
  return fn(...args);
}

/** The mathjs namespace name the synthetic function-assignment delegates to. */
export const DISPATCH_NAME = "__quantaProgram";

/** Register the single static dispatcher on a mathjs instance (called once). */
export function registerProgramDispatcher(mathInstance: {
  import: (fns: Record<string, ProgramFn>, opts: { override: boolean }) => void;
}): void {
  mathInstance.import(
    {
      [DISPATCH_NAME]: (token: unknown, ...args: unknown[]): unknown =>
        callProgram(String(token), args),
    },
    { override: true },
  );
}
