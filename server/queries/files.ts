import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CalcStatus, Json } from "@/lib/supabase/types";
import type { FilesFilters } from "@/lib/schema/files";
import { deriveSize } from "@/components/files/format";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * File browser reads (§4.5). Every query runs through the RLS-scoped server
 * client and is narrowed to the active workspace; worksheet reads always exclude
 * soft-deleted rows (`deleted_at is null` — those live in Trash). Owner profiles
 * and tags are resolved in separate `.in(...)` round-trips and stitched in JS
 * (the proven pattern from `templates.ts`; the hand-written types don't model
 * embedded selects).
 */

export type FolderRow = {
  id: string;
  name: string;
  created_at: string;
  itemCount: number;
};

export type FileTag = { id: string; name: string };

export type FileRow = {
  id: string;
  title: string;
  calc_status: CalcStatus;
  error_count: number;
  owner_id: string | null;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  tags: FileTag[];
  updated_at: string;
  size: string;
  /** Content tree (JSONB) — drives the grid's rendered `ContentSnapshot` thumbnail. */
  content: Json;
};

export type FolderContents = {
  folders: FolderRow[];
  files: FileRow[];
};

export type ProjectSummary = {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type WorkspaceMemberOption = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

const FILE_COLS =
  "id, title, calc_status, error_count, owner_id, updated_at, content, project_id";

/** Escape LIKE wildcards so user search input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/** Resolve owner display names + avatars for a set of profile ids in one hop. */
async function resolveOwners(
  supabase: Client,
  ownerIds: string[],
): Promise<Map<string, { name: string | null; avatarUrl: string | null }>> {
  const out = new Map<string, { name: string | null; avatarUrl: string | null }>();
  if (ownerIds.length === 0) return out;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", ownerIds);
  for (const row of data ?? []) {
    out.set(row.id, { name: row.full_name, avatarUrl: row.avatar_url });
  }
  return out;
}

/** Resolve tag chips for a set of worksheet ids in two hops (links → tags). */
async function resolveTags(
  supabase: Client,
  sheetIds: string[],
): Promise<Map<string, FileTag[]>> {
  const out = new Map<string, FileTag[]>();
  if (sheetIds.length === 0) return out;

  const { data: links } = await supabase
    .from("worksheet_tags")
    .select("worksheet_id, tag_id")
    .in("worksheet_id", sheetIds);
  const rows = links ?? [];
  const tagIds = [...new Set(rows.map((l) => l.tag_id))];
  if (tagIds.length === 0) return out;

  const { data: tags } = await supabase
    .from("tags")
    .select("id, name")
    .in("id", tagIds);
  const tagById = new Map((tags ?? []).map((t) => [t.id, t.name]));

  for (const link of rows) {
    const name = tagById.get(link.tag_id);
    if (!name) continue;
    const arr = out.get(link.worksheet_id) ?? [];
    arr.push({ id: link.tag_id, name });
    out.set(link.worksheet_id, arr);
  }
  for (const arr of out.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Worksheet ids carrying a given tag — restricts the listing when the Tag
 * facet is active. */
async function sheetIdsForTag(
  supabase: Client,
  tagId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("worksheet_tags")
    .select("worksheet_id")
    .eq("tag_id", tagId)
    .limit(500);
  return [...new Set((data ?? []).map((l) => l.worksheet_id))];
}

/**
 * The folders + worksheets inside the current folder, filtered/sorted per the
 * URL state. Folders are the immediate child projects of `filters.folder`
 * (or the root projects when none); worksheets are the non-deleted sheets whose
 * `project_id` matches. Capped at 200 rows (virtualized client-side above ~60).
 */
export async function listFolderContents(
  workspaceId: string,
  filters: FilesFilters,
): Promise<FolderContents> {
  const supabase = await createClient();
  const folderId = filters.folder ?? null;

  // ---- Folders: immediate child projects of the current folder ----
  const folderQuery = supabase
    .from("projects")
    .select("id, name, created_at")
    .eq("workspace_id", workspaceId);
  const { data: folderData } = await (folderId
    ? folderQuery.eq("parent_id", folderId)
    : folderQuery.is("parent_id", null)
  ).order("name", { ascending: true });
  let folders = folderData ?? [];
  // A name search filters folders too (folders carry no tags/owner/status).
  if (filters.q) {
    const needle = filters.q.toLowerCase();
    folders = folders.filter((f) => f.name.toLowerCase().includes(needle));
  }
  // The owner/status/tag facets are worksheet-only; hide folders when active.
  if (filters.owner || filters.status || filters.tag) folders = [];

  // Folder item counts (immediate child projects + non-deleted worksheets),
  // computed from one light pass over the workspace so we avoid an N+1.
  const counts = await folderItemCounts(supabase, workspaceId);
  const folderRows: FolderRow[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    created_at: f.created_at,
    itemCount: counts.get(f.id) ?? 0,
  }));

  // ---- Worksheets in the current folder ----
  let query = supabase
    .from("worksheets")
    .select(FILE_COLS)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);
  query = folderId ? query.eq("project_id", folderId) : query.is("project_id", null);

  if (filters.owner) query = query.eq("owner_id", filters.owner);
  if (filters.status) query = query.eq("calc_status", filters.status);
  if (filters.q) query = query.ilike("title", `%${escapeLike(filters.q)}%`);
  if (filters.tag) {
    const ids = await sheetIdsForTag(supabase, filters.tag);
    if (ids.length === 0) return { folders: folderRows, files: [] };
    query = query.in("id", ids);
  }

  const orderCol =
    filters.sort === "name"
      ? "title"
      : filters.sort === "status"
        ? "calc_status"
        : "updated_at";
  const ascending = filters.dir === "asc";

  const { data: sheetData } = await query
    .order(orderCol, { ascending })
    .limit(200);
  const sheets = sheetData ?? [];

  const owners = await resolveOwners(
    supabase,
    [...new Set(sheets.map((s) => s.owner_id).filter((id): id is string => !!id))],
  );
  const tags = await resolveTags(
    supabase,
    sheets.map((s) => s.id),
  );

  const files: FileRow[] = sheets.map((s) => {
    const owner = s.owner_id ? owners.get(s.owner_id) : undefined;
    return {
      id: s.id,
      title: s.title,
      calc_status: s.calc_status,
      error_count: s.error_count,
      owner_id: s.owner_id,
      ownerName: owner?.name ?? null,
      ownerAvatarUrl: owner?.avatarUrl ?? null,
      tags: tags.get(s.id) ?? [],
      updated_at: s.updated_at,
      size: deriveSize(s.content as Json),
      content: s.content as Json,
    };
  });

  return { folders: folderRows, files };
}

