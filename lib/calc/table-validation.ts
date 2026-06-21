/**
 * Table cell data validation — per-column rules (Functional Brief §6.3, Phase 2).
 *
 * Pure, deterministic, synchronous: given a column's rule and a raw cell source,
 * decides whether the literal may be committed. The editor calls this on commit
 * and rejects bad input; `list` columns additionally render a dropdown so the
 * invalid case can't be typed at all.
 *
 * Inputs are primitives (no `lib/worksheet` import → no calc↔content cycle); the
 * `TableValidationRule` shape is structurally satisfied by content's
 * `ColumnValidation`.
 */

export type TableValidationKind = "list" | "number";

export interface TableValidationRule {
  kind: TableValidationKind;
  /** `list`: the allowed values (also drives the dropdown). */
  options?: string[];
  /** `number`: inclusive bounds. */
  min?: number;
  max?: number;
}

export type CellValidation = { ok: true } | { ok: false; message: string };

const OK: CellValidation = { ok: true };

/** First whitespace-delimited token as a number (`"12 kN"` → 12), else NaN. */
function leadingNumber(source: string): number {
  const token = source.trim().split(/\s+/)[0] ?? "";
  return token === "" ? Number.NaN : Number(token);
}

/**
 * Validate a raw cell source against a column rule.
 *
 * - No rule, an empty source (clearing a cell), or a formula (`=…`, a computed
 *   value) is always allowed — only typed literals are checked.
 * - `list`: the trimmed source must equal one of `options`.
 * - `number`: the leading token must parse, and fall within `[min, max]`.
 */
export function validateCellSource(
  rule: TableValidationRule | undefined,
  source: string,
): CellValidation {
  if (!rule) return OK;
  const trimmed = source.trim();
  if (trimmed === "" || trimmed.startsWith("=")) return OK;

  if (rule.kind === "list") {
    const options = rule.options ?? [];
    if (options.length === 0) return OK; // nothing to enforce yet
    const allowed = options.some((opt) => opt.trim() === trimmed);
    if (allowed) return OK;
    return { ok: false, message: `Pick one of: ${options.join(", ")}.` };
  }

  // kind === "number"
  const n = leadingNumber(trimmed);
  if (!Number.isFinite(n)) return { ok: false, message: "Enter a number." };
  if (rule.min !== undefined && n < rule.min) {
    return { ok: false, message: `Must be at least ${rule.min}.` };
  }
  if (rule.max !== undefined && n > rule.max) {
    return { ok: false, message: `Must be at most ${rule.max}.` };
  }
  return OK;
}
