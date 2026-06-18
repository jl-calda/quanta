/**
 * Tree ↔ engine bridge (pure). The calc engine consumes a flat, reading-order
 * `RegionInput[]`; this module walks the worksheet content tree (rows top→bottom,
 * cells left→right, regions top→bottom, descending into areas) to produce it, and
 * maps `RegionResult`s back onto region ids for O(1) render lookup. Reading order
 * is what enforces "a name must be defined earlier than it is used".
 */
import type { RegionInput, RegionResult, SheetResult } from "@/lib/calc";
import type { Region, Row, WorksheetContent } from "./content";

/** Yield every region in reading order, descending into area children. */
export function* walkRegions(content: WorksheetContent): Generator<Region> {
  for (const row of content.rows) {
    for (const cell of row.cells) {
      yield* walkRegionList(cell.regions);
    }
  }
}

function* walkRegionList(regions: Region[]): Generator<Region> {
  for (const region of regions) {
    yield region;
    if (region.type === "area") yield* walkRegionList(region.regions);
  }
}

/**
 * Flatten the tree to the engine's reading-order input list. Only `math`
 * regions are evaluables this pass; their order in the list is the reading
 * order the engine uses for name visibility and recalc.
 */
export function flattenToRegionInputs(content: WorksheetContent): RegionInput[] {
  const inputs: RegionInput[] = [];
  for (const region of walkRegions(content)) {
    if (region.type !== "math") continue;
    inputs.push({
      id: region.id,
      source: region.source,
      unit: region.unit,
      format: region.format,
      conditional: region.conditional,
      display: region.display,
      disabled: region.disabled,
    });
  }
  return inputs;
}

/** Index a sheet result by region id, for render-time lookup. */
export function mapResults(sheet: SheetResult): Map<string, RegionResult> {
  const map = new Map<string, RegionResult>();
  for (const result of sheet.regions) map.set(result.id, result);
  return map;
}

/** All region ids in reading order (every type), e.g. for selection navigation. */
export function readingOrderIds(content: WorksheetContent): string[] {
  const ids: string[] = [];
  for (const region of walkRegions(content)) ids.push(region.id);
  return ids;
}

/** The defining math regions in reading order — drives the Variables panel. */
export function mathRegions(content: WorksheetContent): Region[] {
  const out: Region[] = [];
  for (const region of walkRegions(content)) {
    if (region.type === "math") out.push(region);
  }
  return out;
}

/** Find a region anywhere in the tree (including inside areas). */
export function findRegion(
  content: WorksheetContent,
  id: string,
): Region | undefined {
  for (const region of walkRegions(content)) {
    if (region.id === id) return region;
  }
  return undefined;
}

/** True when `id` is one of `regions` or nested inside one of their areas. */
function listHasRegion(regions: Region[], id: string): boolean {
  for (const region of regions) {
    if (region.id === id) return true;
    if (region.type === "area" && listHasRegion(region.regions, id)) return true;
  }
  return false;
}

/**
 * Find the row that owns a region id (descending into areas), or null. Drives
 * the ribbon's column controls — `SET_COLUMNS`/`TOGGLE_SPAN` operate on the row
 * holding the current selection, and the column picker reflects its count.
 */
export function findRowOf(content: WorksheetContent, id: string): Row | null {
  for (const row of content.rows) {
    for (const cell of row.cells) {
      if (listHasRegion(cell.regions, id)) return row;
    }
  }
  return null;
}
