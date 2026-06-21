import { z } from "zod";

/**
 * Sharing input schemas (Func §3.8 / §4.8). Every Share action validates its
 * input before any mutation; ids are strict `.uuid()` and the assignable roles
 * exclude `owner` (ownership transfers aren't part of the Share dialog). Errors
 * read in the app's voice for inline form feedback.
 */

const uuid = z.string().uuid();

/** Roles the Share dialog can grant — never `owner`. */
export const assignableRoleSchema = z.enum(["editor", "commenter", "viewer"]);
export type AssignableRole = z.infer<typeof assignableRoleSchema>;

export const inviteCollaboratorSchema = z.object({
  worksheetId: uuid,
  email: z
    .string()
    .trim()
    .min(1, "Enter a name or email.")
    .email("Enter a valid email address."),
  role: assignableRoleSchema,
});
export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema>;

export const changeCollaboratorRoleSchema = z.object({
  collaboratorId: uuid,
  role: assignableRoleSchema,
});
export type ChangeCollaboratorRoleInput = z.infer<
  typeof changeCollaboratorRoleSchema
>;

export const revokeCollaboratorSchema = z.object({ collaboratorId: uuid });
export type RevokeCollaboratorInput = z.infer<typeof revokeCollaboratorSchema>;

export const createShareLinkSchema = z.object({
  worksheetId: uuid,
  role: assignableRoleSchema.default("viewer"),
});
export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>;
