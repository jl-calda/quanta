import { describe, expect, it } from "vitest";
import { validateContent, type WorksheetContent } from "./content";
import {
  applyFillIns,
  autoParams,
  bumpTemplateMeta,
  extractTokens,
  paramsForContent,
  stampTemplateMeta,
  templateUpdateStatus,
  withOrigin,
} from "./template";

/** A content tree exercising math.source, text.text, a nested area, and a table. */
function sample(): WorksheetContent {
  return {
    version: 1,
    rows: [
      {
        id: "r1",
        columns: 1,
        cells: [
          {
            regions: [
              { id: "m1", type: "math", indent: 0, source: "L := {{span}}" },
              { id: "t1", type: "text", indent: 0, text: "Grade is {{grade}}." },
              {
                id: "a1",
                type: "area",
                indent: 0,
                title: "Loads",
                collapsed: false,
                regions: [{ id: "m2", type: "math", indent: 0, source: "w := {{load}} + {{span}}" }],
              },
              {
                id: "tab1",
                type: "table",
                indent: 0,
                columns: [{ key: "c0", label: "A" }],
                rows: [["{{span}}"], ["plain"]],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("extractTokens", () => {
  it("finds distinct tokens across math, text, nested area, and table cells", () => {
    expect(extractTokens(sample())).toEqual(["span", "grade", "load"]);
  });

  it("ignores non-token braces and plain text", () => {
    const content: WorksheetContent = {
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [{ regions: [{ id: "m1", type: "math", indent: 0, source: "f(x) := {a:1}" }] }],
        },
      ],
    };
    expect(extractTokens(content)).toEqual([]);
  });
});

describe("paramsForContent", () => {
  it("returns the declared params when template metadata is present", () => {
    const content = stampTemplateMeta(sample(), {
      revision: 1,
      params: [{ key: "span", label: "Span", type: "number", unit: "mm" }],
      changelog: [],
    });
    expect(paramsForContent(content)).toEqual([
      { key: "span", label: "Span", type: "number", unit: "mm" },
    ]);
  });

  it("auto-derives params from tokens when no template metadata exists", () => {
    expect(autoParams(sample())).toEqual([
      { key: "span", label: "span", type: "text" },
      { key: "grade", label: "grade", type: "text" },
      { key: "load", label: "load", type: "text" },
    ]);
  });
});

describe("applyFillIns", () => {
  it("substitutes declared tokens, appends units, and strips template metadata", () => {
    const content = stampTemplateMeta(sample(), {
      revision: 1,
      params: [
        { key: "span", label: "Span", type: "number", unit: "mm" },
        { key: "grade", label: "Grade", type: "text" },
        { key: "load", label: "Load", type: "number", unit: "kN/m" },
      ],
      changelog: [],
    });
    const out = applyFillIns(content, { span: "3000", grade: "S355", load: "5" });

    const regions = out.rows[0].cells[0].regions;
    expect(regions[0]).toMatchObject({ source: "L := 3000 mm" });
    expect(regions[1]).toMatchObject({ text: "Grade is S355." });
    // Recurses into the area + repeats a token (span used twice).
    const area = regions[2];
    expect(area.type === "area" && area.regions[0]).toMatchObject({ source: "w := 5 kN/m + 3000 mm" });
    // Table cells substituted; the plain cell is untouched.
    const table = regions[3];
    expect(table.type === "table" && table.rows).toEqual([["3000 mm"], ["plain"]]);
    // The result is a worksheet, not a template.
    expect(out.template).toBeUndefined();
  });

  it("falls back to the param default, and leaves the token literal when blank with no default", () => {
    const content = stampTemplateMeta(sample(), {
      revision: 1,
      params: [
        { key: "span", label: "Span", type: "number", default: "2400", unit: "mm" },
        { key: "grade", label: "Grade", type: "text" }, // no value, no default → literal
        { key: "load", label: "Load", type: "text", default: "0" },
      ],
      changelog: [],
    });
    const out = applyFillIns(content, {}); // nothing supplied

    const regions = out.rows[0].cells[0].regions;
    expect(regions[0]).toMatchObject({ source: "L := 2400 mm" }); // default used
    expect(regions[1]).toMatchObject({ text: "Grade is {{grade}}." }); // left literal, never ""
  });

  it("does not mutate the input content", () => {
    const content = sample();
    const before = structuredClone(content);
    applyFillIns(content, { span: "10" });
    expect(content).toEqual(before);
  });
});

describe("withOrigin", () => {
  it("stamps an origin that survives validateContent (the save path)", () => {
    const origin = {
      templateId: "00000000-0000-0000-0000-000000000001",
      revision: 2,
      appliedAt: "2026-03-01T00:00:00.000Z",
    };
    const out = withOrigin(applyFillIns(sample(), { span: "1" }), origin);
    expect(validateContent(out)?.origin).toEqual(origin);
  });
});

describe("bumpTemplateMeta", () => {
  it("produces revision 1 with a seed changelog entry when there is no previous meta", () => {
    const meta = bumpTemplateMeta(
      undefined,
      { label: "Initial version", at: "2026-01-01T00:00:00.000Z", by: "u1" },
      [{ key: "span", label: "Span", type: "number" }],
    );
    expect(meta.revision).toBe(1);
    expect(meta.changelog).toEqual([
      { revision: 1, at: "2026-01-01T00:00:00.000Z", label: "Initial version", by: "u1" },
    ]);
    expect(meta.params).toEqual([{ key: "span", label: "Span", type: "number" }]);
  });

  it("increments the revision and appends to the changelog in order", () => {
    const v1 = bumpTemplateMeta(undefined, { at: "2026-01-01T00:00:00.000Z" }, []);
    const v2 = bumpTemplateMeta(v1, { label: "Tweak", at: "2026-02-01T00:00:00.000Z" }, []);
    expect(v2.revision).toBe(2);
    expect(v2.changelog.map((c) => c.revision)).toEqual([1, 2]);
    expect(v2.changelog[1]).toMatchObject({ revision: 2, label: "Tweak" });
  });
});

describe("templateUpdateStatus", () => {
  const meta = {
    revision: 3,
    params: [],
    changelog: [
      { revision: 1, at: "2026-01-01T00:00:00.000Z" },
      { revision: 2, label: "Tighter limit", at: "2026-02-01T00:00:00.000Z" },
      { revision: 3, label: "Fix unit", at: "2026-03-01T00:00:00.000Z" },
    ],
  };

  it("reports an available update and the changelog slice since the origin revision", () => {
    const status = templateUpdateStatus(
      { templateId: "t", revision: 1, appliedAt: "2026-01-01T00:00:00.000Z" },
      meta,
    );
    expect(status).toMatchObject({ updateAvailable: true, fromRevision: 1, toRevision: 3 });
    expect(status.changes.map((c) => c.revision)).toEqual([2, 3]);
  });

  it("reports no update when the worksheet is on the current revision", () => {
    const status = templateUpdateStatus(
      { templateId: "t", revision: 3, appliedAt: "2026-03-01T00:00:00.000Z" },
      meta,
    );
    expect(status.updateAvailable).toBe(false);
    expect(status.changes).toEqual([]);
  });
});
