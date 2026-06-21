/**
 * Shared helpers for the engine-native function library (math, statistical,
 * logical, text, date families — see ./index).
 *
 * PURE and DETERMINISTIC, with NO import of `./math`: every family module is
 * registered BY `../math.ts`, so importing it back would form a cycle. These
 * helpers therefore lean only on plain JS plus duck-typed mathjs `Unit`s (a Unit
 * exposes `.type === "Unit"`, `.toNumber(u)` and `.formatUnits()` on the instance,
 * so we never need the `math` namespace to read a magnitude). Unit-aware
 * arithmetic that genuinely needs `math` (add/multiply/reattach) lives in the
 * family factories, which receive the instance as an argument.
 *
 * Every failure is a typed {@link CalcError} via {@link CalcEngineError} so the
 * orchestrator surfaces an app-voice message, never a raw library throw.
 */
import type { CalcErrorKind } from "../types";
import { CalcEngineError, makeError } from "../errors";

/** A duck-typed mathjs `Unit` — enough to read a magnitude without the namespace. */
interface UnitLike {
  type: "Unit";
  toNumber(unit: string): number;
  formatUnits(): string;
  toString(): string;
}

/** True for a mathjs `Unit` value (same test as units.ts `isUnit`, dependency-free). */
export function isUnitLike(v: unknown): v is UnitLike {
  return typeof v === "object" && v !== null && (v as { type?: string }).type === "Unit";
}

/** Raise a typed engine error in the app's voice. */
export function fail(kind: CalcErrorKind, message: string, fixHint?: string): never {
  throw new CalcEngineError(makeError(kind, message, fixHint));
}

/* ------------------------------------------------------------------ *
 * Numeric / boolean / text coercion
 * ------------------------------------------------------------------ */

/** Plain magnitude of a number/boolean/Unit (a Unit yields its own-unit number). */
export function magnitude(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (isUnitLike(v)) return v.toNumber(v.formatUnits());
  const n = Number(v);
  return n;
}

/** Coerce to a finite number for an argument that must be a count/index/etc. */
export function toNumber(v: unknown, fn: string, what = "argument"): number {
  const n = magnitude(v);
  if (!Number.isFinite(n)) {
    fail("domain", `${fn}: ${what} must be a number.`, "Pass a numeric value.");
  }
  return n;
}

/** Truthiness for the logical family: bool as-is, 0 / NaN / "" / false → false. */
export function truthy(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (v == null) return false;
  if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
  if (isUnitLike(v)) return v.toNumber(v.formatUnits()) !== 0;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "true") return true;
    if (t === "false" || t === "") return false;
    fail("domain", `Expected a true/false condition, got the text "${v}".`, "Use a comparison or a boolean.");
  }
  return Boolean(v);
}

/** Render any value as text for the text family (Excel-style coercion). */
export function asText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (isUnitLike(v)) return v.toString();
  return String(v);
}

/** Require a 1-based integer in [1, length]; returns the 0-based index. */
export function requireIndex(i: unknown, length: number, fn: string, what = "position"): number {
  const idx = Math.trunc(toNumber(i, fn, what));
  if (idx < 1 || idx > length) {
    fail("domain", `${fn}: ${what} ${idx} is out of range.`, `Use a ${what} between 1 and ${length}.`);
  }
  return idx - 1;
}

/* ------------------------------------------------------------------ *
 * Range flattening (scalars + arrays + mathjs matrices → flat list)
 * ------------------------------------------------------------------ */

/** A mathjs Matrix (duck-typed) or a JS array → a JS array; scalars wrap to `[v]`. */
function toJsArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v && typeof (v as { toArray?: unknown }).toArray === "function") {
    return (v as { toArray(): unknown[] }).toArray();
  }
  return [v];
}

/** Flatten any mix of scalars, arrays, and matrices into a single flat list. */
export function flattenValues(args: unknown[]): unknown[] {
  const out: unknown[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v) || (v && typeof (v as { toArray?: unknown }).toArray === "function")) {
      for (const el of toJsArray(v)) walk(el);
    } else {
      out.push(v);
    }
  };
  for (const a of args) walk(a);
  return out;
}

/* ------------------------------------------------------------------ *
 * COUNTIF / SUMIF criteria (`">5"`, `">=3"`, `"<>2"`, `"=foo"`, bare value)
 * ------------------------------------------------------------------ */

export type CritOp = ">" | ">=" | "<" | "<=" | "=" | "<>";

export interface Criteria {
  op: CritOp;
  /** Numeric comparand, or a lowercased string for text equality. */
  operand: number | string;
}

/**
 * Parse a COUNTIF/SUMIF criterion. A bare number/string means equality; a leading
 * comparison operator sets `op`. Numeric comparands compare against each value's
 * magnitude (a uniform-unit range compares consistently); text comparands compare
 * case-insensitively for equality only.
 */
export function parseCriteria(crit: unknown): Criteria {
  if (typeof crit === "number") return { op: "=", operand: crit };
  if (typeof crit === "boolean") return { op: "=", operand: crit ? 1 : 0 };
  const raw = asText(crit).trim();
  const m = raw.match(/^(>=|<=|<>|>|<|=)?\s*(.*)$/);
  const op = (m?.[1] as CritOp | undefined) ?? "=";
  const rest = (m?.[2] ?? "").trim();
  const num = Number(rest);
  if (rest !== "" && Number.isFinite(num)) return { op, operand: num };
  return { op, operand: rest.toLowerCase() };
}

/** Does `value` satisfy `crit`? */
export function matchCriteria(value: unknown, crit: Criteria): boolean {
  if (typeof crit.operand === "number") {
    const x = magnitude(value);
    if (!Number.isFinite(x)) return crit.op === "<>";
    switch (crit.op) {
      case ">":
        return x > crit.operand;
      case ">=":
        return x >= crit.operand;
      case "<":
        return x < crit.operand;
      case "<=":
        return x <= crit.operand;
      case "<>":
        return x !== crit.operand;
      default:
        return x === crit.operand;
    }
  }
  const s = asText(value).toLowerCase();
  return crit.op === "<>" ? s !== crit.operand : s === crit.operand;
}

/* ------------------------------------------------------------------ *
 * Serial-date core (pure: no clock reads — DATE/EDATE/… take explicit args)
 * ------------------------------------------------------------------ */

const MS_PER_DAY = 86_400_000;
/** Day 0 of the serial scale: 1899-12-30 UTC (so DATE(2024,1,1) → 45292, Excel-style). */
const EPOCH_UTC = Date.UTC(1899, 11, 30);

/** Calendar date → serial day number. Month/day overflow normalizes (Date.UTC). */
export function toSerial(year: number, month: number, day: number): number {
  return Math.round((Date.UTC(year, month - 1, day) - EPOCH_UTC) / MS_PER_DAY);
}

export interface SerialParts {
  year: number;
  month: number;
  day: number;
  /** Day of week, 0 = Sunday … 6 = Saturday. */
  dow: number;
}

/** Serial day number → calendar parts (UTC, deterministic). */
export function fromSerial(serial: number): SerialParts {
  const d = new Date(EPOCH_UTC + Math.round(serial) * MS_PER_DAY);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), dow: d.getUTCDay() };
}

/** Last calendar day (28–31) of a given year/month. */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Shift a serial by whole months, clamping the day to the target month's length. */
export function addMonths(serial: number, months: number): number {
  const { year, month, day } = fromSerial(serial);
  const total = (year * 12 + (month - 1)) + Math.trunc(months);
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return toSerial(y, m, Math.min(day, lastDayOfMonth(y, m)));
}
