import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CalcStatus, Json } from "@/lib/supabase/types";

/**
 * Dashboard reads (§4.2). Every query runs through the RLS-scoped server client
 * and is additionally narrowed to the active workspace, so a multi-workspace
 * user sees only the tenant they're currently in. Worksheet reads always exclude
 * soft-deleted rows (`deleted_at is null` → those live in Trash).
 */

export type RecentWorksheet = {
  id: string;
  title: string;
  calc_status: CalcStatus;
  error_count: number;
  updated_at: string;
  project_id: string | null;
  owner_id: string | null;
  /** Content tree (JSONB) — drives the card's rendered `ContentSnapshot` thumbnail. */
  content: Json;
};

/** Most-recently-touched worksheets for "Continue working". */
export async function getRecentWorksheets(
  workspaceId: string,
  limit = 6,
): Promise<RecentWorksheet[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("worksheets")
    .select(
      "id, title, calc_status, error_count, updated_at, project_id, owner_id, content",
    )
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export type ProjectSummary = {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
};

/** Projects in the active workspace — feeds the nav rail list and the table. */
export const getWorkspaceProjects = cache(async function getWorkspaceProjects(
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

export type TemplateSummary = {
  id: string;
  title: string;
  description: string | null;
  discipline: string | null;
  standard: string | null;
  thumbnail_url: string | null;
  /** Content tree (JSONB) — drives the card's rendered `ContentSnapshot` thumbnail. */
  content: Json;
};

/**
 * Starter templates for "Start from a template": public templates plus this
 * workspace's own `workspace`-visibility templates, most-used first. RLS also
 * permits templates the user authored, but the dashboard intentionally surfaces
 * only shared/public starters.
 */
export async function getWorkspaceTemplates(
  workspaceId: string,
  limit = 6,
): Promise<TemplateSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("templates")
    .select("id, title, description, discipline, standard, thumbnail_url, content")
    .or(
      `visibility.eq.public,and(workspace_id.eq.${workspaceId},visibility.eq.workspace)`,
    )
    .order("usage_count", { ascending: false })
    .limit(limit);
  return data ?? [];
}
