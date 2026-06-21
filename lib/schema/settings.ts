import { z } from "zod";
import {
  DEFAULT_USER_PREFERENCES,
  DEFAULT_WORKSPACE_SETTINGS,
  type UserPreferences,
  type WorkspaceSettings,
} from "@/lib/settings/types";

/**
 * Settings input schemas (Func §4.7). Validate Server Action payloads and parse
 * the jsonb columns (`workspaces.settings`, `profiles.preferences`) tolerantly —
 * the columns default to `'{}'`, so a miss falls back to the typed defaults
 * rather than throwing.
 */

const tolerance = z.string().trim().min(1).max(40);

export const formatSettingsSchema = z.object({
  decimals: z.number().int().min(0).max(8),
  sigFigs: z.enum(["auto", "3", "4", "5", "6"]),
  notation: z.enum(["auto", "sci", "eng"]),
  radix: z.enum(["dec", "bin", "oct", "hex"]),
  expHigh: tolerance,
  expLow: tolerance,
  complex: z.enum(["rect", "polar"]),
  zeroSnap: z.boolean(),
});

export const workspaceSettingsSchema = z.object({
  calcMode: z.enum(["auto", "manual"]),
  recalcOnOpen: z.boolean(),
  multithread: z.boolean(),
  findAlgo: z.enum(["lm", "conjgrad", "quasinewton"]),
  odeAlgo: z.enum(["rkf45", "rkfixed", "radau"]),
  intAlgo: z.enum(["adaptive", "romberg", "simpson"]),
  ctol: tolerance,
  tol: tolerance,
  maxIter: z.string().trim().min(1).max(12),
  unitSystem: z.enum(["si", "uscs", "cgs", "custom"]),
  format: formatSettingsSchema,
  allowViewerExport: z.boolean().default(false),
});

export const userPreferencesSchema = z.object({
  theme: z.enum(["light", "dark"]),
  density: z.enum(["compact", "comfortable"]),
  keymap: z.enum(["mathcad", "default"]),
});

/** Partial patch for incremental per-user saves (one section at a time). */
export const userPreferencesPatchSchema = userPreferencesSchema.partial();

/**
 * Parse `workspaces.settings` jsonb into typed {@link WorkspaceSettings}, filling
 * any missing/invalid field from the defaults so older or empty rows still load.
 */
export function parseWorkspaceSettings(json: unknown): WorkspaceSettings {
  const parsed = workspaceSettingsSchema.safeParse(json);
  if (parsed.success) return parsed.data;

  // Field-by-field merge so a partially-shaped row keeps what it can.
  const obj = (json && typeof json === "object" ? json : {}) as Record<
    string,
    unknown
  >;
  const merged = { ...DEFAULT_WORKSPACE_SETTINGS, ...obj, format: { ...DEFAULT_WORKSPACE_SETTINGS.format, ...(obj.format as object) } };
  const remerge = workspaceSettingsSchema.safeParse(merged);
  return remerge.success ? remerge.data : DEFAULT_WORKSPACE_SETTINGS;
}

/** Parse `profiles.preferences` jsonb into typed {@link UserPreferences}. */
export function parseUserPreferences(json: unknown): UserPreferences {
  const parsed = userPreferencesSchema.safeParse(json);
  if (parsed.success) return parsed.data;

  const obj = (json && typeof json === "object" ? json : {}) as Record<
    string,
    unknown
  >;
  const merged = { ...DEFAULT_USER_PREFERENCES, ...obj };
  const remerge = userPreferencesSchema.safeParse(merged);
  return remerge.success ? remerge.data : DEFAULT_USER_PREFERENCES;
}
