/**
 * User-defined units (Functional Brief §2 — custom units & unit systems).
 *
 * A worksheet may define its own units (e.g. `kip := 4.4482216 kN`). They are
 * registered on the shared mathjs instance via `createUnit`, so the SAME parser,
 * dimensional analysis, conversion, and display path resolve them — there is no
 * forked unit resolver. A definition is a *value-unit* (a labeled scalar times a
 * base unit), which is exactly mathjs's required `createUnit` form. Definitions
 * may reference one another (e.g. `ksi := kip / in^2`), so we register in
 * dependency order and reject cycles; mathjs rejects unknown-symbol or
 * dimensionally-broken definitions, which we surface as typed, app-voice errors.
 *
 * Purity caveat: `createUnit` mutates the shared instance, so a unit registered
 * for one worksheet persists for the tab/session (mathjs has no de-register).
 * Each sheet re-registers its own units before evaluation, so its definitions
 * always win; cross-worksheet leakage of an *unused* name is a documented, benign
 * limitation (gone on reload). Pure otherwise: deterministic given the same defs.
 */
import { math } from "./math";

export interface UserUnitDef {
  /** The unit name, e.g. "kip". */
  name: string;
  /** Its value-unit definition, e.g. "4.4482216 kN". */
  definition: string;
}

export interface UserUnitError {
  name: string;
  /** What's wrong, in the app's voice. */
  message: string;
  /** How to fix it, in the app's voice. */
  fixHint?: string;
}

export interface RegisterResult {
  /** Names that resolved and are now usable. */
  registered: string[];
  /** Per-definition problems to surface in the Units editor. */
  errors: UserUnitError[];
}

/** What we've already registered, so re-registration is idempotent (`name → def`). */
const registry = new Map<string, string>();

const NAME_RE = /^[A-Za-zͰ-Ͽ][A-Za-z0-9_Ͱ-Ͽ]*$/;
const IDENT_RE = /[A-Za-zͰ-Ͽ][A-Za-z0-9_Ͱ-Ͽ]*/g;
/** Reserved math constants/keywords a custom unit must not shadow. */
const RESERVED = new Set(["pi", "e", "i", "phi", "tau", "true", "false", "null", "Infinity", "NaN"]);

/** mathjs createUnit needs a leading scalar; `kip / in^2` → `1 kip / in^2`. */
function withLeadingScalar(definition: string): string {
  return /^[-+]?[.\d]/.test(definition) ? definition : `1 ${definition}`;
}

/** Whether mathjs already resolves `name` as a unit (built-in or ours). */
function isExistingUnit(name: string): boolean {
  try {
    return math.Unit.isValuelessUnit(name);
  } catch {
    return false;
  }
}

function cleanMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.replace(/\s+/g, " ").trim().slice(0, 120);
}

/**
 * Order defs so each is registered after the custom units it references; names
 * that can never be ordered (a cycle, or a chain into one) come back as `cyclic`.
 */
function dependencyOrder(defs: UserUnitDef[]): { order: UserUnitDef[]; cyclic: string[] } {
  const names = new Set(defs.map((d) => d.name));
  const refs = new Map<string, Set<string>>();
  for (const d of defs) {
    const tokens = d.definition.match(IDENT_RE) ?? [];
    refs.set(d.name, new Set(tokens.filter((t) => names.has(t) && t !== d.name)));
  }

  const order: UserUnitDef[] = [];
  const done = new Set<string>();
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const d of defs) {
      if (done.has(d.name)) continue;
      if ([...refs.get(d.name)!].every((r) => done.has(r))) {
        order.push(d);
        done.add(d.name);
        progressed = true;
      }
    }
  }
  return { order, cyclic: defs.filter((d) => !done.has(d.name)).map((d) => d.name) };
}

/**
 * Register a worksheet's custom units on the shared engine, returning any typed
 * errors (duplicate / reserved / invalid / cyclic / dimensionally-broken). Safe
 * to call repeatedly: unchanged definitions are skipped, changed ones override.
 * Used both before evaluation (engine + export) and by the Units editor to
 * validate live.
 */
export function registerUserUnits(defs: UserUnitDef[]): RegisterResult {
  const errors: UserUnitError[] = [];
  const registered: string[] = [];
  const seen = new Set<string>();
  const valid: UserUnitDef[] = [];

  for (const raw of defs) {
    const name = raw.name?.trim() ?? "";
    const definition = raw.definition?.trim() ?? "";
    if (!name) {
      errors.push({ name: "", message: "A custom unit needs a name.", fixHint: "Name it, e.g. kip." });
      continue;
    }
    if (!NAME_RE.test(name)) {
      errors.push({ name, message: `"${name}" isn't a valid unit name.`, fixHint: "Use letters, digits, and underscores; start with a letter." });
      continue;
    }
    if (seen.has(name)) {
      errors.push({ name, message: `"${name}" is defined more than once.`, fixHint: "Remove the duplicate definition." });
      continue;
    }
    if (RESERVED.has(name)) {
      errors.push({ name, message: `"${name}" is a reserved name.`, fixHint: "Pick a different name for your unit." });
      continue;
    }
    if (!definition) {
      errors.push({ name, message: `"${name}" needs a definition.`, fixHint: `Define it, e.g. ${name} := 4.4482216 kN.` });
      continue;
    }
    seen.add(name);
    valid.push({ name, definition });
  }

  const { order, cyclic } = dependencyOrder(valid);
  for (const name of cyclic) {
    errors.push({ name, message: `"${name}" has a circular definition.`, fixHint: "Break the loop between your custom units." });
  }

  for (const def of order) {
    const normalized = withLeadingScalar(def.definition);
    // A name mathjs already provides (e.g. the built-in `kip`) resolves on its
    // own — use it rather than clobbering a shared built-in like `kN`/`m`.
    if (!registry.has(def.name) && isExistingUnit(def.name)) {
      registered.push(def.name);
      continue;
    }
    if (registry.get(def.name) === normalized) {
      registered.push(def.name);
      continue;
    }
    try {
      math.createUnit(def.name, normalized, { override: true });
      registry.set(def.name, normalized);
      registered.push(def.name);
    } catch (error) {
      errors.push({
        name: def.name,
        message: `"${def.name}" couldn't be defined: ${cleanMessage(error)}.`,
        fixHint: "Check the definition resolves to a quantity, e.g. 4.4482216 kN.",
      });
    }
  }

  return { registered, errors };
}
