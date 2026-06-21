import { describe, it, expect } from "vitest";
import {
  inviteCollaboratorSchema,
  changeCollaboratorRoleSchema,
  revokeCollaboratorSchema,
  createShareLinkSchema,
} from "./share";

const SHEET = "11111111-1111-1111-1111-111111111111";
const GRANT = "22222222-2222-2222-2222-222222222222";

describe("inviteCollaboratorSchema", () => {
  it("accepts a valid invite", () => {
    const r = inviteCollaboratorSchema.safeParse({
      worksheetId: SHEET,
      email: "  Maya.Okafor@acme-eng.com ",
      role: "editor",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("Maya.Okafor@acme-eng.com"); // trimmed
  });

  it("rejects a bad email", () => {
    expect(
      inviteCollaboratorSchema.safeParse({ worksheetId: SHEET, email: "nope", role: "viewer" })
        .success,
    ).toBe(false);
  });

  it("rejects the owner role (not assignable)", () => {
    expect(
      inviteCollaboratorSchema.safeParse({
        worksheetId: SHEET,
        email: "a@b.com",
        role: "owner",
      }).success,
    ).toBe(false);
  });

  it("rejects a non-uuid worksheet id", () => {
    expect(
      inviteCollaboratorSchema.safeParse({ worksheetId: "x", email: "a@b.com", role: "viewer" })
        .success,
    ).toBe(false);
  });
});

describe("changeCollaboratorRoleSchema", () => {
  it("accepts a valid role change", () => {
    expect(
      changeCollaboratorRoleSchema.safeParse({ collaboratorId: GRANT, role: "commenter" }).success,
    ).toBe(true);
  });

  it("rejects an unknown role", () => {
    expect(
      changeCollaboratorRoleSchema.safeParse({ collaboratorId: GRANT, role: "boss" }).success,
    ).toBe(false);
  });
});

describe("revokeCollaboratorSchema", () => {
  it("requires a uuid", () => {
    expect(revokeCollaboratorSchema.safeParse({ collaboratorId: GRANT }).success).toBe(true);
    expect(revokeCollaboratorSchema.safeParse({ collaboratorId: "nope" }).success).toBe(false);
  });
});

describe("createShareLinkSchema", () => {
  it("defaults the role to viewer", () => {
    const r = createShareLinkSchema.safeParse({ worksheetId: SHEET });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.role).toBe("viewer");
  });
});
