/**
 * Statistical family — counts, criteria aggregates, and means the mathjs builtins
 * (`mean`, `median`, `std`, …) don't cover under their Excel names.
 *
 * Registered engine-wide under UPPERCASE names (see ../index). Unit-aware:
 * SUMIF/AVERAGEIF keep the unit of the summed values, GEOMEAN/HARMEAN reattach the
 * common unit, and COUNTIF/SUMIF compare each value's magnitude (a uniform-unit
 * range compares consistently). PURE and SYNCHRONOUS — `math` is passed in.
 */
import type { MathJsInstance } from "mathjs";
import {
  isUnitLike,
  magnitude,
  flattenValues,
  parseCriteria,
  matchCriteria,
  requireIndex,
  fail,
} from "./shared";

type Fn = (...args: unknown[]) => unknown;

/** A value that contributes to a numeric statistic (number or quantity). */
const isNumeric = (v: unknown): boolean => typeof v === "number" || isUnitLike(v);

export function makeStatFunctions(math: MathJsInstance): Record<string, Fn> {
  const withUnit = (mag: number, original: unknown): unknown =>
    isUnitLike(original) ? math.unit(mag, original.formatUnits()) : mag;

  /** Count of numeric values across all arguments. */
  const COUNT: Fn = (...args) => flattenValues(args).filter(isNumeric).length;

  /** Count of non-empty values (Excel COUNTA). */
  const COUNTA: Fn = (...args) =>
    flattenValues(args).filter((v) => v != null && v !== "").length;

  /** Count of values in `range` satisfying `criteria` (`">5"`, `"<>0"`, `"foo"`, …). */
  const COUNTIF: Fn = (range, criteria) => {
    const crit = parseCriteria(criteria);
    return flattenValues([range]).filter((v) => v != null && matchCriteria(v, crit)).length;
  };

  /** Sum of values matching `criteria`; sums `sumRange` (aligned) when given. */
  const SUMIF: Fn = (range, criteria, sumRange) => {
    const crit = parseCriteria(criteria);
    const test = flattenValues([range]);
    const sums = sumRange === undefined ? test : flattenValues([sumRange]);
    let acc: unknown;
    for (let i = 0; i < test.length; i += 1) {
      if (!matchCriteria(test[i], crit)) continue;
      const add = sums[i];
      if (add == null) continue;
      acc = acc === undefined ? add : math.add(acc as number, add as number);
    }
    return acc === undefined ? 0 : acc;
  };

  /** Mean of values matching `criteria`; averages `avgRange` (aligned) when given. */
  const AVERAGEIF: Fn = (range, criteria, avgRange) => {
    const crit = parseCriteria(criteria);
    const test = flattenValues([range]);
    const vals = avgRange === undefined ? test : flattenValues([avgRange]);
    let acc: unknown;
    let n = 0;
    for (let i = 0; i < test.length; i += 1) {
      if (!matchCriteria(test[i], crit) || vals[i] == null) continue;
      acc = acc === undefined ? vals[i] : math.add(acc as number, vals[i] as number);
      n += 1;
    }
    if (n === 0) fail("no-solution", "AVERAGEIF: no values matched the criterion.", "Loosen the criterion or check the range.");
    return math.divide(acc as number, n);
  };

  /** Geometric mean of positive values (keeps a uniform unit). */
  const GEOMEAN: Fn = (...args) => {
    const items = flattenValues(args).filter((v) => v != null);
    if (items.length === 0) fail("domain", "GEOMEAN needs at least one value.", "Pass a non-empty range.");
    let logSum = 0;
    for (const v of items) {
      const m = magnitude(v);
      if (!(m > 0)) fail("domain", "GEOMEAN needs positive values.", "Remove zero or negative entries.");
      logSum += Math.log(m);
    }
    return withUnit(Math.exp(logSum / items.length), items[0]);
  };

  /** Harmonic mean of positive values (keeps a uniform unit). */
  const HARMEAN: Fn = (...args) => {
    const items = flattenValues(args).filter((v) => v != null);
    if (items.length === 0) fail("domain", "HARMEAN needs at least one value.", "Pass a non-empty range.");
    let recip = 0;
    for (const v of items) {
      const m = magnitude(v);
      if (!(m > 0)) fail("domain", "HARMEAN needs positive values.", "Remove zero or negative entries.");
      recip += 1 / m;
    }
    return withUnit(items.length / recip, items[0]);
  };

  /** k-th largest value (keeps its unit). */
  const LARGE: Fn = (range, k) => {
    const items = flattenValues([range]).filter(isNumeric);
    const sorted = [...items].sort((a, b) => magnitude(b) - magnitude(a));
    return sorted[requireIndex(k, sorted.length, "LARGE", "k")];
  };

  /** k-th smallest value (keeps its unit). */
  const SMALL: Fn = (range, k) => {
    const items = flattenValues([range]).filter(isNumeric);
    const sorted = [...items].sort((a, b) => magnitude(a) - magnitude(b));
    return sorted[requireIndex(k, sorted.length, "SMALL", "k")];
  };

  return { COUNT, COUNTA, COUNTIF, SUMIF, AVERAGEIF, GEOMEAN, HARMEAN, LARGE, SMALL };
}
