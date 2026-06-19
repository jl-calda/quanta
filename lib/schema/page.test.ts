import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT_SETTINGS,
  DEFAULT_PAGE_SETTINGS,
  layoutSettingsSchema,
  pageSettingsSchema,
  parseLayoutSettings,
  parsePageSettings,
} from "./page";

describe("pageSettingsSchema", () => {
  it("fills an empty object with sensible defaults", () => {
    expect(DEFAULT_PAGE_SETTINGS.size).toBe("a4");
    expect(DEFAULT_PAGE_SETTINGS.orientation).toBe("portrait");
    expect(DEFAULT_PAGE_SETTINGS.margins).toEqual({ top: 19, right: 19, bottom: 19, left: 19 });
    expect(DEFAULT_PAGE_SETTINGS.gridlines.show).toBe(true);
  });

  it("rejects an out-of-range margin and an unknown size", () => {
    expect(pageSettingsSchema.safeParse({ margins: { top: 999, right: 0, bottom: 0, left: 0 } }).success).toBe(false);
    expect(pageSettingsSchema.safeParse({ size: "huge" }).success).toBe(false);
  });

  it("parses tolerantly, falling back to defaults on garbage", () => {
    expect(parsePageSettings(null)).toEqual(DEFAULT_PAGE_SETTINGS);
    expect(parsePageSettings("nope")).toEqual(DEFAULT_PAGE_SETTINGS);
    expect(parsePageSettings({ orientation: "landscape" }).orientation).toBe("landscape");
  });
});

describe("layoutSettingsSchema", () => {
  it("seeds built-in text styles when none are stored", () => {
    expect(Object.keys(parseLayoutSettings({})).length).toBeGreaterThan(0);
    expect(parseLayoutSettings({}).textStyles.body.label).toBe("Body");
    expect(DEFAULT_LAYOUT_SETTINGS.textStyles.title.size).toBe(28);
  });

  it("keeps custom styles and validates the columns enum", () => {
    const custom = parseLayoutSettings({ columns: 2, textStyles: { note: { label: "Note" } } });
    expect(custom.columns).toBe(2);
    expect(custom.textStyles.note.label).toBe("Note");
    expect(layoutSettingsSchema.safeParse({ columns: 9 }).success).toBe(false);
  });
});
