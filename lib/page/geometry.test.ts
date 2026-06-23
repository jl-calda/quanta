import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SETTINGS, type PageSettings } from "@/lib/schema/page";
import {
  bandToString,
  exportSizeLabel,
  expandTokens,
  isLossyExportSize,
  mmToPx,
  PAGE_DIMS_96,
  pageCountForHeight,
  pageSettingsToExportOptions,
  resolveExportPreviewGeometry,
  resolvePageGeometry,
  type PageGeometry,
} from "./geometry";

/** Build a PageSettings from the defaults with shallow overrides. */
function settings(over: Partial<PageSettings> = {}): PageSettings {
  return { ...DEFAULT_PAGE_SETTINGS, ...over };
}

describe("mmToPx", () => {
  it("converts millimetres to whole px at 96dpi", () => {
    expect(mmToPx(25.4)).toBe(96); // 1 inch
    expect(mmToPx(19)).toBe(72); // default margin
    expect(mmToPx(0)).toBe(0);
  });
});

describe("PAGE_DIMS_96", () => {
  it("matches the export A4/Letter boxes and documents the rest", () => {
    expect(PAGE_DIMS_96.a4).toEqual({ w: 794, h: 1123 });
    expect(PAGE_DIMS_96.letter).toEqual({ w: 816, h: 1056 });
    expect(PAGE_DIMS_96.legal).toEqual({ w: 816, h: 1344 });
    expect(PAGE_DIMS_96.a3).toEqual({ w: 1123, h: 1587 });
    expect(PAGE_DIMS_96.tabloid).toEqual({ w: 1056, h: 1632 });
  });
});

describe("resolvePageGeometry", () => {
  it("derives content box for A4 portrait with default 19mm margins", () => {
    const g = resolvePageGeometry(settings());
    expect(g.pageW).toBe(794);
    expect(g.pageH).toBe(1123);
    expect(g.marginTop).toBe(72);
    expect(g.marginLeft).toBe(72);
    expect(g.contentW).toBe(794 - 72 - 72); // 650
    expect(g.pageContentH).toBe(1123 - 30 - 30 - 72 - 72); // 919
    expect(g.gridSpacing).toBe(16);
    expect(g.gridShow).toBe(true);
  });

  it("swaps width/height in landscape", () => {
    const g = resolvePageGeometry(settings({ orientation: "landscape" }));
    expect(g.pageW).toBe(1123);
    expect(g.pageH).toBe(794);
  });

  it("passes gridlines through", () => {
    const g = resolvePageGeometry(
      settings({ gridlines: { show: false, spacing: 24 } }),
    );
    expect(g.gridShow).toBe(false);
    expect(g.gridSpacing).toBe(24);
  });
});

describe("pageCountForHeight", () => {
  const g = resolvePageGeometry(settings()); // pageContentH = 919

  it("is at least one page (short / empty docs still bound a page)", () => {
    expect(pageCountForHeight(0, g)).toBe(1);
    expect(pageCountForHeight(10, g)).toBe(1);
  });

  it("rolls to the next page when content overflows by any amount", () => {
    expect(pageCountForHeight(g.pageContentH, g)).toBe(1);
    expect(pageCountForHeight(g.pageContentH + 1, g)).toBe(2);
    expect(pageCountForHeight(g.pageContentH * 2, g)).toBe(2);
  });

  it("guards against a non-positive page content height", () => {
    const degenerate: PageGeometry = { ...g, pageContentH: 0 };
    expect(pageCountForHeight(5000, degenerate)).toBe(1);
  });
});

