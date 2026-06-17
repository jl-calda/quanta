import { z } from "zod";

/**
 * Worksheet input schemas. `createWorksheet` opens a new sheet (blank or seeded
 * from a template) inside a workspace; `searchWorksheets` powers the dashboard's
 * global search across title + tags.
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

export type CreateWorksheetInput = z.infer<typeof createWorksheetSchema>;
export type SearchWorksheetsInput = z.infer<typeof searchWorksheetsSchema>;
