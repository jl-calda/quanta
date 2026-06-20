"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DENSITY_COOKIE,
  THEME_COOKIE,
  KEYMAP_COOKIE,
  PREF_COOKIE_MAX_AGE,
  type Density,
  type Theme,
} from "./cookies";
import { getKeymap, type Keymap, type KeymapId } from "@/lib/keymap";

interface PreferencesContextValue {
  density: Density;
  theme: Theme;
  keymap: KeymapId;
  setDensity: (density: Density) => void;
  setTheme: (theme: Theme) => void;
  setKeymap: (keymap: KeymapId) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function writeCookie(name: string, value: string) {
  // Cookie-backed (not localStorage) so the value is available on the next
  // server render and never flashes the wrong state.
  document.cookie = `${name}=${value}; path=/; max-age=${PREF_COOKIE_MAX_AGE}; samesite=lax`;
}

export function PreferencesProvider({
  initialDensity,
  initialTheme,
  initialKeymap,
  children,
}: {
  initialDensity: Density;
  initialTheme: Theme;
  initialKeymap: KeymapId;
  children: ReactNode;
}) {
  const [density, setDensityState] = useState<Density>(initialDensity);
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [keymap, setKeymapState] = useState<KeymapId>(initialKeymap);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    document.documentElement.setAttribute("data-density", next);
    writeCookie(DENSITY_COOKIE, next);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    writeCookie(THEME_COOKIE, next);
  }, []);

  const setKeymap = useCallback((next: KeymapId) => {
    // Cookie-backed (not localStorage) so the editor reads the right keymap on
    // the next server render with no flash — CLAUDE.md forbids localStorage.
    setKeymapState(next);
    writeCookie(KEYMAP_COOKIE, next);
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({ density, theme, keymap, setDensity, setTheme, setKeymap }),
    [density, theme, keymap, setDensity, setTheme, setKeymap],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return ctx;
}

export function useDensity() {
  const { density, setDensity } = usePreferences();
  return { density, setDensity };
}

export function useTheme() {
  const { theme, setTheme } = usePreferences();
  return { theme, setTheme };
}

/**
 * The active keymap. Returns both the id (for the picker) and the resolved
 * {@link Keymap} object (the single source of truth the editor, the MathLive
 * bridge, the shortcuts modal, and the keypad all read).
 */
export function useKeymap(): {
  keymapId: KeymapId;
  keymap: Keymap;
  setKeymap: (keymap: KeymapId) => void;
} {
  const { keymap, setKeymap } = usePreferences();
  return { keymapId: keymap, keymap: getKeymap(keymap), setKeymap };
}
