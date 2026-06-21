/**
 * Page & layout settings (Func §7.11 / §7.12 / §7.19) — the shape of the
 * `worksheets.page_settings` and `worksheets.layout_settings` jsonb columns.
 *
 * A Zod schema (tolerant on load, non-lossy on save) + inferred types + typed
 * defaults, mirroring `lib/schema/settings.ts`. The page-setup, headers/footers,
 * and text-styles dialogs validate their payload here and persist through the
 * `updatePageSettings` / `updateLayoutSettings` Server Actions (RLS-gated).
 */
import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Page setup + headers/footers → worksheets.page_settings
 * ------------------------------------------------------------------ */

export const PAGE_SIZES = ["a4", "letter", "legal", "a3", "tabloid"] as const;

const marginsSchema = z.object({
  top: z.number().min(0).max(100),
  right: z.number().min(0).max(100),
  bottom: z.number().min(0).max(100),
  left: z.number().min(0).max(100),
});

/** A header/footer band's three zones. Field tokens like `{page}` expand on print. */
const bandSchema = z.object({
  left: z.string().max(200).default(""),
  center: z.string().max(200).default(""),
  right: z.string().max(200).default(""),
});

export const pageSettingsSchema = z.object({
  size: z.enum(PAGE_SIZES).default("a4"),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  margins: marginsSchema.default({ top: 19, right: 19, bottom: 19, left: 19 }),
  gridlines: z
    .object({ show: z.boolean().default(true), spacing: z.number().min(4).max(64).default(16) })
    .default({ show: true, spacing: 16 }),
  frames: z
    .object({
      body: z.boolean().default(false),
      header: z.boolean().default(false),
      footer: z.boolean().default(false),
    })
    .default({ body: false, header: false, footer: false }),
  header: bandSchema.default({ left: "", center: "", right: "" }),
  footer: bandSchema.default({ left: "", center: "", right: "" }),
  differentFirstPage: z.boolean().default(false),
});

export type Margins = z.infer<typeof marginsSchema>;
export type HeaderFooterBand = z.infer<typeof bandSchema>;
export type PageSettings = z.infer<typeof pageSettingsSchema>;

export const DEFAULT_PAGE_SETTINGS: PageSettings = pageSettingsSchema.parse({});

/* ------------------------------------------------------------------ *
 * Text styles + columns/indent → worksheets.layout_settings
 * ------------------------------------------------------------------ */

export const TEXT_STYLE_FONTS = ["sans", "math", "mono"] as const;

export const textStyleSchema = z.object({
  label: z.string().min(1).max(60),
  font: z.enum(TEXT_STYLE_FONTS).default("sans"),
  size: z.number().int().min(9).max(48).default(14),
  weight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]).default(400),
  italic: z.boolean().default(false),
  color: z.string().max(60).default("var(--text-primary)"),
  /** Space above the block, in px. */
  spacing: z.number().int().min(0).max(48).default(8),
});

export type TextStyle = z.infer<typeof textStyleSchema>;

export const layoutSettingsSchema = z.object({
  columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  indentStep: z.number().int().min(8).max(64).default(24),
  gutter: z.number().int().min(8).max(96).default(24),
  /** Named text styles, keyed by id (`title`, `heading1`, `body`, …). */
  textStyles: z.record(textStyleSchema).default({}),
  /** Worksheet-level display unit-system selection (display-only re-convert). */
  unitSystem: z.enum(["si", "uscs", "cgs", "custom"]).default("si"),
});

export type LayoutSettings = z.infer<typeof layoutSettingsSchema>;

/** Built-in text styles seeded when a worksheet has none yet. */
export const DEFAULT_TEXT_STYLES: Record<string, TextStyle> = {
  title: { label: "Title", font: "sans", size: 28, weight: 700, italic: false, color: "var(--text-primary)", spacing: 16 },
  heading1: { label: "Heading 1", font: "sans", size: 20, weight: 600, italic: false, color: "var(--text-primary)", spacing: 12 },
  heading2: { label: "Heading 2", font: "sans", size: 16, weight: 600, italic: false, color: "var(--text-primary)", spacing: 10 },
  body: { label: "Body", font: "sans", size: 14, weight: 400, italic: false, color: "var(--text-primary)", spacing: 8 },
  caption: { label: "Caption", font: "sans", size: 12, weight: 400, italic: false, color: "var(--text-muted)", spacing: 6 },
};

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  ...layoutSettingsSchema.parse({}),
  textStyles: DEFAULT_TEXT_STYLES,
};

/* ------------------------------------------------------------------ *
 * Tolerant parsers (the columns default to '{}' on a new worksheet)
 * ------------------------------------------------------------------ */

export function parsePageSettings(json: unknown): PageSettings {
  const parsed = pageSettingsSchema.safeParse(json ?? {});
  return parsed.success ? parsed.data : DEFAULT_PAGE_SETTINGS;
}

export function parseLayoutSettings(json: unknown): LayoutSettings {
  const parsed = layoutSettingsSchema.safeParse(json ?? {});
  if (!parsed.success) return DEFAULT_LAYOUT_SETTINGS;
  // Seed the built-in styles when the row has none yet.
  if (Object.keys(parsed.data.textStyles).length === 0) {
    return { ...parsed.data, textStyles: DEFAULT_TEXT_STYLES };
  }
  return parsed.data;
}

/* ------------------------------------------------------------------ *
 * Server Action input schemas
 * ------------------------------------------------------------------ */

export const updatePageSettingsSchema = z.object({
  id: z.string().uuid(),
  pageSettings: pageSettingsSchema,
});

export const updateLayoutSettingsSchema = z.object({
  id: z.string().uuid(),
  layoutSettings: layoutSettingsSchema,
});
