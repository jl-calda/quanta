import { describe, expect, it } from "vitest";
import {
  templateFiltersSchema,
  saveAsTemplateSchema,
  scopeToVisibility,
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

  it("falls back to 'all' for an unknown tab", () => {
    expect(templateFiltersSchema.parse({ tab: "bogus" }).tab).toBe("all");
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
});
