/**
 * Template versioning + parameterized create-from-template ("fill-ins"). Pure,
 * deterministic helpers over the `WorksheetContent` tree (Phase-2 refinement) —
 * no I/O, no `Date.now()` (timestamps are passed in by the action layer), and no
 * dependency on `/lib/calc`, so this is safe to import from client components.
 *
 * Fill-ins are author-placed `{{token}}` placeholders in region sources. On
 * "Use template" the user is prompted for each declared param and the tokens are
 * substituted into the new worksheet. Versioning lives in `content.template`
 * (revision + changelog); the source-template link lives in `content.origin`.
 *
 * The substitution allow-list is deliberately narrow — `math.source`,
 * `text.text`, and `table.rows` cells (recursing into areas) — the fields
 * engineers actually parameterize. Other region string fields are out of scope
 * for v1 (see DECISIONS.md) so a generic deep walk can't corrupt structural
 * strings or ids.
 */
import type {
  Region,
  TemplateChange,
  TemplateMeta,
  TemplateOrigin,
  TemplateParam,
  WorksheetContent,
} from "./content";

/** Matches `{{key}}` (optional inner whitespace); `key` is a JS-identifier-ish name. */
export const TOKEN_RE = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;

/* ------------------------------------------------------------------ *
 * Tree walk (local, pure — avoids importing the calc-heavy `flatten`).
 * ------------------------------------------------------------------ */

function* walkRegions(content: WorksheetContent): Generator<Region> {
  for (const row of content.rows) {
    for (const cell of row.cells) yield* walkRegionList(cell.regions);
  }
}

function* walkRegionList(regions: Region[]): Generator<Region> {
  for (const region of regions) {
    yield region;
    if (region.type === "area") yield* walkRegionList(region.regions);
  }
}

/** The substitutable string fields of one region (read-only scan). */
function* regionStrings(region: Region): Generator<string> {
  if (region.type === "math") yield region.source;
  else if (region.type === "text") yield region.text;
  else if (region.type === "table" && Array.isArray(region.rows)) {
    for (const row of region.rows) for (const cell of row) yield cell;
  }
}

/* ------------------------------------------------------------------ *
 * Token discovery
 * ------------------------------------------------------------------ */

/** Distinct fill-in tokens found in the substitutable string fields, in
 * first-seen reading order. */
export function extractTokens(content: WorksheetContent): string[] {
  const seen = new Set<string>();
  for (const region of walkRegions(content)) {
    for (const text of regionStrings(region)) {
      for (const match of text.matchAll(TOKEN_RE)) seen.add(match[1]);
    }
  }
  return [...seen];
}

/** Params auto-derived from the tokens present in the content (text fields,
 * label = key). The seed for the "Save as template" fill-in editor. */
export function autoParams(content: WorksheetContent): TemplateParam[] {
  return extractTokens(content).map((key) => ({ key, label: key, type: "text" as const }));
}

/** The params to prompt for when creating from a template: the declared set when
 * the content carries template metadata, else auto-derived from its tokens (so
 * older/seed templates with raw `{{tokens}}` still prompt). */
export function paramsForContent(content: WorksheetContent): TemplateParam[] {
  if (content.template) return content.template.params;
  return autoParams(content);
}

/* ------------------------------------------------------------------ *
 * Substitution (create-from-template)
 * ------------------------------------------------------------------ */

/** Build `key → replacement` from user values, with the blank-value contract:
 * a blank value falls back to the param's `default`; a still-blank result is
 * omitted so the token is left literal (never inject `""` into a source — that
 * would produce `name := ` and an engine error). Unit params emit `value unit`. */
function buildSubstitutions(
  params: TemplateParam[],
  values: Record<string, string>,
): Map<string, string> {
  const subs = new Map<string, string>();
  for (const p of params) {
    const raw = values[p.key];
    const chosen = raw != null && raw.trim() !== "" ? raw.trim() : (p.default ?? "").trim();
    if (chosen === "") continue;
    subs.set(p.key, p.unit ? `${chosen} ${p.unit}` : chosen);
  }
  return subs;
}

function substitute(text: string, subs: Map<string, string>): string {
  if (!text || subs.size === 0) return text;
  return text.replace(TOKEN_RE, (whole, key: string) => subs.get(key) ?? whole);
}

function substituteRegion(region: Region, subs: Map<string, string>): void {
  if (region.type === "math") region.source = substitute(region.source, subs);
  else if (region.type === "text") region.text = substitute(region.text, subs);
  else if (region.type === "table" && Array.isArray(region.rows)) {
    region.rows = region.rows.map((row) => row.map((cell) => substitute(cell, subs)));
  }
}

/**
 * Produce the new worksheet content for create-from-template: deep-clone the
 * template content, replace each declared param's `{{token}}` with the user's
 * value (or its default), and strip the `template` metadata (the result is a
 * worksheet, not a template). `version`/`rows`/`units` are preserved.
 */
export function applyFillIns(
  content: WorksheetContent,
  values: Record<string, string>,
): WorksheetContent {
  const subs = buildSubstitutions(paramsForContent(content), values);
  const next = structuredClone(content) as WorksheetContent;
  if (subs.size > 0) {
    for (const region of walkRegions(next)) substituteRegion(region, subs);
  }
  delete next.template;
  return next;
}

/* ------------------------------------------------------------------ *
 * Versioning
 * ------------------------------------------------------------------ */

/** Stamp the source-template link onto a worksheet's content. */
export function withOrigin(content: WorksheetContent, origin: TemplateOrigin): WorksheetContent {
  return { ...content, origin };
}

/** Attach template metadata to content, dropping any inherited `origin` (this
 * content is now a template, not a derived worksheet). */
export function stampTemplateMeta(content: WorksheetContent, meta: TemplateMeta): WorksheetContent {
  const next: WorksheetContent = { ...content, template: meta };
  delete next.origin;
  return next;
}

/**
 * Compute the next template revision: bumps `revision`, appends a changelog
 * entry, and sets the param set. Passing `prev = undefined` produces revision 1
 * (the initial "Save as template"); passing the current meta produces the next
 * revision (an "Update existing template"). Timestamps are caller-provided so
 * the helper stays deterministic.
 */
export function bumpTemplateMeta(
  prev: TemplateMeta | undefined,
  entry: { label?: string; at: string; by?: string },
  params: TemplateParam[],
): TemplateMeta {
  const revision = (prev?.revision ?? 0) + 1;
  const change: TemplateChange = { revision, at: entry.at };
  if (entry.label) change.label = entry.label;
  if (entry.by) change.by = entry.by;
  return {
    revision,
    params,
    changelog: [...(prev?.changelog ?? []), change],
  };
}

export interface TemplateUpdateStatus {
  updateAvailable: boolean;
  fromRevision: number;
  toRevision: number;
  /** Changelog entries published after the worksheet's origin revision. */
  changes: TemplateChange[];
}

/** Whether the source template has published a newer revision than the one a
 * worksheet was created from, with the changelog slice since. */
export function templateUpdateStatus(
  origin: TemplateOrigin,
  meta: TemplateMeta | undefined,
): TemplateUpdateStatus {
  const fromRevision = origin.revision;
  const toRevision = meta?.revision ?? fromRevision;
  return {
    updateAvailable: toRevision > fromRevision,
    fromRevision,
    toRevision,
    changes: (meta?.changelog ?? []).filter((c) => c.revision > fromRevision),
  };
}
