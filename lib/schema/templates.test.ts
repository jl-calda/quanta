import { describe, expect, it } from "vitest";
import {
  templateFiltersSchema,
  templateTabSchema,
  templateCurationSchema,
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

  it("accepts the 'public' gallery tab", () => {
    expect(templateTabSchema.parse("public")).toBe("public");
    expect(templateFiltersSchema.parse({ tab: "public" }).tab).toBe("public");
  });

  it("coerces the archived param to a boolean and defaults to undefined", () => {
    expect(templateFiltersSchema.parse({ archived: "1" }).archived).toBe(true);
    expect(templateFiltersSchema.parse({ archived: "0" }).archived).toBe(false);
    expect(templateFiltersSchema.parse({}).archived).toBeUndefined();
    // A bogus value is dropped rather than throwing (curator view stays off).
    expect(templateFiltersSchema.parse({ archived: "yes" }).archived).toBeUndefined();
  });
});

describe("templateCurationSchema", () => {
  it("accepts a uuid with optional feature/archive flags", () => {
    expect(
      templateCurationSchema.safeParse({ templateId: UUID, isFeatured: true })
        .success,
    ).toBe(true);
    expect(
      templateCurationSchema.safeParse({ templateId: UUID, archived: false })
        .success,
    ).toBe(true);
    // Both flags omitted is still valid (the action treats each as a no-op).
    expect(
      templateCurationSchema.safeParse({ templateId: UUID }).success,
    ).toBe(true);
  });

  it("rejects a non-uuid template id", () => {
    expect(
      templateCurationSchema.safeParse({ templateId: "nope", isFeatured: true })
        .success,
    ).toBe(false);
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
