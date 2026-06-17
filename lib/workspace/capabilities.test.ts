import { describe, it, expect } from "vitest";
import {
  CAPABILITY_GROUPS,
  WORKSPACE_ROLES,
  workspaceRoleLabel,
  workspaceRoleOptions,
  workspaceRoleRank,
} from "./capabilities";

describe("WORKSPACE_ROLES", () => {
  it("lists the six workspace roles in precedence order", () => {
    expect([...WORKSPACE_ROLES]).toEqual([
      "owner",
      "admin",
      "engineer",
      "reviewer",
      "viewer",
      "billing",
    ]);
  });
});

describe("CAPABILITY_GROUPS", () => {
  it("defines a state for every role on every capability", () => {
    for (const group of CAPABILITY_GROUPS) {
      for (const cap of group.items) {
        for (const role of WORKSPACE_ROLES) {
          expect(cap.states[role]).toMatch(/^(full|partial|none)$/);
        }
      }
    }
  });

  it("gives owner full access to every capability", () => {
    for (const group of CAPABILITY_GROUPS) {
      for (const cap of group.items) {
        expect(cap.states.owner).toBe("full");
      }
    }
  });

  it("only billing (with owner) can manage billing", () => {
    const billing = CAPABILITY_GROUPS.flatMap((g) => g.items).find((c) => c.id === "billing");
    expect(billing?.states.billing).toBe("full");
    expect(billing?.states.admin).toBe("none");
    expect(billing?.states.engineer).toBe("none");
  });

  it("uses unique capability ids", () => {
    const ids = CAPABILITY_GROUPS.flatMap((g) => g.items.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("workspaceRoleLabel", () => {
  it("sentence-cases a role", () => {
    expect(workspaceRoleLabel("engineer")).toBe("Engineer");
    expect(workspaceRoleLabel("owner")).toBe("Owner");
  });
});

describe("workspaceRoleOptions", () => {
  it("returns all six roles by default", () => {
    expect(workspaceRoleOptions().map((o) => o.value)).toEqual([...WORKSPACE_ROLES]);
  });

  it("can exclude owner (for invites)", () => {
    const values = workspaceRoleOptions({ excludeOwner: true }).map((o) => o.value);
    expect(values).not.toContain("owner");
    expect(values).toHaveLength(5);
  });
});

describe("workspaceRoleRank", () => {
  it("ranks owner above admin above the rest", () => {
    expect(workspaceRoleRank("owner")).toBeGreaterThan(workspaceRoleRank("admin"));
    expect(workspaceRoleRank("admin")).toBeGreaterThan(workspaceRoleRank("engineer"));
    expect(workspaceRoleRank("viewer")).toBeGreaterThan(workspaceRoleRank("billing"));
  });

  it("treats a downgrade from owner as a lower rank", () => {
    expect(workspaceRoleRank("engineer")).toBeLessThan(workspaceRoleRank("owner"));
  });
});
