/**
 * Table import / export — pure, deterministic text ⇄ grid transforms (Phase 2).
 *
 * Engineers keep data in Excel / Sheets / CSV. This module turns delimited text
 * (a paste or a decoded file) into a table-region shape with a **unit inferred per
 * column**, and serializes a table back to CSV/TSV for the clipboard. It is pure
 * (client = worker = Node), reuses the engine's shared `math` instance only to
 * *validate* candidate units, and is decoupled from the content tree (it returns a
 * structural `{ columns, rows }`, mirroring how `table.ts` consumes `TableColumnSpec`).
 *
 * The heavy `.xlsx` binary codec is NOT here — it is a lazily-loaded client adapter
 * (`lib/import/xlsx.ts`) that only produces the same plain 2D string grid this
 * module consumes, so nothing browser- or SheetJS-specific leaks into `/lib/calc`.
 */
import { math } from "./math";
import { colToLetter } from "./table";
import type { TableResult } from "./table";

/* ------------------------------------------------------------------ *
 * Shared contracts (structural — no dependency on lib/worksheet)
 * ------------------------------------------------------------------ */

/** A column inferred from imported data: a label and an optional per-column unit. */
export interface ImportColumn {
  label: string;
  unit?: string;
}

export interface TableImport {
  columns: ImportColumn[];
  /** Row-major cell sources, units stripped onto the column. */
  rows: string[][];
}

export interface BuildImportOptions {
  /** Treat the first grid row as column headers (label + optional unit annotation). */
  hasHeader: boolean;
}

/** The two delimiters we read and write. TSV is the Excel/Sheets-friendly default. */
export type Delimiter = "\t" | ",";

/* ------------------------------------------------------------------ *
 * Unit recognition (validation only — never mutates the math instance)
 * ------------------------------------------------------------------ */

// A bare number, optionally signed, with optional exponent — same shape table.ts uses.
const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
// A plausible unit token: starts with a letter (or µ/Ω/°), then unit punctuation only.
const UNIT_SHAPE = /^[A-Za-zµμΩ°][A-Za-z0-9µμΩ°·*/^().\-\s]*$/;
// "<number> <token>" — a value that carries its own trailing unit (e.g. "12 kN").
const VALUE_WITH_UNIT = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s+(.+?)\s*$/;

/**
 * True when `candidate` parses as a unit expression Quanta recognizes. We test
 * `math.unit("1 <candidate>")` (so compound units like `kN·m` or `kN/m` work) and
 * gate on a unit-shape regex first, so an English header word ("Note") is rejected.
 */
export function isUnitExpr(candidate: string): boolean {
  const t = candidate.trim();
  if (!t || t.length > 16 || !UNIT_SHAPE.test(t)) return false;
  try {
    math.unit(`1 ${t}`);
    return true;
  } catch {
    return false;
  }
}

/** Strip a leading `=` formula / bare-number cell unchanged; trim everything else. */
function cellText(raw: string): string {
  return raw.trim();
}

/**
 * Remove a column's unit token from a `"<number> <unit>"` cell so the value lives on
 * the column (matches `resolveLiteral`). Bare numbers, formulas, and text pass through.
 */
function stripUnit(raw: string, unit: string | undefined): string {
  const text = cellText(raw);
  if (!unit || text.startsWith("=")) return text;
  const m = text.match(VALUE_WITH_UNIT);
  if (m && m[2].trim() === unit) return m[1];
  return text;
}

/* ------------------------------------------------------------------ *
 * Delimited-text parsing (RFC-4180-ish: quotes, escaped quotes, CRLF)
 * ------------------------------------------------------------------ */

/** Sniff the delimiter from the first line: a tab wins (Excel paste), else `;` vs `,`. */
function sniffDelimiter(text: string): Delimiter | ";" {
  const firstLine = text.split(/\r\n|\r|\n/, 1)[0] ?? "";
  if (firstLine.includes("\t")) return "\t";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  if (semis > commas) return ";";
  return ",";
}

/**
 * Parse delimited text into a rectangular grid of trimmed cell strings. Quoted
 * fields keep their content verbatim (embedded delimiters / newlines / `""`);
 * unquoted fields are trimmed. Fully-blank rows are dropped; rows are padded to
 * the widest row so `grid[r][c]` is always defined.
 */
