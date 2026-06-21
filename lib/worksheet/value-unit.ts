/**
 * Split a formatted result into its value and unit parts for the Variables tab,
 * which shows them in separate columns. The engine's `formatValue` renders a
 * scalar-with-unit as `"<number> <prettyUnit>"` — a single space between the
 * number (which never contains spaces) and the unit (compound units already
 * joined with `·`). So when the raw value is a unit, splitting on the first space
 * is exact. For everything else (plain numbers, booleans, matrices — whose
 * formatted strings may legitimately contain spaces) we keep the whole string as
 * the value and leave the unit empty. Gating on `isUnit`, not on "has a space",
 * is what keeps matrices from being mis-split.
 */
import { isUnit } from "@/lib/calc";
import type { RegionResult } from "@/lib/calc";

export interface ValueUnit {
  value: string;
  unit: string;
}

export function splitValueUnit(
  result: Pick<RegionResult, "value" | "formatted">,
): ValueUnit {
  if (isUnit(result.value)) {
    const space = result.formatted.indexOf(" ");
    if (space !== -1) {
      return {
        value: result.formatted.slice(0, space),
        unit: result.formatted.slice(space + 1),
      };
    }
  }
  return { value: result.formatted, unit: "" };
}