describe("resolveExportPreviewGeometry (parity guard)", () => {
  it("reproduces the inline PreviewPages numbers for A4 normal portrait", () => {
    const r = resolveExportPreviewGeometry("A4", "portrait", "normal");
    expect(r.dims).toEqual({ w: 794, h: 1123 });
    expect(r.pad).toEqual({ x: 58, y: 46 });
    expect(r.headerH).toBe(34);
    expect(r.footerH).toBe(30);
    expect(r.contentW).toBe(678); // 794 - 58*2
    expect(r.contentH).toBe(967); // 1123 - 34 - 30 - 46*2
  });

  it("swaps the box in landscape", () => {
    const r = resolveExportPreviewGeometry("Letter", "landscape", "narrow");
    expect(r.dims).toEqual({ w: 1056, h: 816 });
  });
});

describe("pageSettingsToExportOptions", () => {
  it("maps every page-setup size to a native PDF size", () => {
    expect(pageSettingsToExportOptions(settings({ size: "a4" })).size).toBe("A4");
    expect(pageSettingsToExportOptions(settings({ size: "letter" })).size).toBe("Letter");
    expect(pageSettingsToExportOptions(settings({ size: "legal" })).size).toBe("Letter");
    expect(pageSettingsToExportOptions(settings({ size: "a3" })).size).toBe("A4");
    expect(pageSettingsToExportOptions(settings({ size: "tabloid" })).size).toBe("A4");
  });

  it("carries orientation 1:1", () => {
    expect(pageSettingsToExportOptions(settings({ orientation: "landscape" })).orientation).toBe(
      "landscape",
    );
  });

  it("snaps margins to the nearest preset", () => {
    const m = (v: number) => ({ top: v, right: v, bottom: v, left: v });
    expect(pageSettingsToExportOptions(settings({ margins: m(10) })).margin).toBe("narrow");
    expect(pageSettingsToExportOptions(settings({ margins: m(16) })).margin).toBe("normal");
    expect(pageSettingsToExportOptions(settings({ margins: m(24) })).margin).toBe("wide");
    expect(pageSettingsToExportOptions(settings({ margins: m(19) })).margin).toBe("normal");
  });

  it("flattens header/footer bands (centre wins, then left, then right)", () => {
    const out = pageSettingsToExportOptions(
      settings({
        header: { left: "L", center: "C", right: "R" },
        footer: { left: "", center: "", right: "R only" },
      }),
    );
    expect(out.header).toBe("C");
    expect(out.footer).toBe("R only");
    expect(pageSettingsToExportOptions(settings()).header).toBe("");
  });
});

describe("bandToString", () => {
  it("prefers centre, then left, then right, else empty", () => {
    expect(bandToString({ left: "L", center: "C", right: "R" })).toBe("C");
    expect(bandToString({ left: "L", center: "", right: "R" })).toBe("L");
    expect(bandToString({ left: "", center: "", right: "R" })).toBe("R");
    expect(bandToString({ left: "", center: "", right: "" })).toBe("");
  });
});

describe("isLossyExportSize / exportSizeLabel", () => {
  it("flags the sizes the PDF pipeline can't produce today", () => {
    expect(isLossyExportSize("a4")).toBe(false);
    expect(isLossyExportSize("letter")).toBe(false);
    expect(isLossyExportSize("legal")).toBe(true);
    expect(isLossyExportSize("a3")).toBe(true);
    expect(isLossyExportSize("tabloid")).toBe(true);
  });

  it("names the export size each page-setup size maps to", () => {
    expect(exportSizeLabel("a3")).toBe("A4");
    expect(exportSizeLabel("legal")).toBe("Letter");
  });
});

describe("expandTokens", () => {
  const ctx = { page: 2, pages: 5, title: "Beam check", date: "2026-06-23", time: "14:05" };

  it("expands every field token", () => {
    expect(expandTokens("Page {page} of {pages}", ctx)).toBe("Page 2 of 5");
    expect(expandTokens("{title} — {date} {time}", ctx)).toBe("Beam check — 2026-06-23 14:05");
  });

  it("expands repeated tokens and leaves unknown braces literal", () => {
    expect(expandTokens("{page}/{pages} · {page}", ctx)).toBe("2/5 · 2");
    expect(expandTokens("{unknown}", ctx)).toBe("{unknown}");
  });
});
