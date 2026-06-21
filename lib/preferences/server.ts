import "server-only";
import { cookies } from "next/headers";
import {
  DENSITY_COOKIE,
  THEME_COOKIE,
  KEYMAP_COOKIE,
  parseDensity,
  parseTheme,
  parseKeymap,
  type Preferences,
} from "./cookies";

/**
 * Read display preferences from cookies during a Server Component render, so
 * the correct `data-density` / `data-theme` attributes are present in the very
 * first HTML payload (no client-side flash). Falls back to the defaults when a
 * cookie is missing or malformed.
 */
export async function readPreferences(): Promise<Preferences> {
  const store = await cookies();
  return {
    density: parseDensity(store.get(DENSITY_COOKIE)?.value),
    theme: parseTheme(store.get(THEME_COOKIE)?.value),
    keymap: parseKeymap(store.get(KEYMAP_COOKIE)?.value),
  };
}
