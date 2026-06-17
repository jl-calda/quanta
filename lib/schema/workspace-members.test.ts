import { describe, it, expect } from "vitest";
import {
  inviteMembersSchema,
  changeMemberRoleSchema,
  setMemberStatusSchema,
} from "./workspace-members";

const WS = "00000000-0000-0000-0000-000000000001";
const ID = "00000000-0000-0000-0000-000000000002";

describe("inviteMembersSchema", () => {
  it("accepts valid invites and trims emails", () => {
    const r = inviteMembersSchema.safeParse({
      workspaceId: WS,
      invites: [{ email: "  a@b.com ", role: "engineer" }],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.invites[0].email).toBe("a@b.com");
  });

  it("rejects an empty invite list", () => {
    const r = inviteMembersSchema.safeParse({ workspaceId: WS, invites: [] });
    expect(r.success).toBe(false);
  });

  it("rejects a bad email", () => {
    const r = inviteMembersSchema.safeParse({
      workspaceId: WS,
      invites: [{ email: "not-an-email", role: "viewer" }],
    });
    expect(r.success).toBe(false);
  });

  it("does not allow inviting straight to owner", () => {
    const r = inviteMembersSchema.safeParse({
      workspaceId: WS,
      invites: [{ email: "a@b.com", role: "owner" }],
    });
    expect(r.success).toBe(false);
  });
});

describe("changeMemberRoleSchema", () => {
  it("accepts an optional transferTo", () => {
    expect(changeMemberRoleSchema.safeParse({ memberId: ID, role: "engineer" }).success).toBe(true);
    expect(
      changeMemberRoleSchema.safeParse({ memberId: ID, role: "engineer", transferTo: WS }).success,
    ).toBe(true);
    expect(
      changeMemberRoleSchema.safeParse({ memberId: ID, role: "owner", transferTo: null }).success,
    ).toBe(true);
  });

  it("rejects an unknown role", () => {
    expect(changeMemberRoleSchema.safeParse({ memberId: ID, role: "superuser" }).success).toBe(false);
  });
});

describe("setMemberStatusSchema", () => {
  it("only allows active or suspended", () => {
    expect(setMemberStatusSchema.safeParse({ memberId: ID, status: "suspended" }).success).toBe(true);
    expect(setMemberStatusSchema.safeParse({ memberId: ID, status: "invited" }).success).toBe(false);
  });
});
