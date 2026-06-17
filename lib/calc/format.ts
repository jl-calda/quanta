/**
 * Result formatting (Functional Brief §2.4).
 *
 * Turns an evaluated value into the string shown in the worksheet, honoring the
 * region's {@link ResultFormat}: decimals vs significant figures, notation
 * (decimal / scientific / engineering), radix (bin/oct/hex for dimensionless
 * integers), trailing zeros, thousands separators, exponent/zero thresholds, and
 * fraction display. The unit label is carried through unchanged. Pure and
 * deterministic.
 */
import { math } from "./math";
import { isUnit } from "./units";
import { CalcEngineError, makeError } from "./errors";
import { DEFAULT_FORMAT, type ResultFormat, type Radix } from "./types";

export function formatValue(value: unknown, format?: ResultFormat): string {
  const fmt = { ...DEFAULT_FORMAT, ...format };

  if (isUnit(value)) {
    const unitLabel = value.formatUnits();
    const num = value.toNumber(unitLabel);
    const numStr = formatNumber(num, fmt);
    return unitLabel ? `${numStr} ${prettyUnit(unitLabel)}` : numStr;
  }

  if (typeof value === "number") return formatNumber(value, fmt);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";

  // Complex, matrices, fractions, etc. — defer to mathjs with the notation hint.
  return math.format(value, {
    notation: mathjsNotation(fmt.notation),
    precision: fmt.sigfigs ?? 6,
  });
}

function formatNumber(input: number, fmt: ResultFormat): string {
  if (!Number.isFinite(input)) {
    throw new CalcEngineError(
      makeError(
        "domain",
        Number.isNaN(input)
          ? "The result is undefined (not a number)."
          : "The result is infinite.",
        "Check for division by zero or an out-of-domain value.",
      ),
    );
  }

  let num = input;
  if (fmt.zeroThreshold != null && Math.abs(num) <= fmt.zeroThreshold) num = 0;

  const radix = fmt.radix ?? "dec";
  if (radix !== "dec") return formatRadix(num, radix);

  if (fmt.fraction) return math.format(math.fraction(num));

  const str = formatNotation(num, fmt);
  return applyThousands(applyTrailingZeros(str, fmt), fmt);
}

function formatNotation(num: number, fmt: ResultFormat): string {
  const notation = fmt.notation ?? "auto";
  const sig = fmt.sigfigs ?? 6;

  if (notation === "sci") {
    return math.format(num, {
      notation: "exponential",
      precision: fmt.decimals != null ? fmt.decimals + 1 : sig,
    });
  }
  if (notation === "eng") {
    return math.format(num, { notation: "engineering", precision: sig });
  }
  if (notation === "decimal" || (notation === "auto" && fmt.decimals != null)) {
    if (fmt.decimals != null) {
      return math.format(num, { notation: "fixed", precision: fmt.decimals });
    }
    return math.format(num, { notation: "fixed", precision: decimalsForSig(num, sig) });
  }

  // auto
  const threshold = fmt.expThreshold ?? 15;
  return math.format(num, {
    notation: "auto",
    precision: sig,
    lowerExp: -threshold,
    upperExp: threshold,
  });
}

/** Decimal places that render `sig` significant figures of `num` in fixed form. */
function decimalsForSig(num: number, sig: number): number {
  if (num === 0) return Math.max(0, sig - 1);
  const magnitude = Math.floor(Math.log10(Math.abs(num)));
  return Math.max(0, sig - 1 - magnitude);
}

function formatRadix(num: number, radix: Radix): string {
  if (!Number.isInteger(num)) {
    throw new CalcEngineError(
      makeError(
        "domain",
        `${radix} display needs a whole number.`,
        "Round to an integer, or switch back to decimal notation.",
      ),
    );
  }
  const base = radix === "bin" ? 2 : radix === "oct" ? 8 : 16;
  const prefix = radix === "bin" ? "0b" : radix === "oct" ? "0o" : "0x";
  const sign = num < 0 ? "-" : "";
  return `${sign}${prefix}${Math.abs(num).toString(base)}`;
}

/** Strip trailing zeros (and a dangling point) unless the format pins them. */
function applyTrailingZeros(str: string, fmt: ResultFormat): string {
  if (fmt.trailingZeros) return str;
  if (!str.includes(".")) return str;
  // Operate on the mantissa only, leaving any exponent intact.
  const [mantissa, exp] = str.split(/e/i);
  const trimmed = mantissa.replace(/0+$/, "").replace(/\.$/, "");
  return exp != null ? `${trimmed}e${exp}` : trimmed;
}

/** Group the integer part of the mantissa with thousands separators. */
function applyThousands(str: string, fmt: ResultFormat): string {
  if (!fmt.thousands) return str;
  const [mantissa, exp] = str.split(/e/i);
  const negative = mantissa.startsWith("-");
  const body = negative ? mantissa.slice(1) : mantissa;
  const [intPart, fracPart] = body.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const rebuilt = `${negative ? "-" : ""}${grouped}${fracPart != null ? "." + fracPart : ""}`;
  return exp != null ? `${rebuilt}e${exp}` : rebuilt;
}

/** Tidy mathjs unit strings for display: `kN m` → `kN·m`, `^2` → superscript. */
function prettyUnit(unit: string): string {
  return unit
    .replace(/\s+/g, "·")
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³");
}

function mathjsNotation(
  notation: ResultFormat["notation"],
): "auto" | "fixed" | "exponential" | "engineering" {
  switch (notation) {
    case "sci":
      return "exponential";
    case "eng":
      return "engineering";
    case "decimal":
      return "fixed";
    default:
      return "auto";
  }
}
