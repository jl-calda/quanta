/**
 * Units catalog (Functional Brief §3.6 / 4.6 · Matrix G4).
 *
 * The unit half of the Reference library: a shipped, in-code dataset grouped by
 * physical quantity. Every `insert` string is a mathjs-valid literal (`"1 mm"`)
 * so dropping it into a worksheet evaluates immediately; `base`/`dim` are display
 * strings for the conversion panel. Engine-backed worked examples live on a few
 * entries to show unit propagation live (they can't drift).
 *
 * Scope note (see DECISIONS.md): only units the calc engine (stock mathjs)
 * understands are catalogued, so insertion never produces a parse error. USCS
 * units the engine doesn't yet register (kip, ksi) are deferred until the engine
 * registers them.
 */
import type { UnitRef } from "@/lib/calc/reference/types";

const U = (o: Omit<UnitRef, "kind">): UnitRef => ({ kind: "unit", ...o });

export const UNITS: UnitRef[] = [
  /* ---- length ---- */
  U({
    id: "mm",
    cat: "length",
    name: "mm",
    sig: "millimetre",
    tag: "Length",
    desc: "SI length, 10⁻³ m — the default working unit for sections and details.",
    base: "0.001 m",
    dim: "L",
    related: ["m", "cm", "in"],
    insert: "1 mm",
    units: "Lengths in mm flow through areas (mm²), section moduli (mm³), and stresses (N/mm² = MPa) without manual conversion.",
    example: {
      caption: "A length entered in mm converts cleanly to metres:",
      regions: ["L := 2500 mm"],
      units: ["m"],
      format: { decimals: 3 },
    },
  }),
  U({ id: "cm", cat: "length", name: "cm", sig: "centimetre", tag: "Length", desc: "SI length, 10⁻² m.", base: "0.01 m", dim: "L", related: ["mm", "m"], insert: "1 cm" }),
  U({ id: "m", cat: "length", name: "m", sig: "metre", tag: "Length", desc: "SI base unit of length.", base: "1 m", dim: "L", related: ["mm", "km", "ft"], insert: "1 m" }),
  U({ id: "km", cat: "length", name: "km", sig: "kilometre", tag: "Length", desc: "SI length, 10³ m.", base: "1000 m", dim: "L", related: ["m"], insert: "1 km" }),
  U({ id: "in", cat: "length", name: "in", sig: "inch", tag: "Length", desc: "USCS length, exactly 25.4 mm.", base: "0.0254 m", dim: "L", related: ["ft", "mm"], insert: "1 inch" }),
  U({ id: "ft", cat: "length", name: "ft", sig: "foot", tag: "Length", desc: "USCS length, 12 in.", base: "0.3048 m", dim: "L", related: ["in", "m"], insert: "1 foot" }),

  /* ---- force ---- */
  U({
    id: "kN",
    cat: "force",
    name: "kN",
    sig: "kilonewton",
    tag: "Force",
    desc: "SI force, 10³ N — the everyday unit for member actions.",
    base: "1000 N",
    dim: "M·L·T⁻²",
    related: ["N", "MN", "MPa"],
    insert: "1 kN",
    example: {
      caption: "Force × distance gives a moment in kN·m automatically:",
      regions: ["M := 12 kN * 3 m"],
      units: ["kN m"],
      format: { decimals: 1 },
    },
  }),
  U({ id: "N", cat: "force", name: "N", sig: "newton", tag: "Force", desc: "SI derived unit of force, kg·m/s².", base: "1 kg·m/s²", dim: "M·L·T⁻²", related: ["kN", "lbf"], insert: "1 N" }),
  U({ id: "MN", cat: "force", name: "MN", sig: "meganewton", tag: "Force", desc: "SI force, 10⁶ N.", base: "1e6 N", dim: "M·L·T⁻²", related: ["kN", "N"], insert: "1 MN" }),
  U({ id: "lbf", cat: "force", name: "lbf", sig: "pound-force", tag: "Force", desc: "USCS force.", base: "4.44822 N", dim: "M·L·T⁻²", related: ["N", "kN"], insert: "1 lbf" }),

  /* ---- pressure / stress ---- */
  U({
    id: "MPa",
    cat: "pressure",
    name: "MPa",
    sig: "megapascal",
    tag: "Pressure / stress",
    desc: "SI stress, 10⁶ Pa = N/mm² — the standard unit for material strengths.",
    base: "1e6 Pa",
    dim: "M·L⁻¹·T⁻²",
    related: ["Pa", "kPa", "GPa"],
    insert: "1 MPa",
    example: {
      caption: "Stress × area returns a force; MPa·mm² resolves to N:",
      regions: ["A := 157 mm^2", "F := 250 MPa * A"],
      units: [undefined, "kN"],
      format: { decimals: 1 },
    },
  }),
  U({ id: "Pa", cat: "pressure", name: "Pa", sig: "pascal", tag: "Pressure / stress", desc: "SI derived unit of pressure, N/m².", base: "1 N/m²", dim: "M·L⁻¹·T⁻²", related: ["kPa", "MPa"], insert: "1 Pa" }),
  U({ id: "kPa", cat: "pressure", name: "kPa", sig: "kilopascal", tag: "Pressure / stress", desc: "SI pressure, 10³ Pa.", base: "1000 Pa", dim: "M·L⁻¹·T⁻²", related: ["Pa", "MPa"], insert: "1 kPa" }),
  U({ id: "GPa", cat: "pressure", name: "GPa", sig: "gigapascal", tag: "Pressure / stress", desc: "SI stress, 10⁹ Pa — elastic moduli (steel E ≈ 200 GPa).", base: "1e9 Pa", dim: "M·L⁻¹·T⁻²", related: ["MPa"], insert: "1 GPa" }),
  U({ id: "psi", cat: "pressure", name: "psi", sig: "pounds per sq. inch", tag: "Pressure / stress", desc: "USCS pressure / stress.", base: "6894.76 Pa", dim: "M·L⁻¹·T⁻²", related: ["MPa", "bar"], insert: "1 psi" }),
  U({ id: "bar", cat: "pressure", name: "bar", sig: "bar", tag: "Pressure / stress", desc: "Metric pressure, 10⁵ Pa ≈ 1 atm.", base: "1e5 Pa", dim: "M·L⁻¹·T⁻²", related: ["kPa", "Pa"], insert: "1 bar" }),

  /* ---- mass ---- */
  U({ id: "kg", cat: "mass", name: "kg", sig: "kilogram", tag: "Mass", desc: "SI base unit of mass.", base: "1 kg", dim: "M", related: ["g", "tonne", "lbm"], insert: "1 kg" }),
  U({ id: "g", cat: "mass", name: "g", sig: "gram", tag: "Mass", desc: "SI mass, 10⁻³ kg.", base: "0.001 kg", dim: "M", related: ["kg"], insert: "1 g" }),
  U({ id: "tonne", cat: "mass", name: "t", sig: "tonne", tag: "Mass", desc: "Metric ton, 10³ kg.", base: "1000 kg", dim: "M", related: ["kg"], insert: "1 tonne" }),
  U({ id: "lbm", cat: "mass", name: "lb", sig: "pound-mass", tag: "Mass", desc: "USCS mass.", base: "0.453592 kg", dim: "M", related: ["kg"], insert: "1 lbm" }),

  /* ---- time ---- */
  U({ id: "s", cat: "time", name: "s", sig: "second", tag: "Time", desc: "SI base unit of time.", base: "1 s", dim: "T", related: ["ms", "minute", "hr"], insert: "1 s" }),
  U({ id: "ms", cat: "time", name: "ms", sig: "millisecond", tag: "Time", desc: "SI time, 10⁻³ s.", base: "0.001 s", dim: "T", related: ["s"], insert: "1 ms" }),
  U({ id: "minute", cat: "time", name: "min", sig: "minute", tag: "Time", desc: "60 s.", base: "60 s", dim: "T", related: ["s", "hr"], insert: "1 minute" }),
  U({ id: "hr", cat: "time", name: "hr", sig: "hour", tag: "Time", desc: "3600 s.", base: "3600 s", dim: "T", related: ["minute", "s"], insert: "1 hour" }),

  /* ---- temperature ---- */
  U({ id: "degC", cat: "temperature", name: "°C", sig: "degree Celsius", tag: "Temperature", desc: "Common temperature scale; affine to kelvin (°C + 273.15).", base: "K − 273.15", dim: "Θ", related: ["K", "degF"], insert: "1 degC" }),
  U({ id: "K", cat: "temperature", name: "K", sig: "kelvin", tag: "Temperature", desc: "SI base unit of thermodynamic temperature.", base: "1 K", dim: "Θ", related: ["degC", "degF"], insert: "1 K" }),
  U({ id: "degF", cat: "temperature", name: "°F", sig: "degree Fahrenheit", tag: "Temperature", desc: "USCS temperature scale; affine to kelvin.", base: "(°F + 459.67) × 5/9 K", dim: "Θ", related: ["degC", "K"], insert: "1 degF" }),

  /* ---- electrical ---- */
  U({ id: "A", cat: "electrical", name: "A", sig: "ampere", tag: "Electrical", desc: "SI base unit of electric current.", base: "1 A", dim: "I", related: ["mA", "V", "ohm"], insert: "1 A" }),
  U({ id: "mA", cat: "electrical", name: "mA", sig: "milliampere", tag: "Electrical", desc: "SI current, 10⁻³ A.", base: "0.001 A", dim: "I", related: ["A"], insert: "1 mA" }),
  U({ id: "V", cat: "electrical", name: "V", sig: "volt", tag: "Electrical", desc: "SI derived unit of electric potential.", base: "1 W/A", dim: "M·L²·T⁻³·I⁻¹", related: ["A", "ohm"], insert: "1 V" }),
  U({ id: "ohm", cat: "electrical", name: "Ω", sig: "ohm", tag: "Electrical", desc: "SI derived unit of electrical resistance.", base: "1 V/A", dim: "M·L²·T⁻³·I⁻²", related: ["A", "V"], insert: "1 ohm" }),
];
