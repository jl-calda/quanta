import { z } from "zod";

/**
 * Workspace input schemas. The slug is the tenant's URL handle; keep it to
 * lowercase letters, numbers, and single hyphens.
 */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Use at least 2 characters.")
  .max(48, "Keep it under 48 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens.",
  );

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Name your workspace.").max(80),
  slug: slugSchema,
});

export const switchWorkspaceSchema = z.object({
  workspaceId: z.string().uuid("Pick a workspace."),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
