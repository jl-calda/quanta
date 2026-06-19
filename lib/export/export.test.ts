import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseContent, type WorksheetContent } from "@/lib/worksheet/content";
import { ExportDocument } from "./document";
import { evaluateForExport } from "./evaluate";
import { selectInputs } from "./inputs";
import { buildXlsx } from "./xlsx";
import { buildDocx } from "./docx";
import { exportOptionsSchema, DEFAULT_EXPORT_OPTIONS, type ExportOptions } from "./options";
import { isExportAllowed } from "./run";

/* A small worksheet: two leaf inputs, one derived result, a heading, a table. */
function fixture(): WorksheetContent {
  return parseContent({
    version: 1,
    rows: [
      {
        id: "r1",
        columns: 1,
        cells: [
          {
            regions: [
              { id: "h1", type: "text", text: "Design inputs", heading: 2, indent: 0 },
              { id: "m1", type: "math", source: "F_t := 14.5 kN", indent: 0, tag: "applied force" },
              { id: "m2", type: "math", source: "phi := 0.67", indent: 0 },
              { id: "m3", type: "math", source: "N_Rd := phi * F_t", indent: 0 },
              {
                id: "t1",
                type: "table",
                indent: 0,
                header: ["Mark", "Force"],
                cells: [
                  ["A1", "14.5"],
                  ["A2", "18.5"],
                ],
              },
            ],
          },
        ],
      },
    ],
  });
}

const OPTS: ExportOptions = { ...DEFAULT_EXPORT_OPTIONS, format: "html" };

describe("evaluateForExport", () => {
  it("computes every math region deterministically", () => {
    const results = evaluateForExport(fixture());
    expect(results.get("m1")?.formatted).toContain("kN");
    // N_Rd = 0.67 * 14.5 kN = 9.715 kN
    const nrd = results.get("m3")?.formatted ?? "";
    expect(nrd).toMatch(/9\.7/);
    expect(results.get("m3")?.error).toBeUndefined();
  });
});

describe("selectInputs", () => {
  it("lists leaf inputs but excludes derived definitions", () => {
    const content = fixture();
    const inputs = selectInputs(content, evaluateForExport(content));
    const names = inputs.map((i) => i.name);
    expect(names).toContain("F_t");
    expect(names).toContain("phi");
    expect(names).not.toContain("N_Rd"); // depends on phi & F_t
    expect(inputs.find((i) => i.name === "F_t")?.note).toBe("applied force");
  });
});

describe("buildXlsx", () => {
  it("emits Inputs, Results, and a table sheet with matching values", () => {
    const content = fixture();
    const buf = buildXlsx({ title: "T", content, results: evaluateForExport(content), options: OPTS });
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toContain("Inputs");
    expect(wb.SheetNames).toContain("Results");
    expect(wb.SheetNames.some((n) => n.startsWith("Table"))).toBe(true);

    const results = XLSX.utils.sheet_to_json<string[]>(wb.Sheets["Results"], { header: 1 });
    expect(results[0]).toEqual(["Name", "Formula", "Result", "Status"]);
    const nrdRow = results.find((r) => r[0] === "N_Rd");
    expect(nrdRow?.[1]).toBe("N_Rd := phi * F_t");
  });

  it("omits the Inputs sheet when the option is off", () => {
    const content = fixture();
    const buf = buildXlsx({ title: "T", content, results: evaluateForExport(content), options: { ...OPTS, inputsSummary: false } });
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).not.toContain("Inputs");
  });
});

describe("buildDocx", () => {
  it("produces a non-empty .docx buffer", async () => {
    const content = fixture();
    const buf = await buildDocx({ title: "Roof anchor", content, results: evaluateForExport(content), options: OPTS });
    expect(buf.length).toBeGreaterThan(0);
    // docx is a zip — starts with the PK signature.
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK");
  });
});

describe("ExportDocument", () => {
  const render = (options: ExportOptions) => {
    const content = fixture();
    return renderToStaticMarkup(
      createElement(ExportDocument, { title: "Roof anchor", content, results: evaluateForExport(content), options }),
    );
  };

  it("renders the title, KaTeX math, and the result value", () => {
    const html = render(OPTS);
    expect(html).toContain("Roof anchor");
    expect(html).toContain("katex"); // KaTeX emitted markup
    expect(html).toMatch(/9\.7/); // N_Rd result
  });

  it("includes the inputs summary only when enabled", () => {
    expect(render(OPTS)).toContain("Inputs summary");
    expect(render({ ...OPTS, inputsSummary: false })).not.toContain("Inputs summary");
  });

  it("renders a solve block with its solved value computed in Node", () => {
    const content = parseContent({
      version: 1,
      rows: [
        {
          id: "r1",
          columns: 1,
          cells: [
            {
              regions: [
                { id: "s1", type: "solve", indent: 0, algorithm: "find", guesses: [{ var: "x", value: "2" }], constraints: ["x^2 = 9"] },
              ],
            },
          ],
        },
      ],
    });
    const html = renderToStaticMarkup(
      createElement(ExportDocument, { title: "Solve", content, results: evaluateForExport(content), options: OPTS }),
    );
    expect(html).toContain("Solve block");
    expect(html).toContain("converged");
    expect(html).toMatch(/\b3\b/); // x = 3
  });

  it("adds region outlines when borders are on", () => {
    const off = render({ ...OPTS, borders: false });
    const on = render({ ...OPTS, borders: true });
    const count = (s: string) => (s.match(/1px solid #E2E5EA/g) ?? []).length;
    expect(count(on)).toBeGreaterThan(count(off));
  });
});

describe("exportOptionsSchema", () => {
  it("accepts the defaults", () => {
    expect(exportOptionsSchema.safeParse(DEFAULT_EXPORT_OPTIONS).success).toBe(true);
  });
  it("rejects an unknown format", () => {
    expect(exportOptionsSchema.safeParse({ ...DEFAULT_EXPORT_OPTIONS, format: "rtf" }).success).toBe(false);
  });
});

describe("isExportAllowed", () => {
  it("lets owners and editors export regardless of the workspace setting", () => {
    expect(isExportAllowed("owner", false)).toBe(true);
    expect(isExportAllowed("editor", false)).toBe(true);
  });
  it("gates viewers and commenters on the workspace setting", () => {
    expect(isExportAllowed("viewer", false)).toBe(false);
    expect(isExportAllowed("viewer", true)).toBe(true);
    expect(isExportAllowed("commenter", false)).toBe(false);
    expect(isExportAllowed("commenter", true)).toBe(true);
  });
  it("denies an absent or unknown role", () => {
    expect(isExportAllowed(null, true)).toBe(false);
    expect(isExportAllowed("stranger", true)).toBe(false);
  });
});
