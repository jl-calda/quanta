import { describe, expect, it } from "vitest";
import {
  templateFiltersSchema,
  saveAsTemplateSchema,
  scopeToVisibility,
  createFromTemplateSchema,
  updateTemplateVersionSchema,
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

  it("accepts optional fill-in params", () => {
    const ok = saveAsTemplateSchema.safeParse({
      workspaceId: UUID,
      worksheetId: UUID,
      title: "Beam check",
      scope: "workspace",
      params: [{ key: "span", label: "Span", type: "number", unit: "mm" }],
    });
    expect(ok.success).toBe(true);
    expect(ok.success && ok.data.params?.[0].key).toBe("span");
  });
});

describe("createFromTemplateSchema", () => {
  it("accepts a fill-in value map", () => {
    const ok = createFromTemplateSchema.safeParse({
      workspaceId: UUID,
      templateId: UUID,
      fillIns: { span: "3000", grade: "S355" },
    });
    expect(ok.success).toBe(true);
  });

  it("rejects a non-uuid templateId", () => {
    const bad = createFromTemplateSchema.safeParse({
      workspaceId: UUID,
      templateId: "not-a-uuid",
    });
    expect(bad.success).toBe(false);
  });
});

describe("updateTemplateVersionSchema", () => {
  it("requires both the template and the source worksheet", () => {
    expect(updateTemplateVersionSchema.safeParse({ templateId: UUID }).success).toBe(false);
    expect(
      updateTemplateVersionSchema.safeParse({ templateId: UUID, worksheetId: UUID }).success,
    ).toBe(true);
  });

  it("caps the changelog note at 120 characters", () => {
    const bad = updateTemplateVersionSchema.safeParse({
      templateId: UUID,
      worksheetId: UUID,
      note: "x".repeat(121),
    });
    expect(bad.success).toBe(false);
  });
});
