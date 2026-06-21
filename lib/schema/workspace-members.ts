import { z } from "zod";

/**
 * Workspace-member input schemas (Func §4.11). Every admin action validates its
 * input before any mutation; ids are strict `.uuid()`. Errors read in the app's
 * voice for inline form feedback. RLS remains the real gate (owner/admin only).
 */

const uuid = z.string().uuid();

/** Every assignable workspace role (invites exclude `owner` — see below). */
export const workspaceRoleSchema = z.enum([
  "owner",
  "admin",
  "engineer",
  "reviewer",
  "viewer",
  "billing",
]);
export type WorkspaceRoleInput = z.infer<typeof workspaceRoleSchema>;

/** Roles an invite can grant — never `owner` (promote to owner from the table). */
export const invitableRoleSchema = z.enum([
  "admin",
  "engineer",
  "reviewer",
  "viewer",
  "billing",
]);

const inviteRowSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address.")
    .email("Enter a valid email address."),
  role: invitableRoleSchema,
});

export const inviteMembersSchema = z.object({
  workspaceId: uuid,
  invites: z
    .array(inviteRowSchema)
    .min(1, "Add at least one email address.")
    .max(20, "Invite up to 20 people at a time."),
});
export type InviteMembersInput = z.infer<typeof inviteMembersSchema>;

export const changeMemberRoleSchema = z.object({
  memberId: uuid,
  role: workspaceRoleSchema,
  /** When demoting an owner who owns worksheets, the member to transfer them to. */
  transferTo: uuid.nullable().optional(),
});
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;

export const setMemberStatusSchema = z.object({
  memberId: uuid,
  status: z.enum(["active", "suspended"]),
});
export type SetMemberStatusInput = z.infer<typeof setMemberStatusSchema>;

export const memberIdSchema = z.object({ memberId: uuid });
export type MemberIdInput = z.infer<typeof memberIdSchema>;
