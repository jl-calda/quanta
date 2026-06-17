/**
 * Unit-system display mapping (Functional Brief §2.4).
 *
 * A result carries its dimensions via mathjs; for display we convert it to the
 * region's target unit when set, otherwise to the worksheet unit system's
 * preferred unit for that dimension (SI default: kN, kN·m, MPa, mm, …). Plain
 * numbers, complex values, and matrices pass through unchanged.
 */
import { math } from "./math";
import type { Unit } from "./math";
import type { UnitSystem } from "./types";

/**
 * SI structural defaults, tried in order. A result is shown in the first unit
 * whose base dimensions match it. Force before energy/moment, stress, length,
 * area, then base SI — chosen for structural/civil/mechanical work.
 */
export const SI_SYSTEM: UnitSystem = {
  id: "SI",
  preferred: [
    "kN",
    "MPa",
    "kN m",
    "mm^2",
    "mm",
    "m",
    "kg",
    "s",
    "N",
    "Pa",
    "rad",
  ],
};

export function isUnit(value: unknown): value is Unit {
  return math.isUnit(value);
}

/**
 * Convert a value to its display unit.
 *
 * - Non-units pass through untouched.
 * - A `targetUnit` is honored; a dimensional mismatch throws (mathjs: "Units do
 *   not match"), which the caller classifies as a `unit-mismatch` error.
 * - Otherwise the first matching `system.preferred` unit is used; if none match,
 *   the value keeps mathjs's own choice.
 */
export function toDisplayUnit(
  value: unknown,
  targetUnit: string | undefined,
  system: UnitSystem,
): unknown {
  if (!isUnit(value)) return value;

  if (targetUnit && targetUnit.trim().length > 0) {
    return value.to(targetUnit);
  }

  for (const candidate of system.preferred) {
    if (baseMatches(value, candidate)) {
      return value.to(candidate);
    }
  }
  return value;
}

/** Whether a unit value shares base dimensions with a candidate unit string. */
function baseMatches(value: Unit, candidate: string): boolean {
  try {
    return value.equalBase(math.unit(candidate));
  } catch {
    return false;
  }
}
