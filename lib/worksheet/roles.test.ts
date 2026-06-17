import { describe, it, expect } from "vitest";
import {
  worksheetRoleRank,
  baselineWorksheetRole,
  effectiveWorksheetRole,
  worksheetRoleLabel,
} from "./roles";

describe("worksheetRoleRank", () => {
  it("ranks owner > editor > commenter > viewer", () => {
    expect(worksheetRoleRank("owner")).toBeGreaterThan(worksheetRoleRank("editor"));
    expect(worksheetRoleRank("editor")).toBeGreaterThan(worksheetRoleRank("commenter"));
    expect(worksheetRoleRank("commenter")).toBeGreaterThan(worksheetRoleRank("viewer"));
    expect(worksheetRoleRank("viewer")).toBeGreaterThan(worksheetRoleRank(null));
  });
});

describe("baselineWorksheetRole", () => {
  it("maps workspace roles to worksheet baselines", () => {
    expect(baselineWorksheetRole("owner")).toBe("owner");
    expect(baselineWorksheetRole("admin")).toBe("owner");
    expect(baselineWorksheetRole("engineer")).toBe("editor");
    expect(baselineWorksheetRole("reviewer")).toBe("commenter");
    expect(baselineWorksheetRole("viewer")).toBe("viewer");
  });

  it("gives billing and non-members no baseline", () => {
    expect(baselineWorksheetRole("billing")).toBeNull();
    expect(baselineWorksheetRole(null)).toBeNull();
  });
});

describe("effectiveWorksheetRole", () => {
  it("takes the stronger of grant and baseline", () => {
    // engineer baseline = editor; an explicit viewer grant must not weaken it.
    expect(effectiveWorksheetRole("viewer", "engineer")).toBe("editor");
    // a commenter who is granted editor on a specific sheet → editor.
    expect(effectiveWorksheetRole("editor", "reviewer")).toBe("editor");
  });

  it("falls back to whichever side exists", () => {
    expect(effectiveWorksheetRole("editor", "billing")).toBe("editor"); // no baseline
    expect(effectiveWorksheetRole(null, "engineer")).toBe("editor"); // no grant
    expect(effectiveWorksheetRole(null, null)).toBeNull(); // neither
    expect(effectiveWorksheetRole(null, "billing")).toBeNull();
  });
});

describe("worksheetRoleLabel", () => {
  it("sentence-cases the role", () => {
    expect(worksheetRoleLabel("owner")).toBe("Owner");
    expect(worksheetRoleLabel("commenter")).toBe("Commenter");
  });
});
