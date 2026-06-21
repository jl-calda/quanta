/**
 * Reference catalog assembly — the category tree, the flat `ALL` list, and the
 * lookup indices the browser and tests build on. Pure data; no engine, no DB.
 */
import type { ReferenceItem, ReferenceTree, RefGroup } from "./types";
import { FUNCTIONS } from "./functions";
import { UNITS } from "@/lib/units/catalog";
import { CONSTANTS } from "@/lib/constants/catalog";

/** The three groups and their subcategories, in display order. */
export const TREE: ReferenceTree = {
  FUNCTIONS: [
    { id: "mathtrig", label: "Math & trig" },
    { id: "stats", label: "Statistics" },
    { id: "solving", label: "Solving" },
    { id: "matrix", label: "Matrix & vector" },
    { id: "lookup", label: "Lookup & data" },
    { id: "programming", label: "Programming" },
    { id: "string", label: "String" },
    { id: "date", label: "Date & time" },
    { id: "engineering", label: "Engineering" },
  ],
  UNITS: [
    { id: "length", label: "Length" },
    { id: "force", label: "Force" },
    { id: "pressure", label: "Pressure / stress" },
    { id: "mass", label: "Mass" },
    { id: "time", label: "Time" },
    { id: "temperature", label: "Temperature" },
    { id: "electrical", label: "Electrical" },
  ],
  CONSTANTS: [
    { id: "universal", label: "Universal" },
    { id: "electromagnetic", label: "Electromagnetic" },
    { id: "atomic", label: "Atomic" },
  ],
};

/** Which group a subcategory belongs to, derived from {@link TREE}. */
export const GROUP_OF_CAT: Record<string, RefGroup> = Object.fromEntries(
  (Object.entries(TREE) as [RefGroup, { id: string }[]][]).flatMap(([group, subs]) =>
    subs.map((s) => [s.id, group] as const),
  ),
);

/** Every catalog item, in group order (functions, units, constants). */
export const ALL: ReferenceItem[] = [...FUNCTIONS, ...UNITS, ...CONSTANTS];

const BY_ID = new Map(ALL.map((it) => [it.id, it]));

/** Resolve an item by its id. */
export function itemById(id: string): ReferenceItem | undefined {
  return BY_ID.get(id);
}

/**
 * Resolve a `related` token, which may be an id (`"g0"`) or a display name
 * (`"Vlookup"`). Returns the item or undefined when nothing matches.
 */
export function resolveRelated(token: string): ReferenceItem | undefined {
  const direct = BY_ID.get(token);
  if (direct) return direct;
  const lower = token.toLowerCase();
  return (
    BY_ID.get(lower) ??
    ALL.find((it) => it.name === token || it.name.toLowerCase() === lower)
  );
}

/** Human label for a subcategory id (e.g. `"lookup"` → `"Lookup & data"`). */
export function categoryLabel(cat: string): string {
  for (const subs of Object.values(TREE)) {
    const found = subs.find((s) => s.id === cat);
    if (found) return found.label;
  }
  return "";
}

/** Count of catalog items in a subcategory. */
export function categoryCount(cat: string): number {
  return ALL.reduce((n, it) => (it.cat === cat ? n + 1 : n), 0);
}
