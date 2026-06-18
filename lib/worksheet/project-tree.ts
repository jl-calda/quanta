/**
 * Project/worksheet tree for the editor's "Files" tab (Func 5.3) — pure and
 * deterministic. Parallels `components/files/format.ts buildTree`, but also
 * buckets worksheets under their project so the tab can render folders with their
 * sheets and highlight the current one. Orphan parents (a project hidden by RLS,
 * or a dangling parent_id) surface as roots; worksheets with no project fall into
 * `looseSheets`. Children and sheets are name-sorted for a stable display.
 */

export interface ProjectInput {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface SheetInput {
  id: string;
  title: string;
  project_id: string | null;
}

export interface SheetNode {
  kind: "sheet";
  id: string;
  title: string;
}

export interface ProjectNode {
  kind: "project";
  id: string;
  name: string;
  children: ProjectNode[];
  sheets: SheetNode[];
}

export interface ProjectTree {
  roots: ProjectNode[];
  looseSheets: SheetNode[];
}

export function buildWorksheetTree(
  projects: ProjectInput[],
  sheets: SheetInput[],
): ProjectTree {
  const byId = new Map<string, ProjectNode>();
  for (const p of projects) {
    byId.set(p.id, { kind: "project", id: p.id, name: p.name, children: [], sheets: [] });
  }

  const roots: ProjectNode[] = [];
  for (const p of projects) {
    const node = byId.get(p.id)!;
    const parent = p.parent_id ? byId.get(p.parent_id) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node); // root, orphaned, or self-referential
  }

  const looseSheets: SheetNode[] = [];
  for (const s of sheets) {
    const node: SheetNode = { kind: "sheet", id: s.id, title: s.title };
    const parent = s.project_id ? byId.get(s.project_id) : undefined;
    if (parent) parent.sheets.push(node);
    else looseSheets.push(node);
  }

  const sortRec = (nodes: ProjectNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) {
      n.sheets.sort((a, b) => a.title.localeCompare(b.title));
      sortRec(n.children);
    }
  };
  sortRec(roots);
  looseSheets.sort((a, b) => a.title.localeCompare(b.title));

  return { roots, looseSheets };
}

/**
 * The chain of ancestor project ids for a worksheet's project (including the
 * project itself), so the Files tab can open the folders down to the current
 * sheet. Empty when the sheet has no project. Cycle-guarded.
 */
export function ancestorProjectIds(
  projects: ProjectInput[],
  projectId: string | null,
): string[] {
  if (!projectId) return [];
  const byId = new Map(projects.map((p) => [p.id, p]));
  const out: string[] = [];
  const seen = new Set<string>();
  let cur = byId.get(projectId);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.push(cur.id);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return out;
}
