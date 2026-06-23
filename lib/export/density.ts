/**
 * Worksheet density tokens for the export render (Node-safe, pure).
 *
 * The editor and the browser export preview/print get `--ws-*` from
 * `app/styles/density.css` via the `[data-density]` cascade. The server PDF/HTML
 * render (`buildExportHtml` → `documentCss`) has no `data-density`, so it injects
 * the matching block here. Keep these numbers in sync with `density.css`
 * (compact = the engineering default; comfortable adds breathing room). Math
 * glyph sizes are intentionally NOT scaled — only spacing/leading.
 */
import type { Density } from "@/lib/preferences/cookies";

/** The `--ws-*` values the export document reads (subset used by document.tsx). */
export const DOC_DENSITY: Record<Density, Record<string, string>> = {
  compact: {
    "--ws-region-pad-y": "4px",
    "--ws-indent": "22px",
    "--ws-text-leading": "1.4",
    "--ws-cell-pad-y": "4px",
    "--ws-math-rowgap": "3px",
  },
  comfortable: {
    "--ws-region-pad-y": "6px",
    "--ws-indent": "30px",
    "--ws-text-leading": "1.55",
    "--ws-cell-pad-y": "5px",
    "--ws-math-rowgap": "4px",
  },
};

/** Default density for an export when the caller's preference is unknown. */
export const DEFAULT_EXPORT_DENSITY: Density = "compact";

/** CSS declarations (`--ws-…: …;`) for the chosen density, for a `:root` block. */
export function worksheetDensityCss(density: Density = DEFAULT_EXPORT_DENSITY): string {
  return Object.entries(DOC_DENSITY[density])
    .map(([k, v]) => `${k}:${v};`)
    .join("");
}
