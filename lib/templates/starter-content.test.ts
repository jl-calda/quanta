import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateSheet } from "@/lib/calc";
import { validateContent } from "@/lib/worksheet/content";
import { flattenToRegionInputs, hasRenderableRegions, mapResults } from "@/lib/worksheet/flatten";
import { STARTER_CONTENT } from "./starter-content";

const MIGRATION = fileURLToPath(
  new URL("../../supabase/migrations/0010_seed_template_content.sql", import.meta.url),
);

describe("starter template content", () => {
  for (const [title, content] of Object.entries(STARTER_CONTENT)) {
    describe(title, () => {
      it("is schema-valid and has renderable regions", () => {
        expect(validateContent(content)).not.toBeNull();
        expect(hasRenderableRegions(content)).toBe(true);
      });

      it("evaluates engine-clean with a green utilization check and units", () => {
        const sheet = evaluateSheet(flattenToRegionInputs(content));
        expect(sheet.errorCount).toBe(0);

        const results = mapResults(sheet);
        // The final region (id ends in "-ur") is the styled pass/"OK" check.
        const urId = [...results.keys()].find((id) => id.endsWith("-ur"))!;
        const ur = results.get(urId)!;
        expect(ur.status).toBe("current");
        expect(ur.style?.label).toBe("OK");
        // A dimensionless ratio ≤ 1 (trailing zeros may be stripped, e.g. "0.6").
        expect(ur.formatted).toMatch(/^\d(\.\d{1,2})?$/);
        expect(Number(ur.formatted)).toBeLessThanOrEqual(1);

        // At least one region typesets a real unit-bearing result.
        const unitful = [...results.values()].some((r) => /\b(kN|MPa|mm|m)\b/.test(r.formatted ?? ""));
        expect(unitful).toBe(true);
      });
    });
  }

  it("matches the seed migration JSON exactly (drift guard)", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    for (const content of Object.values(STARTER_CONTENT)) {
      expect(sql).toContain(JSON.stringify(content));
    }
  });
});

describe("hasRenderableRegions", () => {
  it("is false for an empty tree", () => {
    expect(hasRenderableRegions({ version: 1, rows: [] })).toBe(false);
    expect(
      hasRenderableRegions({ version: 1, rows: [{ id: "r", columns: 1, cells: [{ regions: [] }] }] }),
    ).toBe(false);
  });
});
