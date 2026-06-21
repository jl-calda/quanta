/**
 * Date family — Excel-style date math on serial day numbers.
 *
 * Dates are plain SERIAL NUMBERS (days since 1899-12-30 UTC), so they flow through
 * the engine like any other number and the family stays DIMENSIONLESS. Every
 * function is PURE and DETERMINISTIC: values come only from explicit arguments via
 * `Date.UTC` — there is deliberately NO `TODAY()` / `NOW()` (a clock read would
 * break the engine's determinism guarantee and its purity tests). Registered
 * engine-wide under UPPERCASE names (see ../index); no `math` needed.
 */
import { toSerial, fromSerial, lastDayOfMonth, magnitude, asText, fail } from "./shared";

type Fn = (...args: unknown[]) => unknown;

const int = (v: unknown): number => Math.trunc(magnitude(v));

export function makeDateFunctions(): Record<string, Fn> {
  /** Calendar (year, month, day) → serial number. */
  const DATE: Fn = (year, month, day) => toSerial(int(year), int(month), int(day));

  const YEAR: Fn = (serial) => fromSerial(magnitude(serial)).year;
  const MONTH: Fn = (serial) => fromSerial(magnitude(serial)).month;
  const DAY: Fn = (serial) => fromSerial(magnitude(serial)).day;

  /** Day of week. type 1 (default) Sun=1…Sat=7; type 2 Mon=1…Sun=7; type 3 Mon=0…Sun=6. */
  const WEEKDAY: Fn = (serial, type = 1) => {
    const dow = fromSerial(magnitude(serial)).dow; // 0 = Sunday … 6 = Saturday
    switch (int(type)) {
      case 2:
        return ((dow + 6) % 7) + 1;
      case 3:
        return (dow + 6) % 7;
      default:
        return dow + 1;
    }
  };

  /** Serial shifted by whole months (day clamped to the target month's length). */
  const EDATE: Fn = (serial, months) => {
    const { year, month, day } = fromSerial(magnitude(serial));
    const total = year * 12 + (month - 1) + int(months);
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    return toSerial(y, m, Math.min(day, lastDayOfMonth(y, m)));
  };

  /** Serial of the last day of the month `months` after `serial`. */
  const EOMONTH: Fn = (serial, months) => {
    const { year, month } = fromSerial(magnitude(serial));
    const total = year * 12 + (month - 1) + int(months);
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    return toSerial(y, m, lastDayOfMonth(y, m));
  };

  /** Whole days from `start` to `end` (end − start). */
  const DAYS: Fn = (end, start) => Math.round(magnitude(end) - magnitude(start));

  /** Difference between two dates in "D" days, "M" complete months, or "Y" complete years. */
  const DATEDIF: Fn = (start, end, unit) => {
    const s = magnitude(start);
    const e = magnitude(end);
    const u = asText(unit).trim().toUpperCase();
    if (u === "D") return Math.round(e - s);
    const a = fromSerial(s);
    const b = fromSerial(e);
    let months = (b.year - a.year) * 12 + (b.month - a.month);
    if (b.day < a.day) months -= 1;
    if (u === "M") return months;
    if (u === "Y") return Math.trunc(months / 12);
    return fail("domain", `DATEDIF: "${asText(unit)}" isn't a supported unit.`, 'Use "D", "M", or "Y".');
  };

  /** Parse "YYYY-MM-DD" (or "YYYY/MM/DD") → serial number. */
  const DATEVALUE: Fn = (text) => {
    const m = asText(text).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!m) fail("domain", `DATEVALUE: "${asText(text)}" isn't a date.`, "Use the form YYYY-MM-DD.");
    return toSerial(Number(m![1]), Number(m![2]), Number(m![3]));
  };

  return { DATE, YEAR, MONTH, DAY, WEEKDAY, EDATE, EOMONTH, DAYS, DATEDIF, DATEVALUE };
}