/** Immediate-child counts per folder (child projects + non-deleted worksheets),
 * computed in two light reads to avoid a per-folder N+1. */
async function folderItemCounts(
  supabase: Client,
  workspaceId: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const [{ data: projectRows }, { data: sheetRows }] = await Promise.all([
    supabase
      .from("projects")
      .select("parent_id")
      .eq("workspace_id", workspaceId),
    supabase
      .from("worksheets")
      .select("project_id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
  ]);
  for (const r of projectRows ?? []) {
    if (r.parent_id) counts.set(r.parent_id, (counts.get(r.parent_id) ?? 0) + 1);
  }
  for (const r of sheetRows ?? []) {
    if (r.project_id) counts.set(r.project_id, (counts.get(r.project_id) ?? 0) + 1);
  }
  return counts;
}

/** Immediate-child item counts per folder id — feeds the tree node counts. */
export async function getFolderCounts(
  workspaceId: string,
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const counts = await folderItemCounts(supabase, workspaceId);
  return Object.fromEntries(counts);
}

/** All projects in the workspace — feeds the tree, breadcrumb, and move picker.
 * Cached so the page and its children share one read per request. */
export const getProjectTree = cache(async function getProjectTree(
  workspaceId: string,
): Promise<ProjectSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, parent_id, created_by, created_at")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });
  return data ?? [];
});

/** Distinct tags in the workspace — the Tag filter facet and bulk-tag picker. */
export async function getWorkspaceTags(
  workspaceId: string,
): Promise<FileTag[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tags")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });
  return data ?? [];
}

/** Active members of the workspace — the Owner filter facet + avatar names. */
export async function getWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMemberOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("user_id, profile:profiles(id, full_name, avatar_url)")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  const out: WorkspaceMemberOption[] = [];
  for (const row of data ?? []) {
    const raw = row.profile as unknown;
    const profile = (Array.isArray(raw) ? raw[0] : raw) as
      | { id: string; full_name: string | null; avatar_url: string | null }
      | null
      | undefined;
    if (!profile) continue;
    out.push({
      id: profile.id,
      name: profile.full_name ?? "Unknown",
      avatarUrl: profile.avatar_url,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
