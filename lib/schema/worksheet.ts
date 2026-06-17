import { z } from "zod";
import { contentSchema } from "@/lib/worksheet/content";

/**
 * Worksheet input schemas. `createWorksheet` opens a new sheet (blank or seeded
 * from a template) inside a workspace; `searchWorksheets` powers the dashboard's
 * global search across title + tags. The editor save/rename/version/calc-mode
 * actions validate their inputs here before any mutation.
 */
export const createWorksheetSchema = z.object({
  workspaceId: z.string().uuid("Pick a workspace."),
  projectId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
});

export const searchWorksheetsSchema = z.object({
  workspaceId: z.string().uuid("Pick a workspace."),
  q: z.string().trim().min(1, "Type something to search for."),
});

/** Autosave: the full content tree + the engine-derived status/error count. */
export const saveWorksheetSchema = z.object({
  id: z.string().uuid(),
  content: contentSchema,
  calcStatus: z.enum(["current", "stale", "error"]),
  errorCount: z.number().int().min(0),
});

export const renameWorksheetSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Give the worksheet a title.").max(200),
});

export const setCalcModeSchema = z.object({
  id: z.string().uuid(),
  mode: z.enum(["auto", "manual"]),
});

/** Version snapshot: content + an optional human label. */
export const saveWorksheetVersionSchema = z.object({
  id: z.string().uuid(),
  content: contentSchema,
  label: z.string().trim().max(120).optional(),
});

/**
 * Restore a prior version: writes its content back to the worksheet. The action
 * snapshots the current draft first, so nothing is lost (Func §4.9).
 */
export const restoreWorksheetVersionSchema = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
});

/** Name (label) a version. An empty string clears the label. */
export const nameWorksheetVersionSchema = z.object({
  versionId: z.string().uuid(),
  label: z.string().trim().max(120),
});

export type CreateWorksheetInput = z.infer<typeof createWorksheetSchema>;
export type SearchWorksheetsInput = z.infer<typeof searchWorksheetsSchema>;
export type SaveWorksheetInput = z.infer<typeof saveWorksheetSchema>;
export type RenameWorksheetInput = z.infer<typeof renameWorksheetSchema>;
export type SetCalcModeInput = z.infer<typeof setCalcModeSchema>;
export type SaveWorksheetVersionInput = z.infer<typeof saveWorksheetVersionSchema>;
export type RestoreWorksheetVersionInput = z.infer<typeof restoreWorksheetVersionSchema>;
export type NameWorksheetVersionInput = z.infer<typeof nameWorksheetVersionSchema>;
