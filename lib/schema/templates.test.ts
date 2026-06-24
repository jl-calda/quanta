import { describe, expect, it } from "vitest";
import {
  templateFiltersSchema,
  saveAsTemplateSchema,
  scopeToVisibility,
  parseTagsInput,
  MAX_TEMPLATE_TAGS,
} from "./templates";

const UUID = "00000000-0000-0000-0000-000000000001";

describe("templateFiltersSchema", () => {
  it("defaults the tab to 'all' and drops blank filters", () => {
    const parsed = templateFiltersSchema.parse({});
    expect(parsed.tab).toBe("all");
    expect(parsed.discipline).toBeUndefined();
  });

  it("keeps a valid tab and trims facet values", () => {
    const parsed = templateFiltersSchema.parse({
      tab: "mine",
      discipline: " Structural ",
      q: "  beam ",
    });
    expect(parsed.tab).toBe("mine");
    expect(parsed.discipline).toBe("Structural");
    expect(parsed.q).toBe("beam");
  });

  it("parses and trims the category and tag filters", () => {
    const parsed = templateFiltersSchema.parse({
      category: " Beams ",
      tag: " steel ",
    });
    expect(parsed.category).toBe("Beams");
    expect(parsed.tag).toBe("steel");
  });

  it("falls back to 'all' for an unknown tab", () => {
    expect(templateFiltersSchema.parse({ tab: "bogus" }).tab).toBe("all");
  });
});

describe("parseTagsInput", () => {
  it("splits on commas, trims, and drops blanks", () => {
    expect(parseTagsInput(" beam, steel ,, ULS ")).toEqual([
      "beam",
      "steel",
      "ULS",
    ]);
  });

  it("de-duplicates case-insensitively, keeping the first form", () => {
    expect(parseTagsInput("Steel, steel, STEEL")).toEqual(["Steel"]);
  });

  it("caps the result at MAX_TEMPLATE_TAGS", () => {
    const raw = Array.from({ length: MAX_TEMPLATE_TAGS + 5 }, (_, i) => `t${i}`).join(",");
    expect(parseTagsInput(raw)).toHaveLength(MAX_TEMPLATE_TAGS);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseTagsInput("   ")).toEqual([]);
  });
});

describe("scopeToVisibility", () => {
  it("maps the author scope to the stored 'private' value", () => {
    expect(scopeToVisibility("author")).toBe("private");
    expect(scopeToVisibility("workspace")).toBe("workspace");
    expect(scopeToVisibility("public")).toBe("public");
  });
});

describe("saveAsTemplateSchema", () => {
  it("requires a worksheet, title and valid scope", () => {
    const ok = saveAsTemplateSchema.safeParse({
      workspaceId: UUID,
      worksheetId: UUID,
      title: "Bolt group",
      scope: "workspace",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const bad = saveAsTemplateSchema.safeParse({
      workspaceId: UUID,
      worksheetId: UUID,
      title: "   ",
      scope: "author",
    });
    expect(bad.success).toBe(false);
  });

  it("accepts a category and a tags array", () => {
    const parsed = saveAsTemplateSchema.safeParse({
      workspaceId: UUID,
      worksheetId: UUID,
      title: "Bolt group",
      category: "Connections",
      tags: ["bolt", "steel"],
      scope: "workspace",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects more than MAX_TEMPLATE_TAGS tags", () => {
    const parsed = saveAsTemplateSchema.safeParse({
      workspaceId: UUID,
      worksheetId: UUID,
      title: "Too many",
      tags: Array.from({ length: MAX_TEMPLATE_TAGS + 1 }, (_, i) => `t${i}`),
      scope: "workspace",
    });
    expect(parsed.success).toBe(false);
  });
});
