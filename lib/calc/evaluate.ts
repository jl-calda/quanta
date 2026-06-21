/**
 * Single-expression evaluation — the convenience path.
 *
 * For a whole worksheet use {@link evaluateSheet} / {@link CalcEngine}; this
 * helper evaluates one standalone, unit-aware expression (no cross-region
 * scope). It is pure: the same input always yields the same output.
 */
import { math } from "./math";
import { normalizeRanges } from "./parse";
import { classifyThrow } from "./errors";
import { toDisplayUnit, SI_SYSTEM } from "./units";
import { formatValue } from "./format";
import type { CalcResult, ResultFormat, UnitSystem } from "./types";

export interface EvaluateExprOptions {
  format?: ResultFormat;
  unitSystem?: UnitSystem;
}

export function evaluate(
  expression: string,
  options: EvaluateExprOptions = {},
): CalcResult {
  let tex = expression;
  try {
    const node = math.parse(normalizeRanges(expression));
    tex = node.toTex();
    const value = node.evaluate();
    const display = toDisplayUnit(
      value,
      undefined,
      options.unitSystem ?? SI_SYSTEM,
    );
    return {
      ok: true,
      value,
      formatted: formatValue(display, options.format),
      tex,
    };
  } catch (error) {
    return { ok: false, error: classifyThrow(error) };
  }
}
