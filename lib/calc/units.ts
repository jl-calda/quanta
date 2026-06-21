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

/**
 * US customary structural/mechanical display units, tried before falling back to
 * SI for any dimension USCS doesn't map. Force → kip, stress/pressure → psi,
 * moment → kip·ft, area → in², length → in/ft, mass → lbm. (mathjs has no `ksi`,
 * so structural stress shows in psi.) Display-only: stored values stay in base.
 */
export const USCS_SYSTEM: UnitSystem = {
  id: "USCS",
  preferred: ["kip", "psi", "kip ft", "in^2", "in", "ft", "lbf", "lbm", ...SI_SYSTEM.preferred],
};

/**
 * CGS display units (force → dyn, length → cm, mass → g, energy → erg), with SI
 * fallback for unmapped dimensions (e.g. mathjs has no barye, so stress → MPa).
 */
export const CGS_SYSTEM: UnitSystem = {
  id: "CGS",
  preferred: ["dyn", "erg", "cm", "g", ...SI_SYSTEM.preferred],
};

/** Worksheet-level unit-system selection, as persisted (lowercase). */
export type WorksheetUnitSystem = "si" | "uscs" | "cgs" | "custom";

/**
 * Build the display {@link UnitSystem} for a worksheet's selection. `custom` puts
 * the worksheet's user-defined preferred units first, then SI fallback — so an
 * unmapped dimension always resolves. Pure; no engine state is touched.
 */
export function unitSystemFor(
  id: WorksheetUnitSystem,
  customPreferred: string[] = [],
): UnitSystem {
  switch (id) {
    case "uscs":
      return USCS_SYSTEM;
    case "cgs":
      return CGS_SYSTEM;
    case "custom":
      return { id: "custom", preferred: [...customPreferred, ...SI_SYSTEM.preferred] };
    case "si":
    default:
      return SI_SYSTEM;
  }
}

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