export function parseDelimited(text: string): string[][] {
  if (text.trim() === "") return [];
  const delim = sniffDelimiter(text);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  let fieldWasQuoted = false;
  let i = 0;

  const pushField = () => {
    row.push(fieldWasQuoted ? field : field.trim());
    field = "";
    fieldWasQuoted = false;
  };
  const pushRow = () => {
    pushField();
    if (row.some((c) => c !== "")) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      fieldWasQuoted = true;
      i += 1;
      continue;
    }
    if (ch === delim) {
      pushField();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      if (text[i + 1] === "\n") i += 1;
      pushRow();
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // Flush the last field/row (no trailing newline).
  if (field !== "" || row.length > 0) pushRow();

  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  for (const r of rows) while (r.length < width) r.push("");
  return rows;
}

/* ------------------------------------------------------------------ *
 * Per-column unit inference
 * ------------------------------------------------------------------ */

/** Pull a trailing unit annotation off a header: `(kN)`, `[mm]`, `, MPa`, or ` kN`. */
function unitFromHeader(header: string): { label: string; unit?: string } {
  const h = header.trim();
  // `(unit)` or `[unit]` at the end.
  const bracket = h.match(/^(.*?)[\s]*[([]\s*([^()[\]]+?)\s*[)\]]\s*$/);
  if (bracket && isUnitExpr(bracket[2])) {
    return { label: bracket[1].trim(), unit: bracket[2].trim() };
  }
  // `label, unit` at the end.
  const comma = h.match(/^(.*\S),\s*([^,]+)$/);
  if (comma && isUnitExpr(comma[2])) {
    return { label: comma[1].trim(), unit: comma[2].trim() };
  }
  // `label unit` — last whitespace-separated token, only if it validates as a unit.
  const space = h.match(/^(.*\S)\s+(\S+)$/);
  if (space && isUnitExpr(space[2])) {
    return { label: space[1].trim(), unit: space[2].trim() };
  }
  return { label: h };
}

/** Infer a column's label + unit from its header and, failing that, its values. */
export function inferColumn(header: string, values: string[]): ImportColumn {
  const fromHeader = unitFromHeader(header);
  if (fromHeader.unit) return fromHeader;

  // Value-sniff: every value that carries a trailing unit must share the same one,
  // and at least one must (bare numbers are fine — the column unit attaches to them).
  let sniffed: string | undefined;
  let sawUnit = false;
  for (const raw of values) {
    const text = cellText(raw);
    if (text === "" || text.startsWith("=")) continue;
    const m = text.match(VALUE_WITH_UNIT);
    if (!m) {
      if (NUMERIC.test(text)) continue; // bare number — ok
      return { label: fromHeader.label }; // free text → unit-less column
    }
    const token = m[2].trim();
    if (!isUnitExpr(token)) return { label: fromHeader.label };
    if (sawUnit && token !== sniffed) return { label: fromHeader.label };
    sniffed = token;
    sawUnit = true;
  }
  return sawUnit ? { label: fromHeader.label, unit: sniffed } : { label: fromHeader.label };
}

/* ------------------------------------------------------------------ *
 * Grid → table-region shape
 * ------------------------------------------------------------------ */

/**
 * Turn a parsed grid into `{ columns, rows }`: detect (or synthesize) headers,
 * infer a unit per column, and strip that unit off the cells so the value lives on
 * the column. Returns a structural shape the reducer maps onto a `TableRegion`.
 */
export function buildTableImport(grid: string[][], opts: BuildImportOptions): TableImport {
  if (grid.length === 0) return { columns: [], rows: [] };
  const nCols = grid.reduce((w, r) => Math.max(w, r.length), 0);
  const headerRow = opts.hasHeader ? grid[0] : [];
  const body = opts.hasHeader ? grid.slice(1) : grid;

  const columns: ImportColumn[] = [];
  for (let c = 0; c < nCols; c++) {
    const header = headerRow[c] ?? "";
    const values = body.map((r) => r[c] ?? "");
    const col = inferColumn(header, values);
    if (!col.label) col.label = `Column ${colToLetter(c)}`;
    columns.push(col);
  }

  const rows = body.map((r) => columns.map((col, c) => stripUnit(r[c] ?? "", col.unit)));
  return { columns, rows };
}

/* ------------------------------------------------------------------ *
 * Table-region shape → delimited text (clipboard export)
 * ------------------------------------------------------------------ */

/** Header label, carrying its unit back as a `[unit]` annotation so re-import round-trips. */
function headerLabel(col: ImportColumn): string {
  return col.unit ? `${col.label} [${col.unit}]` : col.label;
}

/**
 * Build a 2D string matrix from a table: a header row (`label [unit]`) then the
 * evaluated, formatted cell values (magnitude only in a unit column — the unit is
 * in the header). `order` is the row indices to emit (the caller passes the read
 * view's order via `tableViewOrder`; defaults to data order), keeping this pure
 * function decoupled from the content tree's column keys.
 */
export function tableToMatrix(
  columns: ImportColumn[],
  rows: string[][],
  result?: TableResult,
  order?: number[],
): string[][] {
  const idx = order ?? rows.map((_, i) => i);
  const header = columns.map(headerLabel);
  const dataRows = idx.map((r) =>
    columns.map((_, c) => {
      const cell = result?.cells?.[r]?.[c];
      if (cell && !cell.error && cell.kind !== "empty") return cell.formatted;
      return cellText(rows[r]?.[c] ?? "");
    }),
  );
  return [header, ...dataRows];
}

/** One field, quoted iff it contains the delimiter, a quote, or a newline. */
function escapeField(value: string, delimiter: Delimiter): string {
  if (value.includes(delimiter) || value.includes('"') || /[\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serialize a matrix to delimited text. Rows joined with CRLF (Excel-friendly). */
export function toDelimited(matrix: string[][], delimiter: Delimiter = "\t"): string {
  return matrix
    .map((row) => row.map((cell) => escapeField(cell, delimiter)).join(delimiter))
    .join("\r\n");
}
