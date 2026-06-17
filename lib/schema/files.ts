import { z } from "zod";

/**
 * File browser input schemas (§4.5). `filesFilters` coerces the URL searchParams
 * that drive the browser (current folder, view, sort, search, and the
 * owner/status/tag facets) — every field `.catch()`es to a safe default so a
 * malformed or stale link degrades gracefully rather than throwing. The action
 * schemas below validate each Server Action's input before any mutation; ids are
 * strict `.uuid()` so a bad payload is rejected in the app's voice.
 */

/* ----------------------------- searchParams ----------------------------- */

export const fileViewSchema = z.enum(["list", "grid"]).catch("list");
export type FileView = z.infer<typeof fileViewSchema>;

export const fileSortSchema = z.enum(["name", "modified", "status"]).catch("modified");
export type FileSort = z.infer<typeof fileSortSchema>;

export const sortDirSchema = z.enum(["asc", "desc"]).catch("desc");
export type SortDir = z.infer<typeof sortDirSchema>;

export const calcStatusFilterSchema = z
  .enum(["current", "stale", "error"])
  .optional()
  .catch(undefined);

export const filesFiltersSchema = z.object({
  /** Current project/folder; `undefined` = workspace root. */
  folder: z.string().uuid().optional().catch(undefined),
  view: fileViewSchema,
  sort: fileSortSchema,
  dir: sortDirSchema,
  q: z.string().trim().max(120).optional().catch(undefined),
  owner: z.string().uuid().optional().catch(undefined),
  status: calcStatusFilterSchema,
  tag: z.string().uuid().optional().catch(undefined),
});
export type FilesFilters = z.infer<typeof filesFiltersSchema>;

/* ------------------------------ action inputs ---------------------------- */

const uuid = z.string().uuid();
const folderName = z.string().trim().min(1, "Give the folder a name.").max(120);
const idList = z.array(uuid).min(1, "Select at least one item.").max(200);

export const createFolderSchema = z.object({
  workspaceId: uuid,
  parentId: uuid.nullable().optional(),
  name: folderName,
});

export const renameProjectSchema = z.object({
  id: uuid,
  name: folderName,
});

export const deleteFolderSchema = z.object({ id: uuid });

export const moveWorksheetSchema = z.object({
  id: uuid,
  projectId: uuid.nullable(),
});

export const moveProjectSchema = z.object({
  id: uuid,
  parentId: uuid.nullable(),
});

export const duplicateWorksheetSchema = z.object({ id: uuid });
export const softDeleteWorksheetSchema = z.object({ id: uuid });
export const restoreWorksheetSchema = z.object({ id: uuid });

export const bulkMoveSchema = z.object({
  ids: idList,
  projectId: uuid.nullable(),
});

export const bulkTagSchema = z.object({
  ids: idList,
  tagId: uuid,
});

export const bulkSoftDeleteSchema = z.object({ ids: idList });

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type RenameProjectInput = z.infer<typeof renameProjectSchema>;
export type DeleteFolderInput = z.infer<typeof deleteFolderSchema>;
export type MoveWorksheetInput = z.infer<typeof moveWorksheetSchema>;
export type MoveProjectInput = z.infer<typeof moveProjectSchema>;
export type DuplicateWorksheetInput = z.infer<typeof duplicateWorksheetSchema>;
export type SoftDeleteWorksheetInput = z.infer<typeof softDeleteWorksheetSchema>;
export type RestoreWorksheetInput = z.infer<typeof restoreWorksheetSchema>;
export type BulkMoveInput = z.infer<typeof bulkMoveSchema>;
export type BulkTagInput = z.infer<typeof bulkTagSchema>;
export type BulkSoftDeleteInput = z.infer<typeof bulkSoftDeleteSchema>;
