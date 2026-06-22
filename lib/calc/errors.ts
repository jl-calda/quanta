/**
 * Centralized typed-error construction.
 *
 * Library throws are opaque and user-hostile; every one is mapped here to a
 * {@link CalcError} with a message and fix hint in the app's voice (CLAUDE.md:
 * "Errors say what's wrong and how to fix it … never raw Postgres / library
 * strings"). Each helper names the offending symbol/unit where it can.
 */
import type { CalcError, CalcErrorKind } from "./types";

/**
 * A throw that already carries a typed {@link CalcError}. Lets inner layers
 * (e.g. the formatter) raise a precise, app-voice error that the orchestrator
 * surfaces verbatim instead of re-classifying a generic library message.
 */
export class CalcEngineError extends Error {
  constructor(public readonly calcError: CalcError) {
    super(calcError.message);
    this.name = "CalcEngineError";
  }
}

export function makeError(
  kind: CalcErrorKind,
  message: string,
  fixHint?: string,
  span?: CalcError["span"],
): CalcError {
  return { kind, message, fixHint, span };
}

export function undefinedSymbol(name: string): CalcError {
  return makeError(
    "undefined",
    `${name} is not defined.`,
    "Define it above this region, or check the spelling.",
  );
}

export function definedLater(name: string): CalcError {
  return makeError(
    "defined-later",
    `${name} is not defined above or to the left.`,
    `Move the definition of ${name} earlier in reading order.`,
  );
}

export function cycle(names: string[]): CalcError {
  const loop = [...names, names[0]].join(" → ");
  return makeError(
    "cycle",
    `Circular reference: ${loop}.`,
    "Break the loop so each value depends only on earlier ones.",
  );
}

/**
 * An array formula can't spill its result into the cells it needs — a target is
 * already occupied, or the result runs past the edge of the grid. Names the first
 * blocking cell so the fix is obvious (Excel's `#SPILL!`, in the app's voice).
 */
export function spillError(reason: "blocked" | "out-of-grid", addr: string): CalcError {
  return reason === "out-of-grid"
    ? makeError(
        "spill",
        `This array can't spill — it runs past ${addr}, the edge of the table.`,
        "Add rows or columns, or shorten the result.",
      )
    : makeError(
        "spill",
        `This array can't spill into ${addr} — that cell already has a value.`,
        `Clear ${addr} so the result has room, or move the formula.`,
      );
}

/** A region whose dependency failed cannot be computed, but it is not itself wrong. */
export function blockedBy(name: string): CalcError {
  return makeError(
    "undefined",
    `${name} could not be computed because something it depends on has an error.`,
    "Fix the upstream error first.",
  );
}

/**
 * A linear solve block's equations contradict each other — the augmented system
 * has higher rank than the coefficient matrix, so no assignment satisfies them
 * all. (Solve block, §6.5.)
 */
export function inconsistentSystem(): CalcError {
  return makeError(
    "no-solution",
    "These equations contradict each other, so there's no solution.",
    "Two or more constraints can't all hold. Remove or correct one, or switch to minerr for a best fit.",
  );
}

/**
 * A linear solve block is underdetermined — its coefficient matrix is rank
 * deficient but consistent, so the system has infinitely many solutions and no
 * single one can be reported. (Solve block, §6.5.)
 */
export function infiniteSolutions(): CalcError {
  return makeError(
    "singular",
    "This system has infinitely many solutions.",
    "Add an equation, or fix one variable, so there are as many independent equations as unknowns.",
  );
}

/**
 * Classify a raw mathjs/JS throw into a typed error. The numeric/parse layer
 * surfaces consistent message fragments ("Units do not match", "Undefined
 * symbol x", "Unexpected …") we can match on.
 */
export function classifyThrow(error: unknown): CalcError {
  if (error instanceof CalcEngineError) return error.calcError;
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (lower.includes("units do not match") || lower.includes("dimension")) {
    return makeError(
      "unit-mismatch",
      "Units don't match across the expression.",
      "Check that every term reduces to the same dimensions.",
    );
  }

  if (lower.includes("undefined symbol")) {
    const name = raw.replace(/^.*undefined symbol\s*/i, "").trim() || "a value";
    return undefinedSymbol(name);
  }

  if (
    lower.includes("unexpected") ||
    lower.includes("expected") ||
    lower.includes("parenthesis") ||
    lower.includes("syntax") ||
    lower.includes("value expected")
  ) {
    return makeError(
      "parse",
      "This expression can't be read.",
      raw,
    );
  }

  if (lower.includes("must be square")) {
    return makeError(
      "domain",
      "This needs a square matrix.",
      "Check that the matrix has the same number of rows and columns.",
    );
  }

  if (
    lower.includes("singular") ||
    lower.includes("not invertible") ||
    lower.includes("determinant")
  ) {
    return makeError(
      "singular",
      "The matrix is singular, so this can't be solved.",
      "Check the system for a redundant or missing equation.",
    );
  }

  if (
    lower.includes("out of range") ||
    lower.includes("index") ||
    lower.includes("nan") ||
    lower.includes("infinity") ||
    lower.includes("complex")
  ) {
    return makeError("domain", "This value is outside the function's domain.", raw);
  }

  return makeError("parse", "This expression can't be evaluated.", raw);
}
