import { describe, it, expect } from "vitest";
import { formatAuditEntry, formatAuditEntries, type RawAuditEntry } from "./audit";

const names = new Map([
  ["u1", "Nadia Brunel"],
  ["u2", "Marcus Okafor"],
]);

function raw(partial: Partial<RawAuditEntry>): RawAuditEntry {
  return {
    id: 1,
    actor_id: "u1",
    action: "invite_member",
    target_type: "workspace_member",
    target_id: "m1",
    metadata: null,
    created_at: "2026-06-17T10:00:00Z",
    ...partial,
  };
}

describe("formatAuditEntry", () => {
  it("resolves the actor name, or falls back to System", () => {
    expect(formatAuditEntry(raw({ actor_id: "u1" }), names).actorName).toBe("Nadia Brunel");
    expect(formatAuditEntry(raw({ actor_id: null }), names).actorName).toBe("System");
    expect(formatAuditEntry(raw({ actor_id: "ghost" }), names).actorName).toBe("System");
  });

  it("formats an invite with email + role and an accent tone", () => {
    const e = formatAuditEntry(
      raw({ action: "invite_member", metadata: { email: "l.haas@acme.com", role: "engineer" } }),
      names,
    );
    expect(e.label).toBe("Invited member");
    expect(e.target).toBe("l.haas@acme.com · Engineer");
    expect(e.tone).toBe("accent");
  });

  it("formats a role change as from → to (warning tone)", () => {
    const e = formatAuditEntry(
      raw({ action: "change_role", metadata: { email: "r@x.com", from: "owner", role: "engineer" } }),
      names,
    );
    expect(e.label).toBe("Changed member role");
    expect(e.target).toBe("r@x.com · Owner → Engineer");
    expect(e.tone).toBe("warning");
  });

  it("formats ownership transfer with a worksheet count", () => {
    const e = formatAuditEntry(
      raw({ action: "transfer_ownership", metadata: { email: "r@x.com", count: 3 } }),
      names,
    );
    expect(e.label).toBe("Transferred ownership");
    expect(e.target).toBe("r@x.com · 3 worksheets");
    expect(e.tone).toBe("accent");
  });

  it("uses an error tone for removal and pass for reactivation", () => {
    expect(formatAuditEntry(raw({ action: "remove_member" }), names).tone).toBe("error");
    expect(formatAuditEntry(raw({ action: "reactivate_member" }), names).tone).toBe("pass");
  });

  it("falls back to the raw action label for unknown actions", () => {
    const e = formatAuditEntry(raw({ action: "something_new" }), names);
    expect(e.label).toBe("something_new");
    expect(e.tone).toBe("muted");
  });
});

describe("formatAuditEntries", () => {
  it("sorts newest first", () => {
    const out = formatAuditEntries(
      [
        raw({ id: 1, created_at: "2026-06-17T09:00:00Z" }),
        raw({ id: 2, created_at: "2026-06-17T11:00:00Z" }),
        raw({ id: 3, created_at: "2026-06-17T10:00:00Z" }),
      ],
      names,
    );
    expect(out.map((e) => e.id)).toEqual(["audit:2", "audit:3", "audit:1"]);
  });
});
