/**
 * Symbolic-cache overlay (pure) — the read side of the export cache strategy.
 *
 * Symbolic (SymPy) results are produced by the async Pyodide worker, which the
 * Node PDF-export path cannot drive. The worker-computed result is persisted on
 * the math region as a versioned `cache` (lib/worksheet/content), and THIS module
 * overlays it onto the export's `RegionResult` map so the PDF shows the same
 * result the app shows — on a single deterministic Node path, with NO Pyodide.
 *
 * It is pure and synchronous and MUST NOT import the worker backend, so the Node
 * export never spins up Pyodide. Tree-aware (it walks content regions), so it
 * lives here in /lib/worksheet rather than /lib/calc, which stays pure-numeric.
 *
 * Staleness: the cache carries a `hash` of the input source it was computed from.
 * If the formula changed, the hash no longer matches and the cache is ignored.
 * Stale or absent ⇒ the region degrades to its committed formula plus a muted
 * placeholder — never blank.
 */
import { isSymbolic, normalizeSource, sourceToLatex, type RegionResult } from "@/lib/calc";
import { walkRegions } from "./flatten";
import type { WorksheetContent } from "./content";

/** Shown in the result position when a symbolic region has no fresh cache. */
export const SYMBOLIC_PLACEHOLDER = "Open in the app to compute";

/**
 * Stable hash of a region's normalized source. Deterministic and dependency-free
 * (FNV-1a, 32-bit) so it computes identically in the browser producer and the
 * Node export consumer. Normalizing first means LaTeX and equivalent plain-text
 * sources share a hash, while any real edit to the formula changes it.
 */
export function symbolicCacheHash(source: string): string {
  const normalized = normalizeSource(source);
  let h = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i += 1) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** The committed formula as TeX, falling back to the raw source if it won't convert. */
function committedTex(source: string): string {
  try {
    return sourceToLatex(source) || source;
  } catch {
    return source;
  }
}

/**
 * Overlay each symbolic region's cached worker result onto the results map. Pure:
 * returns the same map reference when there is nothing to overlay, otherwise a new
 * map (callers may pass an engine-owned map). Non-symbolic regions are untouched.
 */
export function applySymbolicCache(
  content: WorksheetContent,
  results: Map<string, RegionResult>,
): Map<string, RegionResult> {
  let next: Map<string, RegionResult> | null = null;

  const overlay = (id: string, patch: Partial<RegionResult>): void => {
    if (!next) next = new Map(results);
    const base: RegionResult = next.get(id) ?? {
      id,
      name: null,
      value: undefined,
      formatted: "",
      tex: "",
      status: "current",
    };
    next.set(id, { ...base, ...patch });
  };

  for (const region of walkRegions(content)) {
    if (region.type !== "math" || region.disabled) continue;
    if (!isSymbolic(region.source)) continue;

    const cache = region.cache;
    if (cache && cache.hash === symbolicCacheHash(region.source)) {
      // Fresh cache: render the worker's result. The symbolic answer is the TeX
      // we show; a unit-bearing value (if any) rides in `formatted`.
      overlay(region.id, {
        tex: cache.tex,
        value: cache.value,
        formatted: cache.unit ? `${cache.value ?? ""} ${cache.unit}`.trim() : "",
        status: "current",
        error: undefined,
      });
    } else {
      // Stale or absent: degrade to the committed formula + a muted placeholder.
      // Clearing `error` avoids surfacing the pure engine's "undefined symbol"
      // (it can't evaluate a symbolic expression), which would read as a failure.
      overlay(region.id, {
        tex: committedTex(region.source),
        value: undefined,
        formatted: SYMBOLIC_PLACEHOLDER,
        status: "stale",
        error: undefined,
      });
    }
  }

  return next ?? results;
}
