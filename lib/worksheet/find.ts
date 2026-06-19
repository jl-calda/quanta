/**
 * Find & replace over the worksheet content tree (Func §7.21) — pure and
 * deterministic, so it is exhaustively unit-tested and identical wherever it
 * runs. It searches the editable text of math regions (`source`), text regions
 * (`text`), and table cells (`rows[r][c]`); the dialog turns the returned edits
 * into `EDIT_SOURCE` / `EDIT_TEXT` / `EDIT_TABLE_CELL` reducer actions so replace
 * flows through the same autosave + recompute path as a manual edit.
 *
 * Subscript-identifier mode matches an identifier plus an optional `_subscript`
 * and rewrites only the base, so finding `x` turns `x_i` into `y_i` while leaving
 * the subscript intact — the Mathcad-style rename engineers expect.
 */
import type { WorksheetContent } from "./content";
import { walkRegions } from "./flatten";

export type FindScope = "math" | "text" | "table";
export type FindField = "source" | "text" | "cell";

export interface FindOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  /** Match an identifier + optional `_subscript`, replacing only the base name. */
  subscriptIdentifier?: boolean;
  /** Region kinds to search; defaults to all three. */
  scopes?: FindScope[];
}

export interface FindMatch {
  regionId: string;
  field: FindField;
  /** Present when `field === "cell"`. */
  cell?: { r: number; c: number };
  start: number;
  end: number;
  /** The matched substring (incl. any subscript). */
  text: string;
  /** The captured `_subscript` suffix preserved on replace (subscript mode). */
  sub?: string;
}

/** A new value for one searched field — applied via the matching reducer action. */
export interface FieldEdit {
  regionId: string;
  field: FindField;
  cell?: { r: number; c: number };
  value: string;
}

const ALL_SCOPES: FindScope[] = ["math", "text", "table"];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build the search regex, or null when the query is empty. */
export function buildRegex(query: string, options: FindOptions = {}): RegExp | null {
  if (!query) return null;
  const flags = options.caseSensitive ? "g" : "gi";
  const esc = escapeRegExp(query);
  if (options.subscriptIdentifier) {
    return new RegExp(`\\b(${esc})(_[A-Za-z0-9]+)?\\b`, flags);
  }
  const body = options.wholeWord ? `\\b(${esc})\\b` : `(${esc})`;
  return new RegExp(body, flags);
}

/** Replace every occurrence of `query` in one string. */
export function replaceInString(
  value: string,
  query: string,
  replacement: string,
  options: FindOptions = {},
): { value: string; count: number } {
  const re = buildRegex(query, options);
  if (!re) return { value, count: 0 };
  let count = 0;
  const next = value.replace(re, (_match, _base: string, sub?: string) => {
    count += 1;
    return options.subscriptIdentifier ? replacement + (sub ?? "") : replacement;
  });
  return { value: next, count };
}

/** Replace a single previously-found match by offset (the "Replace" button). */
export function replaceOne(value: string, match: FindMatch, replacement: string): string {
  return value.slice(0, match.start) + replacement + (match.sub ?? "") + value.slice(match.end);
}

interface Field {
  regionId: string;
  field: FindField;
  cell?: { r: number; c: number };
  value: string;
}

/** Every searchable field in reading order, filtered to the active scopes. */
function fields(content: WorksheetContent, scopes: FindScope[]): Field[] {
  const out: Field[] = [];
  for (const region of walkRegions(content)) {
    if (region.type === "math" && scopes.includes("math")) {
      out.push({ regionId: region.id, field: "source", value: region.source });
    } else if (region.type === "text" && scopes.includes("text")) {
      out.push({ regionId: region.id, field: "text", value: region.text });
    } else if (region.type === "table" && scopes.includes("table")) {
      region.rows.forEach((row, r) =>
        row.forEach((cell, c) =>
          out.push({ regionId: region.id, field: "cell", cell: { r, c }, value: cell }),
        ),
      );
    }
  }
  return out;
}

/** All matches across the worksheet, in reading order. */
export function findMatches(
  content: WorksheetContent,
  query: string,
  options: FindOptions = {},
): FindMatch[] {
  const re = buildRegex(query, options);
  if (!re) return [];
  const scopes = options.scopes ?? ALL_SCOPES;
  const matches: FindMatch[] = [];
  for (const f of fields(content, scopes)) {
    for (const m of f.value.matchAll(re)) {
      const start = m.index ?? 0;
      matches.push({
        regionId: f.regionId,
        field: f.field,
        cell: f.cell,
        start,
        end: start + m[0].length,
        text: m[0],
        sub: options.subscriptIdentifier ? m[2] : undefined,
      });
    }
  }
  return matches;
}

/** Field edits that replace every match — one per changed field. */
export function replaceAllEdits(
  content: WorksheetContent,
  query: string,
  replacement: string,
  options: FindOptions = {},
): FieldEdit[] {
  const scopes = options.scopes ?? ALL_SCOPES;
  const edits: FieldEdit[] = [];
  for (const f of fields(content, scopes)) {
    const { value, count } = replaceInString(f.value, query, replacement, options);
    if (count > 0 && value !== f.value) {
      edits.push({ regionId: f.regionId, field: f.field, cell: f.cell, value });
    }
  }
  return edits;
}

/** Write a field edit into a (cloned) tree in place. */
function writeEdit(content: WorksheetContent, edit: FieldEdit): void {
  for (const region of walkRegions(content)) {
    if (region.id !== edit.regionId) continue;
    if (edit.field === "source" && region.type === "math") region.source = edit.value;
    else if (edit.field === "text" && region.type === "text") region.text = edit.value;
    else if (edit.field === "cell" && region.type === "table" && edit.cell) {
      const row = region.rows[edit.cell.r];
      if (row) row[edit.cell.c] = edit.value;
    }
    return;
  }
}

/** Replace every match across the worksheet, returning a new tree + the count. */
export function replaceAllInContent(
  content: WorksheetContent,
  query: string,
  replacement: string,
  options: FindOptions = {},
): { content: WorksheetContent; count: number } {
  const scopes = options.scopes ?? ALL_SCOPES;
  let count = 0;
  const next = structuredClone(content);
  for (const f of fields(content, scopes)) {
    const replaced = replaceInString(f.value, query, replacement, options);
    if (replaced.count > 0 && replaced.value !== f.value) {
      count += replaced.count;
      writeEdit(next, { regionId: f.regionId, field: f.field, cell: f.cell, value: replaced.value });
    }
  }
  return { content: next, count };
}
