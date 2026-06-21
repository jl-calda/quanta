/**
 * Plot trace palettes (pure data, no React) — the single source of truth for the
 * named color *themes* a plot can pick. Lives in the tree layer (not `lib/calc`)
 * because colors are presentation, never part of the deterministic engine value
 * model: the engine carries only a per-trace `color` OVERRIDE; the theme supplies
 * the defaults a renderer falls back to.
 *
 * Colors are stored as print-safe hex so the framework-agnostic export
 * (`lib/export/document.tsx`) and the on-screen SVG renderer can share one table.
 * On screen the renderer swaps the DEFAULT palette for design-system CSS variables
 * (see `plot-present.tsx`) so the default look tracks the light/dark theme; the
 * curated themes are intentional fixed hues drawn from the locked base palette.
 */

export interface PlotTheme {
  label: string;
  /** Trace colors, cycled by trace index; print-safe hex. */
  colors: string[];
}

/** Named palettes. `default` is the blueprint-first design-system set. */
export const PLOT_THEMES: Record<string, PlotTheme> = {
  default: { label: "Default", colors: ["#1F5FBF", "#1E8E5A", "#C6890B", "#18509F", "#C2392B"] },
  blueprint: { label: "Blueprint", colors: ["#1F5FBF", "#18509F", "#5B9BFF", "#6B7280", "#15181D"] },
  earth: { label: "Earth", colors: ["#1E8E5A", "#C6890B", "#C2392B", "#6B7280", "#1F5FBF"] },
  contrast: { label: "Contrast", colors: ["#15181D", "#1F5FBF", "#1E8E5A", "#C2392B", "#C6890B"] },
};

/** The palette for a theme id (hex), falling back to `default` for unknown ids. */
export function themePalette(theme: string | undefined): string[] {
  return PLOT_THEMES[theme ?? "default"]?.colors ?? PLOT_THEMES.default.colors;
}

/** Theme options for a picker (stable order, default first). */
export const PLOT_THEME_OPTIONS: { value: string; label: string }[] = [
  "default",
  "blueprint",
  "earth",
  "contrast",
].map((id) => ({ value: id, label: PLOT_THEMES[id].label }));
