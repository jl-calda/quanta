/**
 * Physical constants catalog (Functional Brief §3.6 / 4.6 · Matrix G4).
 *
 * The constants half of the Reference library: a shipped, in-code dataset of
 * CODATA / SI constants grouped by domain. `value`/`unit` are display strings
 * (unicode superscripts), while `insert` is the engine-valid literal dropped at
 * the caret — the real numeric value with mathjs unit tokens, never the
 * prettified display string. That split is what keeps inserted values exact.
 */
import type { ConstantRef } from "@/lib/calc/reference/types";

const C = (o: Omit<ConstantRef, "kind">): ConstantRef => ({ kind: "constant", ...o });

export const CONSTANTS: ConstantRef[] = [
  /* ---- universal ---- */
  C({
    id: "g0",
    cat: "universal",
    name: "g₀",
    sig: "standard gravity",
    tag: "Universal",
    desc: "Standard acceleration due to gravity, used to convert mass to weight.",
    value: "9.80665",
    unit: "m/s²",
    source: "CODATA (defined)",
    related: ["G", "c"],
    insert: "9.80665 m/s^2",
    example: {
      caption: "Weight of a 75 kg mass under standard gravity:",
      regions: ["W := 75 kg * 9.80665 m/s^2"],
      units: ["N"],
      format: { decimals: 1 },
    },
  }),
  C({ id: "G", cat: "universal", name: "G", sig: "gravitational constant", tag: "Universal", desc: "Newtonian constant of gravitation.", value: "6.67430 × 10⁻¹¹", unit: "m³·kg⁻¹·s⁻²", source: "CODATA 2018", related: ["g0", "c"], insert: "6.67430e-11 m^3/(kg s^2)" }),
  C({ id: "c", cat: "universal", name: "c", sig: "speed of light", tag: "Universal", desc: "Speed of light in vacuum.", value: "2.99792458 × 10⁸", unit: "m/s", source: "SI (defined)", related: ["h", "eps0"], insert: "299792458 m/s" }),
  C({ id: "h", cat: "universal", name: "h", sig: "Planck constant", tag: "Universal", desc: "Relates a photon's energy to its frequency.", value: "6.62607015 × 10⁻³⁴", unit: "J·s", source: "SI (defined)", related: ["c", "k"], insert: "6.62607015e-34 J s" }),

  /* ---- electromagnetic ---- */
  C({ id: "e", cat: "electromagnetic", name: "e", sig: "elementary charge", tag: "Electromagnetic", desc: "Electric charge of a proton.", value: "1.602176634 × 10⁻¹⁹", unit: "C", source: "SI (defined)", related: ["eps0", "mu0"], insert: "1.602176634e-19 coulomb" }),
  C({ id: "eps0", cat: "electromagnetic", name: "ε₀", sig: "vacuum permittivity", tag: "Electromagnetic", desc: "Electric constant of free space.", value: "8.8541878128 × 10⁻¹²", unit: "F/m", source: "CODATA 2018", related: ["mu0", "c"], insert: "8.8541878128e-12 farad/m" }),
  C({ id: "mu0", cat: "electromagnetic", name: "μ₀", sig: "vacuum permeability", tag: "Electromagnetic", desc: "Magnetic constant of free space.", value: "1.25663706212 × 10⁻⁶", unit: "N·A⁻²", source: "CODATA 2018", related: ["eps0", "c"], insert: "1.25663706212e-6 N/A^2" }),

  /* ---- atomic ---- */
  C({ id: "NA", cat: "atomic", name: "Nₐ", sig: "Avogadro constant", tag: "Atomic", desc: "Number of entities per mole.", value: "6.02214076 × 10²³", unit: "mol⁻¹", source: "SI (defined)", related: ["k", "R"], insert: "6.02214076e23 / mol" }),
  C({ id: "k", cat: "atomic", name: "k", sig: "Boltzmann constant", tag: "Atomic", desc: "Relates temperature to energy.", value: "1.380649 × 10⁻²³", unit: "J/K", source: "SI (defined)", related: ["NA", "R"], insert: "1.380649e-23 J/K" }),
  C({ id: "R", cat: "atomic", name: "R", sig: "molar gas constant", tag: "Atomic", desc: "Product of the Boltzmann and Avogadro constants.", value: "8.314462618", unit: "J·mol⁻¹·K⁻¹", source: "SI (defined)", related: ["k", "NA"], insert: "8.314462618 J/(mol K)" }),
  C({ id: "me", cat: "atomic", name: "mₑ", sig: "electron mass", tag: "Atomic", desc: "Rest mass of an electron.", value: "9.1093837015 × 10⁻³¹", unit: "kg", source: "CODATA 2018", related: ["mp"], insert: "9.1093837015e-31 kg" }),
  C({ id: "mp", cat: "atomic", name: "mₚ", sig: "proton mass", tag: "Atomic", desc: "Rest mass of a proton.", value: "1.67262192369 × 10⁻²⁷", unit: "kg", source: "CODATA 2018", related: ["me"], insert: "1.67262192369e-27 kg" }),
];
