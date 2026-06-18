import { describe, expect, it } from "vitest";
import {
  ancestorProjectIds,
  buildWorksheetTree,
  type ProjectInput,
  type SheetInput,
} from "./project-tree";

const projects: ProjectInput[] = [
  { id: "p1", name: "Beta", parent_id: null },
  { id: "p2", name: "Alpha", parent_id: null },
  { id: "c1", name: "Child", parent_id: "p2" },
  { id: "g1", name: "Grandchild", parent_id: "c1" },
];

const sheets: SheetInput[] = [
  { id: "s1", title: "Sheet under child", project_id: "c1" },
  { id: "s2", title: "Loose sheet", project_id: null },
  { id: "s3", title: "Sheet under alpha", project_id: "p2" },
];

describe("buildWorksheetTree", () => {
  it("nests projects parent → child → grandchild", () => {
    const { roots } = buildWorksheetTree(projects, []);
    const alpha = roots.find((r) => r.id === "p2")!;
    expect(alpha.children.map((c) => c.id)).toEqual(["c1"]);
    expect(alpha.children[0].children.map((c) => c.id)).toEqual(["g1"]);
  });

  it("sorts roots and children by name", () => {
    const { roots } = buildWorksheetTree(projects, []);
    expect(roots.map((r) => r.name)).toEqual(["Alpha", "Beta"]);
  });

  it("buckets sheets under their project and the rest into looseSheets", () => {
    const { roots, looseSheets } = buildWorksheetTree(projects, sheets);
    const child = roots.find((r) => r.id === "p2")!.children[0];
    expect(child.sheets.map((s) => s.id)).toEqual(["s1"]);
    expect(roots.find((r) => r.id === "p2")!.sheets.map((s) => s.id)).toEqual(["s3"]);
    expect(looseSheets.map((s) => s.id)).toEqual(["s2"]);
  });

  it("promotes a project with a missing parent to a root", () => {
    const { roots } = buildWorksheetTree(
      [{ id: "x", name: "Orphan", parent_id: "gone" }],
      [],
    );
    expect(roots.map((r) => r.id)).toEqual(["x"]);
  });

  it("returns an empty tree for empty inputs", () => {
    expect(buildWorksheetTree([], [])).toEqual({ roots: [], looseSheets: [] });
  });
});

describe("ancestorProjectIds", () => {
  it("returns the chain from the project up to the root", () => {
    expect(ancestorProjectIds(projects, "g1")).toEqual(["g1", "c1", "p2"]);
  });

  it("returns empty for no project", () => {
    expect(ancestorProjectIds(projects, null)).toEqual([]);
  });

  it("is cycle-guarded", () => {
    const cyclic: ProjectInput[] = [
      { id: "a", name: "A", parent_id: "b" },
      { id: "b", name: "B", parent_id: "a" },
    ];
    expect(ancestorProjectIds(cyclic, "a")).toEqual(["a", "b"]);
  });
});
