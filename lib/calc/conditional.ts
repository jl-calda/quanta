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
    if (matches(value, rule.op, rule.value)) return rule.style;
  }
  return undefined;
}

function matches(value: unknown, op: CondOp, target: number | string): boolean {
  const left = toComparable(value);
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

function toComparable(value: unknown): number {
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
