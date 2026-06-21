/**
 * Excel (.xlsx/.xls) read adapter — CLIENT, LAZY.
 *
 * Sibling to the Node-only `lib/export/xlsx.ts` writer: both lean on the SheetJS
 * `xlsx` dependency, but this one is imported **dynamically** so the codec never
 * enters the main bundle (or `/lib/calc`). Its only job is to turn an uploaded
 * workbook into the same plain 2D string grid the pure `buildTableImport` consumes
 * — the unit inference and everything downstream stay engine-pure.
 */

/** Decode the first sheet of a workbook into a row-major grid of cell strings. */
export async function xlsxToGrid(data: ArrayBuffer): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(data, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const ws = wb.Sheets[first];
  // `header: 1` → array-of-arrays; `raw: false` → formatted strings; `defval: ""`
  // keeps short rows rectangular; `blankrows: false` drops empty lines.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return rows.map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
}
