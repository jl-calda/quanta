/**
 * Math family — spreadsheet-style rounding and aggregation the mathjs builtins
 * don't cover under their Excel names (ROUNDUP, MROUND, INT, SUMSQ, …).
 *
 * Registered engine-wide on the shared mathjs instance (see ../math), so they
 * work in both worksheet math regions and table cells. UPPERCASE names keep the
 * lowercase builtins (`round`, `floor`, `mod`, …) 100% intact. Unit-aware: a value
 * with a unit is rounded on its magnitude and the unit is reattached; SUMSQ /
 * SUMPRODUCT let units flow through the arithmetic. PURE and SYNCHRONOUS — the
 * `math` instance is passed in (never imported) to stay cycle-free with ../math.
 */
import type { MathJsInstance } from "mathjs";
import { isUnitLike, magnitude, toNumber, flattenValues, fail } from "./shared";

type Fn = (...args: unknown[]) => unknown;

export function makeMathFunctions(math: MathJsInstance): Record<string, Fn> {
  /** Reattach `original`'s unit (if any) to a freshly computed magnitude. */
  const withUnit = (mag: number, original: unknown): unknown =>
    isUnitLike(original) ? math.unit(mag, original.formatUnits()) : mag;

  /** Round `x` to `digits` decimals, away from (up) or toward (down) zero. */
  const roundDir = (x: number, digits: number, dir: "up" | "down"): number => {
    const f = 10 ** Math.trunc(digits);
    const op = dir === "up" ? Math.ceil : Math.floor;
    return (x < 0 ? -op(-x * f) : op(x * f)) / f;
  };

  const ROUNDUP: Fn = (x, digits = 0) =>
    withUnit(roundDir(magnitude(x), toNumber(digits, "ROUNDUP", "digits"), "up"), x);

  const ROUNDDOWN: Fn = (x, digits = 0) =>
    withUnit(roundDir(magnitude(x), toNumber(digits, "ROUNDDOWN", "digits"), "down"), x);

  /** Nearest multiple of `m` (0 → 0, matching Excel). */
  const MROUND: Fn = (x, m) => {
    const mm = toNumber(m, "MROUND", "multiple");
    if (mm === 0) return withUnit(0, x);
    return withUnit(Math.round(magnitude(x) / mm) * mm, x);
  };

  /** Round up (away from zero) to the nearest multiple of `significance` (default 1). */
  const CEILING: Fn = (x, significance = 1) => {
    const sig = toNumber(significance, "CEILING", "significance");
    if (sig === 0) return withUnit(0, x);
    return withUnit(Math.ceil(magnitude(x) / sig) * sig, x);
  };

  /** Round down (toward zero floor) to the nearest multiple of `significance` (default 1). */
  const FLOOR: Fn = (x, significance = 1) => {
    const sig = toNumber(significance, "FLOOR", "significance");
    if (sig === 0) return withUnit(0, x);
    return withUnit(Math.floor(magnitude(x) / sig) * sig, x);
  };

  /** Round toward negative infinity (Excel INT): INT(-2.5) = -3. Keeps the unit. */
  const INT: Fn = (x) => withUnit(Math.floor(magnitude(x)), x);

  /** Integer part of a / b, truncated toward zero. */
  const QUOTIENT: Fn = (a, b) => {
    const d = toNumber(b, "QUOTIENT", "divisor");
    if (d === 0) fail("domain", "QUOTIENT: can't divide by zero.", "Give a non-zero divisor.");
    return Math.trunc(toNumber(a, "QUOTIENT", "numerator") / d);
  };

  /** Sum of squares (unit² when the inputs carry a unit). */
  const SUMSQ: Fn = (...args) => {
    let acc: unknown;
    for (const v of flattenValues(args)) {
      if (v == null) continue;
      const sq = math.multiply(v as number, v as number);
      acc = acc === undefined ? sq : math.add(acc as number, sq as number);
    }
    return acc === undefined ? 0 : acc;
  };

  /** Sum of element-wise products across equal-length ranges. */
  const SUMPRODUCT: Fn = (...args) => {
    const cols = args.map((a) => flattenValues([a]));
    if (cols.length === 0) return 0;
    const n = cols[0].length;
    if (!cols.every((c) => c.length === n)) {
      fail("domain", "SUMPRODUCT: the ranges have different lengths.", "Give each range the same number of values.");
    }
    let acc: unknown;
    for (let i = 0; i < n; i += 1) {
      let prod: unknown = cols[0][i];
      for (let c = 1; c < cols.length; c += 1) prod = math.multiply(prod as number, cols[c][i] as number);
      acc = acc === undefined ? prod : math.add(acc as number, prod as number);
    }
    return acc === undefined ? 0 : acc;
  };

  return { ROUNDUP, ROUNDDOWN, MROUND, CEILING, FLOOR, INT, QUOTIENT, SUMSQ, SUMPRODUCT };
}
