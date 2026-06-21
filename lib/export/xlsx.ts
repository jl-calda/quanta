/**
 * Excel (.xlsx) generation (Functional Brief §4.10) — NODE ONLY.
 *
 * A structured export built with SheetJS: an "Inputs" sheet (named leaf inputs),
 * a "Results" sheet (every evaluated definition: name, formula, value, status),
 * and one sheet per data-table region. Values come straight from the pure engine,
 * so the spreadsheet agrees with the worksheet to the digit.
 */
import * as XLSX from "xlsx";
import { evaluateTable } from "@/lib/calc";
import { walkRegions } from "@/lib/worksheet/flatten";
import type { TableRegion } from "@/lib/worksheet/content";
import type { ExportDocumentProps } from "./document";
import { selectInputs } from "./inputs";

type Row = (string | number)[];

function inputsSheet(props: ExportDocumentProps): Row[] {
  const rows: Row[] = [["Name", "Value", "Note"]];
  for (const r of selectInputs(props.content, props.results)) {
    rows.push([r.name, r.value, r.note ?? ""]);
  }
  return rows;
}

function resultsSheet(props: ExportDocumentProps): Row[] {
  const rows: Row[] = [["Name", "Formula", "Result", "Status"]];
  for (const region of walkRegions(props.content)) {
    if (region.type !== "math" || region.disabled) continue;
    const result = props.results.get(region.id);
    rows.push([
      result?.name ?? "",
      region.source,
      result?.error ? "" : (result?.formatted ?? ""),
      result?.error ? `error: ${result.error.message}` : (result?.status ?? ""),
    ]);
  }
  return rows;
}

function tableRows(region: TableRegion): Row[] | null {
  const cols = region.columns;
  if (cols.length === 0) return null;
  // Same pure evaluator as the screen/PDF; numeric cells stay numbers in Excel.
  const result = evaluateTable(region, {});
  const rows: Row[] = [cols.map((col) => (col.unit ? `${col.label} [${col.unit}]` : col.label))];
  region.rows.forEach((_, ri) => {
    rows.push(
      cols.map((col, ci) => {
        const cell = result.cells[ri]?.[ci];
        if (!cell || cell.error) return cell?.error ? "#error" : "";
        const num = Number(String(cell.formatted).replace(/,/g, ""));
        return cell.formatted !== "" && Number.isFinite(num) ? num : cell.formatted;
      }),
    );
  });
  return rows;
}

/** Excel sheet names: ≤31 chars, no `[]:*?/\`. */
function safeSheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet";
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` ${n}`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function buildXlsx(props: ExportDocumentProps): Buffer {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();

  if (props.options.inputsSummary) {
    const inputs = inputsSheet(props);
    if (inputs.length > 1) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inputs), safeSheetName("Inputs", used));
    }
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resultsSheet(props)), safeSheetName("Results", used));

  let tableIndex = 1;
  for (const region of walkRegions(props.content)) {
    if (region.type !== "table" || region.disabled) continue;
    const rows = tableRows(region);
    if (!rows) continue;
    const title = region.name || region.eyebrow || `Table ${tableIndex}`;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), safeSheetName(title, used));
    tableIndex += 1;
  }

  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return out;
}
