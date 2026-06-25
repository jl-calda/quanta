-- ============================================================================
-- Quanta — Template curation (§4.4 Templates, Phase 2).
--
-- Adds the two columns that let a workspace admin *curate* its template gallery:
--   • is_featured  — promotes a template to the top of the gallery (replaces the
--                    old "featured == author_id IS NULL" heuristic the card used).
--   • archived_at  — soft-retires a template; restore is just `archived_at = null`
--                    (mirrors the `worksheets.deleted_at` idiom used elsewhere).
--
-- Curation is an admin-only editorial act. It can't ride `templates_update` RLS
-- (which also permits the *author*) because we want feature/archive locked to
-- workspace admins. The `set_template_curation` SECURITY DEFINER function below
-- re-checks `auth.uid()` + `is_workspace_admin(workspace_id)` itself — the same
-- pattern as `increment_template_usage` (0007) and `create_worksheet` (0009).
--
-- RLS is unchanged: `templates_select` still returns archived rows, which is what
-- lets a curator see and restore them. Hiding archived from the default gallery
-- is a *query* concern (the reads add `archived_at is null`), not an RLS concern.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- columns
-- ---------------------------------------------------------------------------
alter table templates add column if not exists is_featured boolean not null default false;
alter table templates add column if not exists archived_at timestamptz;

-- Featured-first ordering on the gallery lists.
create index if not exists templates_featured_idx on templates (is_featured);
-- Hot path is the "active" gallery (archived_at is null) — a partial index keeps it lean.
create index if not exists templates_active_idx on templates (archived_at) where archived_at is null;

-- Preserve the current "Featured" look. Today featured == author_id IS NULL
-- (the Quanta-official public starters). Mark exactly those as is_featured so the
-- flame badge stays put when the card flips to reading the column.
update templates
   set is_featured = true
 where author_id is null
   and visibility = 'public'
   and is_featured = false;

-- ---------------------------------------------------------------------------
-- admins-only curation (feature / archive / restore)
-- ---------------------------------------------------------------------------
-- A single SECURITY DEFINER surface; null args are no-ops (coalesce), so feature
-- and archive are independent and composable. Global/public starters
-- (workspace_id is null) belong to no workspace, so no workspace admin may curate
-- them — those calls are rejected with 42501, mapped to the app's voice by the
-- caller. The pinned search_path matches the other definer functions.
create or replace function public.set_template_curation(
  p_template_id uuid,
  p_is_featured boolean default null,
  p_archived    boolean default null
) returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_ws uuid;
begin
  if auth.uid() is null then
    raise exception 'set_template_curation: not authenticated' using errcode = '28000';
  end if;

  select workspace_id into v_ws from templates where id = p_template_id;
  if not found then
    raise exception 'set_template_curation: template not found' using errcode = 'P0002';
  end if;

  -- Only workspace-scoped templates are curatable by a workspace admin.
  if v_ws is null then
    raise exception 'set_template_curation: global templates are not curatable' using errcode = '42501';
  end if;
  if not public.is_workspace_admin(v_ws) then
    raise exception 'set_template_curation: insufficient role' using errcode = '42501';
  end if;

  update templates
     set is_featured = coalesce(p_is_featured, is_featured),
         archived_at = case
                         when p_archived is null then archived_at
                         when p_archived then coalesce(archived_at, now())
                         else null
                       end
   where id = p_template_id;
end;
$$;

revoke execute on function public.set_template_curation(uuid, boolean, boolean) from public, anon;
grant  execute on function public.set_template_curation(uuid, boolean, boolean) to authenticated;
