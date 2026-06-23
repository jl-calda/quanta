/**
 * Page geometry — the single, shared layout math behind the on-screen worksheet
 * page AND the export preview, so the two render identically (the on-screen page
 * "matches the PDF / print layout").
 *
 * Pure and framework-agnostic: imported by the client canvas, the client export
 * overlay, and the Vitest node suite — so it must never reach for browser or Node
 * globals. It reuses the export-specific constants from `lib/export/options.ts`
 * (one source per concern; we import, never duplicate).
 *
 * Two surfaces:
 *  - ON-SCREEN page: driven by the worksheet's `page_settings` (5 sizes, mm
 *    margins, gridlines, header/footer bands) — `resolvePageGeometry`.
 *  - EXPORT preview: driven by `ExportOptions` (A4/Letter, margin presets) — the
 *    pre-existing `PreviewPages` numbers, factored out as `resolveExportPreviewGeometry`.
 */
import {
  MARGIN_PX,
  pageBox,
  type ExportOptions,
  type Margin,
  type Orientation,
  type PageSize,
} from "@/lib/export/options";
import type { HeaderFooterBand, PageSettings } from "@/lib/schema/page";

/* ------------------------------------------------------------------ *
 * Physical → CSS px (96dpi)
 * ------------------------------------------------------------------ */

/** CSS px per millimetre at 96dpi (1in = 25.4mm = 96px). */
export const PX_PER_MM = 96 / 25.4;

/** Millimetres → whole CSS px at 96dpi. */
export function mmToPx(mm: number): number {
  return Math.round(mm * PX_PER_MM);
}

/* ------------------------------------------------------------------ *
 * Page boxes for every page-setup size (CSS px @96dpi, portrait)
 * ------------------------------------------------------------------ */

/** The page-setup size enum (`lib/schema/page.ts` PAGE_SIZES). */
export type PageSizeKey = PageSettings["size"];

/**
 * Page box in CSS px at 96dpi (portrait; landscape swaps w/h). a4/letter match
 * the export `PAGE_DIMS` exactly so the two layouts agree for the shared sizes.
 */
export const PAGE_DIMS_96: Record<PageSizeKey, { w: number; h: number }> = {
  a4: { w: 794, h: 1123 }, // 210 × 297 mm  — == export PAGE_DIMS.A4
  letter: { w: 816, h: 1056 }, // 8.5 × 11 in — == export PAGE_DIMS.Letter
  legal: { w: 816, h: 1344 }, // 8.5 × 14 in
  a3: { w: 1123, h: 1587 }, // 297 × 420 mm
  tabloid: { w: 1056, h: 1632 }, // 11 × 17 in
};

/**
 * On-screen running-band heights. The header/footer reserve this much vertical
 * space per page; tuned to the ledger look of the old hardcoded `Band`
 * (8px padding + 1px hairline ≈ a ~30px strip).
 */
export const SCREEN_HEADER_H = 30;
export const SCREEN_FOOTER_H = 30;

/** Resolved on-screen page geometry, all in unscaled CSS px (zoom is applied separately). */
export interface PageGeometry {
  /** Orientation-resolved full page box. */
  pageW: number;
  pageH: number;
  /** Margins from page-setup, converted mm → px. */
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  /** Running header/footer band heights. */
  headerH: number;
  footerH: number;
  /** Flowable content width (pageW − left − right margins). */
  contentW: number;
  /** One page's flowable content height (pageH − header − footer − top − bottom margins). */
  pageContentH: number;
  /** Dot-grid spacing + visibility from page-setup. */
  gridSpacing: number;
  gridShow: boolean;
}

/** Resolve the on-screen page geometry from the worksheet's page-setup settings. */
export function resolvePageGeometry(p: PageSettings): PageGeometry {
  const base = PAGE_DIMS_96[p.size];
  const pageW = p.orientation === "landscape" ? base.h : base.w;
  const pageH = p.orientation === "landscape" ? base.w : base.h;

  const marginTop = mmToPx(p.margins.top);
  const marginRight = mmToPx(p.margins.right);
  const marginBottom = mmToPx(p.margins.bottom);
  const marginLeft = mmToPx(p.margins.left);

  const headerH = SCREEN_HEADER_H;
  const footerH = SCREEN_FOOTER_H;

  return {
    pageW,
    pageH,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    headerH,
    footerH,
    contentW: pageW - marginLeft - marginRight,
    pageContentH: pageH - headerH - footerH - marginTop - marginBottom,
    gridSpacing: p.gridlines.spacing,
    gridShow: p.gridlines.show,
  };
}

/**
 * How many pages a column of `contentHeight` (px, the flowed content only) needs.
 * At least one — a short or empty sheet still shows a full bounded page.
 */
