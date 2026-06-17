/**
 * Settings model (Functional Brief §4.7).
 *
 * Two stores back the Settings screen:
 *   • {@link WorkspaceSettings} — per-workspace defaults applied to NEW worksheets,
 *     persisted to `workspaces.settings` (jsonb) and editable by owner/admin only.
 *   • {@link UserPreferences} — per-user appearance/editor prefs, persisted to
 *     `profiles.preferences` (jsonb), editable by the user themselves.
 *
 * The Units & formatting block maps onto the calc engine's {@link ResultFormat}
 * via {@link toResultFormat}, so the live preview runs the real formatter.
 */
import type { ResultFormat } from "@/lib/calc";
import type { Density, Theme } from "@/lib/preferences/cookies";
import type { KeymapId } from "@/lib/keymap";

/* ------------------------------------------------------------------ *
 * Workspace defaults (new-worksheet seed)
 * ------------------------------------------------------------------ */

export type CalcModePref = "auto" | "manual";
export type FindAlgo = "lm" | "conjgrad" | "quasinewton";
export type OdeAlgo = "rkf45" | "rkfixed" | "radau";
export type IntAlgo = "adaptive" | "romberg" | "simpson";

export type UnitSystemPref = "si" | "uscs" | "cgs" | "custom";
export type SigFigs = "auto" | "3" | "4" | "5" | "6";
export type NotationPref = "auto" | "sci" | "eng";
export type RadixPref = "dec" | "bin" | "oct" | "hex";
export type ComplexForm = "rect" | "polar";

/** How results are written. Drives the live preview and seeds new worksheets. */
export interface FormatSettings {
  decimals: number;
  sigFigs: SigFigs;
  notation: NotationPref;
  radix: RadixPref;
  expHigh: string;
  expLow: string;
  complex: ComplexForm;
  zeroSnap: boolean;
}

export interface WorkspaceSettings {
  // Recalculation
  calcMode: CalcModePref;
  recalcOnOpen: boolean;
  multithread: boolean;
  // Solving algorithms
  findAlgo: FindAlgo;
  odeAlgo: OdeAlgo;
  intAlgo: IntAlgo;
  // Convergence (free-form scientific-notation strings, like Mathcad)
  ctol: string;
  tol: string;
  maxIter: string;
  // Units & formatting
  unitSystem: UnitSystemPref;
  format: FormatSettings;
}

/** Mirrors the mockup's initial state (settings-app.jsx:195–196). */
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  calcMode: "auto",
  recalcOnOpen: true,
  multithread: true,
  findAlgo: "lm",
  odeAlgo: "rkf45",
  intAlgo: "adaptive",
  ctol: "1.0 × 10⁻³",
  tol: "1.0 × 10⁻³",
  maxIter: "100",
  unitSystem: "si",
  format: {
    decimals: 2,
    sigFigs: "auto",
    notation: "auto",
    radix: "dec",
    expHigh: "1.0 × 10⁶",
    expLow: "1.0 × 10⁻⁴",
    complex: "rect",
    zeroSnap: true,
  },
};

/* ------------------------------------------------------------------ *
 * Per-user preferences
 * ------------------------------------------------------------------ */

export interface UserPreferences {
  theme: Theme;
  density: Density;
  keymap: KeymapId;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "light",
  density: "compact",
  keymap: "mathcad",
};

/* ------------------------------------------------------------------ *
 * Engine mapping — Units & formatting → ResultFormat
 * ------------------------------------------------------------------ */

/**
 * Map the workspace's format block onto the engine's {@link ResultFormat}, used
 * by the live preview (and, later, to seed a new worksheet's regions).
 *
 * `decimals` and `sigfigs` are mutually exclusive: "auto" significant figures
 * lets `decimals` drive; a numeric cap sets `sigfigs` and drops `decimals`. The
 * engine carries a single symmetric `expThreshold`, so we derive it from the
 * "use exponential above" magnitude (both thresholds are still stored for
 * fidelity to the mockup).
 */
export function toResultFormat(f: FormatSettings): ResultFormat {
  const fmt: ResultFormat = {
    notation: f.notation,
    radix: f.radix,
  };

  if (f.sigFigs === "auto") {
    fmt.decimals = f.decimals;
  } else {
    fmt.sigfigs = Number(f.sigFigs);
  }

  if (f.zeroSnap) fmt.zeroThreshold = 1e-12;

  const threshold = exponentMagnitude(f.expHigh);
  if (threshold != null) fmt.expThreshold = threshold;

  return fmt;
}

/**
 * Pull an integer order-of-magnitude out of a threshold string such as
 * `"1.0 × 10⁶"` or `"1e6"`. Returns null when nothing parses, so the engine
 * keeps its default threshold.
 */
function exponentMagnitude(value: string): number | null {
  // Superscript exponent ("× 10⁶", incl. a leading ⁻).
  const sup = value.match(/10\s*([⁻⁰-⁹]+)/);
  if (sup) {
    const exp = fromSuperscript(sup[1]);
    if (exp != null) return Math.abs(exp);
  }
  // Plain scientific ("1e6", "1.0E-4") or "10^6".
  const ascii = value.match(/(?:e|10\^)\s*([+-]?\d+)/i);
  if (ascii) return Math.abs(Number(ascii[1]));
  return null;
}

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

function fromSuperscript(s: string): number | null {
  let sign = 1;
  let digits = "";
  for (const ch of s) {
    if (ch === "⁻") sign = -1;
    else {
      const i = SUPERSCRIPTS.indexOf(ch);
      if (i < 0) return null;
      digits += String(i);
    }
  }
  return digits.length ? sign * Number(digits) : null;
}
