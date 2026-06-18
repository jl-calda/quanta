/**
 * Scroll-to-region — the bridge between the left panel (Outline / Variables) and
 * the canvas. Each region's wrapper carries a stable DOM id (`region-<id>`); the
 * panel selects a region and then asks the canvas to bring it into view.
 */

/** Stable DOM id for a region's wrapper in the canvas. */
export function regionDomId(id: string): string {
  return `region-${id}`;
}

/**
 * Scroll the canvas so the region is visible. A no-op when the region has no DOM
 * node (e.g. it lives inside a collapsed area) — selection still applies, and the
 * region scrolls into view the next time its area is expanded. Honors
 * `prefers-reduced-motion`.
 */
export function scrollToRegion(id: string): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(regionDomId(id));
  if (!el) return;
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
}