export function pageCountForHeight(contentHeight: number, geom: PageGeometry): number {
  if (geom.pageContentH <= 0) return 1;
  return Math.max(1, Math.ceil(contentHeight / geom.pageContentH));
}

/* ------------------------------------------------------------------ *
 * Export-preview parity — keep PreviewPages byte-identical
 * ------------------------------------------------------------------ */

/** Export-preview running-band heights (the pre-existing PreviewPages constants). */
export const EXPORT_HEADER_H = 34;
export const EXPORT_FOOTER_H = 30;

export interface ExportPreviewGeometry {
  dims: { w: number; h: number };
  pad: { x: number; y: number };
  headerH: number;
  footerH: number;
  contentW: number;
  contentH: number;
}

/**
 * The export preview's page geometry — factored out of `PreviewPages` so the
 * overlay and (potentially) other consumers share one definition. Returns the
 * exact same numbers the inline code used, so the refactor has no visual diff.
 */
export function resolveExportPreviewGeometry(
  size: PageSize,
  orientation: Orientation,
  margin: Margin,
): ExportPreviewGeometry {
  const dims = pageBox(size, orientation);
  const pad = MARGIN_PX[margin];
  return {
    dims,
    pad,
    headerH: EXPORT_HEADER_H,
    footerH: EXPORT_FOOTER_H,
    contentW: dims.w - pad.x * 2,
    contentH: dims.h - EXPORT_HEADER_H - EXPORT_FOOTER_H - pad.y * 2,
  };
}

/* ------------------------------------------------------------------ *
 * Seeding: page-setup → export options (defaults only, lossy + surfaced)
 * ------------------------------------------------------------------ */

/**
 * Map a page-setup size to the nearest size the PDF pipeline can produce today.
 * Legal → Letter (both US, same width); A3/Tabloid → the portrait-ish A4/Letter.
 */
const SIZE_MAP: Record<PageSizeKey, PageSize> = {
  a4: "A4",
  letter: "Letter",
  legal: "Letter",
  a3: "A4",
  tabloid: "A4",
};

/** Margin preset → its CSS mm length (mirrors `MARGIN_CSS` in options.ts). */
const PRESET_MM: Record<Margin, number> = { narrow: 10, normal: 16, wide: 24 };

/** The margin preset whose mm length is closest to the four-margin average. */
function nearestMarginPreset(margins: PageSettings["margins"]): Margin {
  const avg = (margins.top + margins.right + margins.bottom + margins.left) / 4;
  const presets: Margin[] = ["narrow", "normal", "wide"];
  return presets.reduce((best, k) =>
    Math.abs(PRESET_MM[k] - avg) < Math.abs(PRESET_MM[best] - avg) ? k : best,
  );
}

/** Flatten a 3-zone band to a single string (prefer centre, then left, then right). */
export function bandToString(b: HeaderFooterBand): string {
  return (b.center || b.left || b.right || "").trim();
}

/**
 * Seed the export overlay's page options from page-setup. Only the page-geometry
 * fields (size/orientation/margin/header/footer) — the user can still override
 * every one in the overlay; the rest of `ExportOptions` keeps its own defaults.
 */
export function pageSettingsToExportOptions(
  p: PageSettings,
): Pick<ExportOptions, "size" | "orientation" | "margin" | "header" | "footer"> {
  return {
    size: SIZE_MAP[p.size],
    orientation: p.orientation,
    margin: nearestMarginPreset(p.margins),
    header: bandToString(p.header),
    footer: bandToString(p.footer),
  };
}

/** True when the page-setup size has no native PDF size — drives the overlay's "exporting as …" note. */
export function isLossyExportSize(size: PageSizeKey): boolean {
  return size === "legal" || size === "a3" || size === "tabloid";
}

/** The export size a given page-setup size maps to (for the overlay note). */
export function exportSizeLabel(size: PageSizeKey): PageSize {
  return SIZE_MAP[size];
}

/* ------------------------------------------------------------------ *
 * Header/footer field tokens
 * ------------------------------------------------------------------ */

/** Values for the header/footer field tokens. `date`/`time` are caller-supplied (keeps this pure). */
export interface TokenCtx {
  page: number;
  pages: number;
  title: string;
  date: string;
  time: string;
}

/** Expand the page-setup field tokens (`{page}`, `{pages}`, `{title}`, `{date}`, `{time}`). */
export function expandTokens(text: string, ctx: TokenCtx): string {
  return text
    .replaceAll("{page}", String(ctx.page))
    .replaceAll("{pages}", String(ctx.pages))
    .replaceAll("{title}", ctx.title)
    .replaceAll("{date}", ctx.date)
    .replaceAll("{time}", ctx.time);
}
