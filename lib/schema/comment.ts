import { z } from "zod";

/**
 * Comment input schemas. `addComment` posts a note anchored to a region (or the
 * sheet); `setCommentResolved` flips a thread open/closed. RLS (`comments_*`)
 * is the real gate — these just validate shape before the mutation.
 */
export const addCommentSchema = z.object({
  worksheetId: z.string().uuid(),
  // `region_id` is free text in the schema (a region id or the "worksheet"
  // sentinel); keep it bounded but don't force a uuid.
  regionId: z.string().trim().min(1).max(64),
  body: z.string().trim().min(1, "Write a comment first.").max(4000),
});

export const setCommentResolvedSchema = z.object({
  id: z.string().uuid(),
  resolved: z.boolean(),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type SetCommentResolvedInput = z.infer<typeof setCommentResolvedSchema>;
