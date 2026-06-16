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
  PREF_COOKIE_MAX_AGE,
  type Density,
  type Theme,
} from "./cookies";

interface PreferencesContextValue {
  density: Density;
  theme: Theme;
  setDensity: (density: Density) => void;
  setTheme: (theme: Theme) => void;
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
  children,
}: {
  initialDensity: Density;
  initialTheme: Theme;
  children: ReactNode;
}) {
  const [density, setDensityState] = useState<Density>(initialDensity);
  const [theme, setThemeState] = useState<Theme>(initialTheme);

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

  const value = useMemo<PreferencesContextValue>(
    () => ({ density, theme, setDensity, setTheme }),
    [density, theme, setDensity, setTheme],
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
