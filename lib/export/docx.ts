/**
 * Word (.docx) generation (Functional Brief §4.10) — NODE ONLY.
 *
 * A structured/linear export: headings, a named-inputs table, and one paragraph
 * per math region in reading order ("name := formula = result unit"). Math is
 * written as linear text (the engine's plain-text source + the evaluated,
 * unit-carrying result) rather than 2D notation — values match the worksheet
 * exactly; notation is linearized. Data tables become real Word tables.
 */
import {
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { RegionResult } from "@/lib/calc";
import type { Region, RenderOnlyRegion } from "@/lib/worksheet/content";
import type { ExportDocumentProps } from "./document";
import { selectInputs } from "./inputs";

function mathParagraph(region: Extract<Region, { type: "math" }>, result?: RegionResult): Paragraph {
  if (result?.error) {
    return new Paragraph({
      children: [
        new TextRun({ text: region.source || "(empty)", font: "Consolas" }),
        new TextRun({ text: `  — ${result.error.message}`, italics: true, color: "C2392B" }),
      ],
    });
  }
  const children: TextRun[] = [new TextRun({ text: region.source, font: "Consolas" })];
  if (result?.formatted) {
    children.push(new TextRun({ text: "  =  " }));
    children.push(new TextRun({ text: result.formatted, bold: true, color: (result.style?.color ?? "1F5FBF").replace("#", "") }));
    if (result.style?.label) {
      children.push(new TextRun({ text: `  ${result.style.label}`, bold: true, color: (result.style.color ?? "1E8E5A").replace("#", "") }));
    }
  }
  return new Paragraph({ children, spacing: { after: 60 } });
}

function dataTable(region: RenderOnlyRegion): Table | null {
  const data = region as Record<string, unknown>;
  const cells = Array.isArray(data.cells) ? (data.cells as unknown[][]) : null;
  const header = Array.isArray(data.header) ? (data.header as string[]) : null;
  if (!cells || cells.length === 0) return null;

  const rows: TableRow[] = [];
  if (header) {
    rows.push(
      new TableRow({
        tableHeader: true,
        children: header.map(
          (h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
            }),
        ),
      }),
    );
  }
  for (const row of cells) {
    rows.push(
      new TableRow({
        children: row.map(
          (c) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(c), font: "Consolas" })] })],
            }),
        ),
      }),
    );
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function regionChildren(region: Region, results: Map<string, RegionResult>): (Paragraph | Table)[] {
  if (region.disabled) return [];
  switch (region.type) {
    case "math":
      return [mathParagraph(region, results.get(region.id))];
    case "text":
      if (region.heading) {
        return [
          new Paragraph({
            text: region.text,
            heading:
              region.heading === 1 ? HeadingLevel.HEADING_1 : region.heading === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          }),
        ];
      }
      return [new Paragraph({ children: [new TextRun(region.text)] })];
    case "table": {
      const t = dataTable(region);
      return t ? [t, new Paragraph({ text: "" })] : [];
    }
    case "area":
      return [
        new Paragraph({ text: region.title, heading: HeadingLevel.HEADING_3 }),
        ...region.regions.flatMap((child) => regionChildren(child, results)),
      ];
    default:
      return [];
  }
}

export async function buildDocx(props: ExportDocumentProps): Promise<Buffer> {
  const { content, results, options, title } = props;
  const body: (Paragraph | Table)[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
  ];

  if (props.meta && props.meta.length > 0) {
    body.push(
      new Paragraph({
        children: props.meta.map((m, i) => new TextRun({ text: `${i ? "   " : ""}${m.label}: ${m.value}`, color: "6B7480" })),
        spacing: { after: 120 },
      }),
    );
  }

  if (options.inputsSummary) {
    const inputs = selectInputs(content, results);
    if (inputs.length > 0) {
      body.push(new Paragraph({ text: "Inputs summary", heading: HeadingLevel.HEADING_2 }));
      body.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: ["Name", "Value", "Note"].map(
                (h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] }),
              ),
            }),
            ...inputs.map(
              (r) =>
                new TableRow({
                  children: [r.name, r.value, r.note ?? ""].map(
                    (v, i) =>
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: v, font: i === 1 ? "Consolas" : undefined })] })],
                      }),
                  ),
                }),
            ),
          ],
        }),
      );
      body.push(new Paragraph({ text: "" }));
    }
  }

  for (const row of content.rows) {
    for (const cell of row.cells) {
      for (const region of cell.regions) {
        body.push(...regionChildren(region, results));
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation:
                options.orientation === "landscape" ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
          },
        },
        children: body,
      },
    ],
  });

  return Packer.toBuffer(doc) as Promise<Buffer>;
}
