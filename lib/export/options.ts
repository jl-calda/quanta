/**
 * Export options (Functional Brief §4.10) — the single, shared shape behind the
 * preview overlay, the server generators, and their zod-validated payloads.
 *
 * Pure and framework-agnostic: imported by the client overlay AND the Node
 * generators, so it must never reach for browser or Node globals.
 */
import { z } from "zod";

export type ExportFormat = "pdf" | "docx" | "html" | "xlsx" | "print";
export type PageSize = "A4" | "Letter";
export type Orientation = "portrait" | "landscape";
export type Margin = "narrow" | "normal" | "wide";

export interface ExportOptions {
  format: ExportFormat;
  size: PageSize;
  orientation: Orientation;
  /** Margin preset; maps to `MARGIN_PX` (screen) and CSS lengths (PDF). */
  margin: Margin;
  /** Page subset, e.g. `"1-3, 5"`. Empty string ⇒ all pages. */
  pageRange: string;
  /** Expand each result to the formula with values substituted (show-steps). */
  steps: boolean;
  /** Table of named inputs at the top of page 1. */
  inputsSummary: boolean;
  /** Outline every region — useful for checking sets. */
  borders: boolean;
  header: string;
  footer: string;
  /** Faint diagonal stamp, e.g. "DRAFT — NOT FOR CONSTRUCTION". Empty ⇒ none. */
  watermark: string;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "pdf",
  size: "A4",
  orientation: "portrait",
  margin: "normal",
  pageRange: "",
  steps: false,
  inputsSummary: true,
  borders: false,
  header: "",
  footer: "",
  watermark: "",
};

export const exportOptionsSchema = z.object({
  format: z.enum(["pdf", "docx", "html", "xlsx", "print"]),
  size: z.enum(["A4", "Letter"]),
  orientation: z.enum(["portrait", "landscape"]),
  margin: z.enum(["narrow", "normal", "wide"]),
  pageRange: z.string().max(120).default(""),
  steps: z.boolean(),
  inputsSummary: z.boolean(),
  borders: z.boolean(),
  header: z.string().max(200).default(""),
  footer: z.string().max(200).default(""),
  watermark: z.string().max(80).default(""),
});

/* ------------------------------------------------------------------ *
 * Layout constants — ported from the mockup (export-app.jsx)
 * ------------------------------------------------------------------ */

/** Page box in CSS px at 96dpi (portrait). Landscape swaps w/h. */
export const PAGE_DIMS: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 794, h: 1123 },
  Letter: { w: 816, h: 1056 },
};

/** Body padding in px per margin preset (x = sides, y = top/bottom). */
export const MARGIN_PX: Record<Margin, { x: number; y: number }> = {
  narrow: { x: 38, y: 30 },
  normal: { x: 58, y: 46 },
  wide: { x: 84, y: 64 },
};

/** Margin preset → CSS length for Puppeteer's `page.pdf({ margin })`. */
export const MARGIN_CSS: Record<Margin, { top: string; bottom: string; left: string; right: string }> = {
  narrow: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
  normal: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
  wide: { top: "24mm", bottom: "24mm", left: "24mm", right: "24mm" },
};

/** Resolved page box honoring orientation. */
export function pageBox(size: PageSize, orientation: Orientation): { w: number; h: number } {
  const base = PAGE_DIMS[size];
  return orientation === "landscape" ? { w: base.h, h: base.w } : { w: base.w, h: base.h };
}

/** Download file extension + MIME for a generated format (never `print`). */
export const FORMAT_FILE: Record<Exclude<ExportFormat, "print">, { ext: string; contentType: string }> = {
  pdf: { ext: "pdf", contentType: "application/pdf" },
  html: { ext: "html", contentType: "text/html; charset=utf-8" },
  docx: {
    ext: "docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  xlsx: {
    ext: "xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
};
