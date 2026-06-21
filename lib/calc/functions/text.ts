/**
 * Text family — Excel-style string functions (LEN, LEFT/RIGHT/MID, UPPER/LOWER,
 * SUBSTITUTE, FIND/SEARCH, CONCAT/TEXTJOIN, …).
 *
 * Registered engine-wide under UPPERCASE names (see ../index); the lowercase
 * mathjs builtins (`concat` = matrix concat, `string`, `format`, `number`) stay
 * intact. DIMENSIONLESS: arguments coerce to text via `asText` (numbers/booleans
 * become their string form) and results are plain strings. Casing is
 * locale-INDEPENDENT (`toUpperCase`, never `toLocaleUpperCase`) so the engine is
 * deterministic across client, worker, and Node. PURE and SYNCHRONOUS.
 */
import { asText, magnitude, flattenValues, truthy, fail } from "./shared";

type Fn = (...args: unknown[]) => unknown;

/** A non-negative integer count/length argument. */
const count = (v: unknown, fn: string, what: string): number => {
  const n = Math.trunc(magnitude(v));
  if (!Number.isFinite(n) || n < 0) {
    fail("domain", `${fn}: ${what} must be zero or a positive whole number.`, `Give a ${what} of 0 or more.`);
  }
  return n;
};

/** 0-based start from a 1-based position argument (clamped to ≥ 0). */
const fromPos = (v: unknown): number => Math.max(0, Math.trunc(magnitude(v)) - 1);

export function makeTextFunctions(): Record<string, Fn> {
  const LEN: Fn = (s) => asText(s).length;

  const LEFT: Fn = (s, n = 1) => asText(s).slice(0, count(n, "LEFT", "length"));

  const RIGHT: Fn = (s, n = 1) => {
    const str = asText(s);
    const k = count(n, "RIGHT", "length");
    return k === 0 ? "" : str.slice(Math.max(0, str.length - k));
  };

  const MID: Fn = (s, start, len) => {
    const str = asText(s);
    const from = fromPos(start);
    return str.slice(from, from + count(len, "MID", "length"));
  };

  const UPPER: Fn = (s) => asText(s).toUpperCase();
  const LOWER: Fn = (s) => asText(s).toLowerCase();

  const PROPER: Fn = (s) =>
    asText(s)
      .toLowerCase()
      .replace(/(^|[^a-zA-Z])([a-zA-Z])/g, (_, pre: string, ch: string) => pre + ch.toUpperCase());

  /** Trim ends and collapse internal whitespace runs to single spaces (Excel TRIM). */
  const TRIM: Fn = (s) => asText(s).trim().replace(/\s+/g, " ");

  const SUBSTITUTE: Fn = (s, oldText, newText, instance) => {
    const str = asText(s);
    const o = asText(oldText);
    const n = asText(newText);
    if (o === "") return str;
    if (instance === undefined) return str.split(o).join(n);
    const which = count(instance, "SUBSTITUTE", "instance");
    if (which === 0) fail("domain", "SUBSTITUTE: the instance number must be 1 or more.", "Use 1 for the first match.");
    let pos = str.indexOf(o);
    let seen = 0;
    while (pos !== -1) {
      seen += 1;
      if (seen === which) return str.slice(0, pos) + n + str.slice(pos + o.length);
      pos = str.indexOf(o, pos + o.length);
    }
    return str;
  };

  const FIND: Fn = (sub, s, start = 1) => {
    const idx = asText(s).indexOf(asText(sub), fromPos(start));
    if (idx === -1) fail("no-solution", `FIND: "${asText(sub)}" isn't in the text.`, "Check the substring or the start position.");
    return idx + 1;
  };

  const SEARCH: Fn = (sub, s, start = 1) => {
    const idx = asText(s).toLowerCase().indexOf(asText(sub).toLowerCase(), fromPos(start));
    if (idx === -1) fail("no-solution", `SEARCH: "${asText(sub)}" isn't in the text.`, "Check the substring or the start position.");
    return idx + 1;
  };

  const CONCAT: Fn = (...args) => flattenValues(args).map(asText).join("");

  const TEXTJOIN: Fn = (delim, ignoreEmpty, ...rest) => {
    const d = asText(delim);
    const skip = truthy(ignoreEmpty);
    return flattenValues(rest)
      .filter((v) => !(skip && (v == null || asText(v) === "")))
      .map(asText)
      .join(d);
  };

  const REPT: Fn = (s, n) => {
    const str = asText(s);
    const times = count(n, "REPT", "count");
    if (str.length * times > 1_000_000) {
      fail("domain", "REPT: the repeated text is too long.", "Reduce the count or the text length.");
    }
    return str.repeat(times);
  };

  const VALUE: Fn = (s) => {
    const n = Number(asText(s).trim());
    if (!Number.isFinite(n)) fail("domain", `VALUE: "${asText(s)}" isn't a number.`, "Pass numeric text like \"42\" or \"3.14\".");
    return n;
  };

  return {
    LEN, LEFT, RIGHT, MID, UPPER, LOWER, PROPER, TRIM,
    SUBSTITUTE, FIND, SEARCH, CONCAT, TEXTJOIN, REPT, VALUE,
  };
}
