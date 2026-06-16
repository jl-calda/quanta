import { create, all } from "mathjs";
import type { CalcError, CalcErrorCode, CalcResult } from "./types";

/**
 * A single, shared mathjs instance. mathjs is unit-aware (`12 kN`, `700 MPa`,
 * `16 mm`), runs dimensional analysis, and exposes `toTex` for textbook
 * rendering — the numeric/units foundation of the engine. Symbolic algebra and
 * heavy numeric work run in the Pyodide worker (see ./worker).
 */
const math = create(all, {});

/**
 * Evaluate a single unit-aware expression.
 *
 * This is the minimal seed of the engine — later milestones layer the
 * dependency graph, dirty-tracking, and recalculation on top. It is pure: the
 * same input always yields the same output, with no I/O or global state.
 */
export function evaluate(expression: string): CalcResult {
  let tex = expression;
  try {
    const node = math.parse(expression);
    tex = node.toTex();
    const value = node.evaluate();
    return {
      ok: true,
      value,
      formatted: math.format(value, { precision: 6 }),
      tex,
    };
  } catch (error) {
    return { ok: false, error: toCalcError(error) };
  }
}

function toCalcError(error: unknown): CalcError {
  const message = error instanceof Error ? error.message : String(error);
  const code = classify(message);

  switch (code) {
    case "unit_mismatch":
      return {
        code,
        message: "Units don't match across the expression.",
        hint: "Check that both sides reduce to the same dimensions.",
      };
    case "undefined_symbol":
      return {
        code,
        message: `${message}.`,
        hint: "Define the variable above this point, or check the spelling.",
      };
    case "parse_error":
      return {
        code,
        message: "This expression can't be parsed.",
        hint: message,
      };
    default:
      return { code, message };
  }
}

function classify(message: string): CalcErrorCode {
  const lower = message.toLowerCase();
  if (lower.includes("units do not match") || lower.includes("dimension")) {
    return "unit_mismatch";
  }
  if (lower.includes("undefined symbol")) {
    return "undefined_symbol";
  }
  if (
    lower.includes("unexpected") ||
    lower.includes("expected") ||
    lower.includes("parenthesis") ||
    lower.includes("syntax")
  ) {
    return "parse_error";
  }
  return "evaluation_error";
}
