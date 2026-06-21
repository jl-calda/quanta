/**
 * Conditional formatting (Functional Brief §2.6).
 *
 * After evaluation, test the result against each {@link CondRule} in order and
 * apply the FIRST match's style — colour/fill/bold plus an optional tag such as
 * "OK" / "FAIL". Comparisons are numeric (a unit result is compared by its
 * display magnitude); `=`/`!=` also fall back to string equality.
 */
import { isUnit } from "./units";
import type { CondOp, CondRule, CondStyle } from "./types";

export function applyConditional(
  value: unknown,
  rules: CondRule[] | undefined,
): CondStyle | undefined {
  if (!rules || rules.length === 0) return undefined;
  for (const rule of rules) {
    if (condMatches(value, rule.op, rule.value)) return rule.style;
  }
  return undefined;
}

/**
 * Does `value` satisfy `value op target`? Shared by conditional formatting and
 * the table filter (same `CondOp` + `number | string` contract). Numeric when
 * both sides are finite numbers (a unit value compared by its stored magnitude);
 * `=`/`!=` fall back to string equality on the *raw* value (e.g. status strings).
 */
export function condMatches(value: unknown, op: CondOp, target: number | string): boolean {
  const left = comparableValue(value);
  const right = typeof target === "number" ? target : Number(target);

  // Numeric comparison when both sides are numbers.
  if (Number.isFinite(left) && Number.isFinite(right)) {
    switch (op) {
      case ">":
        return left > right;
      case ">=":
        return left >= right;
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      case "=":
        return left === right;
      case "!=":
        return left !== right;
    }
  }

  // Fallback: string equality for `=` / `!=` (e.g. status strings).
  if (op === "=" || op === "!=") {
    const equal = String(value) === String(target);
    return op === "=" ? equal : !equal;
  }
  return false;
}

/** Coerce a result value to a number for ordered comparison (NaN when not orderable). */
export function comparableValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (isUnit(value)) {
    try {
      return value.toNumber(value.formatUnits());
    } catch {
      return NaN;
    }
  }
  return NaN;
}
