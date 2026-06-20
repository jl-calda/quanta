/**
 * Quanta — display preference cookies (density + theme).
 *
 * Preferences are persisted in cookies (not localStorage) so they can be read
 * on the server during render and applied to <html> with no flash of the
 * wrong density/theme. CLAUDE.md forbids localStorage/sessionStorage in client
 * components; cookies are the SSR-safe equivalent.
 */

import type { KeymapId } from "@/lib/keymap";

export const DENSITY_COOKIE = "quanta-density";
export const THEME_COOKIE = "quanta-theme";
export const KEYMAP_COOKIE = "quanta-keymap";

export type Density = "compact" | "comfortable";
export type Theme = "light" | "dark";

/** Compact is the default density (per the _ds density system). */
export const DEFAULT_DENSITY: Density = "compact";
/** Light is the default theme (dark is opt-in via [data-theme="dark"]). */
export const DEFAULT_THEME: Theme = "light";
/** Mathcad-style entry is the default keymap (CLAUDE.md / Func §7). */
export const DEFAULT_KEYMAP: KeymapId = "mathcad";

/** One year — preferences are sticky. */
export const PREF_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseDensity(value: string | null | undefined): Density {
  return value === "comfortable" ? "comfortable" : DEFAULT_DENSITY;
}

export function parseTheme(value: string | null | undefined): Theme {
  return value === "dark" ? "dark" : DEFAULT_THEME;
}

export function parseKeymap(value: string | null | undefined): KeymapId {
  return value === "default" ? "default" : DEFAULT_KEYMAP;
}

export interface Preferences {
  density: Density;
  theme: Theme;
  keymap: KeymapId;
}

export const DEFAULT_PREFERENCES: Preferences = {
  density: DEFAULT_DENSITY,
  theme: DEFAULT_THEME,
  keymap: DEFAULT_KEYMAP,
};
