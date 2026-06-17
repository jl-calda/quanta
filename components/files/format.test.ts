import { describe, it, expect } from "vitest";
import {
  buildTree,
  folderPath,
  isSelfOrDescendant,
  descendantIds,
  fmtModified,
  ownerInitials,
  ownerColor,
  deriveSize,
} from "./format";

const P = (id: string, name: string, parent_id: string | null = null) => ({
  id,
  name,
  parent_id,
});

// A small tree:  a → (b → d), c
const projects = [
  P("a", "Alpha"),
  P("b", "Bravo", "a"),
  P("c", "Charlie"),
  P("d", "Delta", "b"),
];

describe("buildTree", () => {
  it("nests children under parents and sorts by name", () => {
    const roots = buildTree(projects);
    expect(roots.map((r) => r.id)).toEqual(["a", "c"]);
    const a = roots.find((r) => r.id === "a")!;
    expect(a.children.map((c) => c.id)).toEqual(["b"]);
    expect(a.children[0].children.map((c) => c.id)).toEqual(["d"]);
  });

  it("treats orphans (missing parent) as roots", () => {
    const roots = buildTree([P("x", "Ex", "ghost")]);
    expect(roots.map((r) => r.id)).toEqual(["x"]);
  });
});

describe("folderPath", () => {
  it("returns empty at the root", () => {
    expect(folderPath(projects, undefined)).toEqual([]);
    expect(folderPath(projects, null)).toEqual([]);
  });

  it("walks ancestors root→leaf", () => {
    expect(folderPath(projects, "d")).toEqual([
      { id: "a", name: "Alpha" },
      { id: "b", name: "Bravo" },
      { id: "d", name: "Delta" },
    ]);
  });
});

describe("isSelfOrDescendant", () => {
  it("flags self", () => {
    expect(isSelfOrDescendant(projects, "a", "a")).toBe(true);
  });
  it("flags a descendant (cycle move)", () => {
    expect(isSelfOrDescendant(projects, "a", "d")).toBe(true);
    expect(isSelfOrDescendant(projects, "b", "d")).toBe(true);
  });
  it("allows an unrelated target", () => {
    expect(isSelfOrDescendant(projects, "a", "c")).toBe(false);
    expect(isSelfOrDescendant(projects, "d", "a")).toBe(false);
  });
});

describe("descendantIds", () => {
  it("collects the subtree including the root", () => {
    expect(descendantIds(projects, "a").sort()).toEqual(["a", "b", "d"]);
    expect(descendantIds(projects, "c")).toEqual(["c"]);
  });
});

describe("fmtModified", () => {
  const now = new Date("2026-06-17T15:00:00");
  it("shows time for today", () => {
    expect(fmtModified("2026-06-17T11:05:00", now)).toBe("Today, 11:05");
  });
  it("shows Yesterday", () => {
    expect(fmtModified("2026-06-16T09:00:00", now)).toBe("Yesterday");
  });
  it("shows a same-year date", () => {
    expect(fmtModified("2026-06-12T09:00:00", now)).toBe("12 Jun");
  });
  it("shows the year across years", () => {
    expect(fmtModified("2024-04-28T09:00:00", now)).toBe("28 Apr 2024");
  });
  it("returns empty for an invalid date", () => {
    expect(fmtModified("not-a-date", now)).toBe("");
  });
});

describe("ownerInitials", () => {
  it("derives up to two initials", () => {
    expect(ownerInitials("Maya Okafor")).toBe("MO");
    expect(ownerInitials("R. Vasquez")).toBe("RV");
    expect(ownerInitials("")).toBe("?");
  });
});

describe("ownerColor", () => {
  it("maps You to the accent and is stable per name", () => {
    expect(ownerColor("You")).toBe("var(--accent)");
    expect(ownerColor("Maya Okafor")).toBe(ownerColor("Maya Okafor"));
  });
});

describe("deriveSize", () => {
  it("humanizes bytes / KB / MB", () => {
    expect(deriveSize({})).toBe("2 B");
    expect(deriveSize("x".repeat(2048))).toMatch(/KB$/);
    expect(deriveSize("x".repeat(2 * 1024 * 1024))).toMatch(/MB$/);
  });
});
