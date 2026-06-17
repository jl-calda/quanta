-- ============================================================================
-- Quanta — Foundation (M1): RLS helper functions + policies
--
-- Philosophy (CLAUDE.md / Func §1): RLS on EVERY table is the source of truth;
-- the UI gates by role on top. Helpers are SECURITY DEFINER so a policy can read
-- membership/role without recursing through the very policies being evaluated.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, locked search_path)
-- ---------------------------------------------------------------------------

-- Active membership of the current user in workspace `ws`.
create or replace function public.is_member(ws uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

-- Current user's workspace role (null if not an active member).
create or replace function public.member_role(ws uuid)
returns workspace_role
language sql stable security definer set search_path = public
as $$
  select m.role from workspace_members m
  where m.workspace_id = ws
    and m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

-- Owner/admin of the workspace.
create or replace function public.is_workspace_admin(ws uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.member_role(ws) in ('owner','admin');
$$;

-- Do the current user and `other` share any active workspace? (drives profile
-- visibility without recursing on workspace_members policies.)
create or replace function public.shares_workspace_with(other uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from workspace_members me
    join workspace_members them on them.workspace_id = me.workspace_id
    where me.user_id = auth.uid() and me.status = 'active'
      and them.user_id = other and them.status = 'active'
  );
$$;

-- Rank worksheet roles so we can take the strongest of several grants.
create or replace function public.worksheet_role_rank(r worksheet_role)
returns int
language sql immutable
as $$
  select case r
    when 'owner' then 4
    when 'editor' then 3
    when 'commenter' then 2
    when 'viewer' then 1
    else 0 end;
$$;

-- Effective worksheet role for the current user = strongest of:
--   • the workspace-role → worksheet-role baseline mapping, and
--   • an explicit collaborator grant on the worksheet.
-- Returns null when the user has no access at all.
create or replace function public.worksheet_effective_role(sheet uuid)
returns worksheet_role
language plpgsql stable security definer set search_path = public
as $$
declare
  ws       uuid;
  ws_role  workspace_role;
  base     worksheet_role;
  granted  worksheet_role;
begin
  select workspace_id into ws from worksheets where id = sheet;
  if ws is null then
    return null;
  end if;

  ws_role := public.member_role(ws);
  base := case ws_role
    when 'owner'    then 'owner'::worksheet_role
    when 'admin'    then 'owner'::worksheet_role
    when 'engineer' then 'editor'::worksheet_role
    when 'reviewer' then 'commenter'::worksheet_role
    when 'viewer'   then 'viewer'::worksheet_role
    else null end;  -- 'billing' and non-members get no baseline

  select role into granted
  from worksheet_collaborators
  where worksheet_id = sheet and user_id = auth.uid()
  order by public.worksheet_role_rank(role) desc
  limit 1;

  if base is null then
    return granted;
  elsif granted is null then
    return base;
  elsif public.worksheet_role_rank(granted) > public.worksheet_role_rank(base) then
    return granted;
  else
    return base;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table profiles                enable row level security;
alter table workspaces              enable row level security;
alter table workspace_members       enable row level security;
alter table projects                enable row level security;
alter table worksheets              enable row level security;
alter table worksheet_versions      enable row level security;
alter table worksheet_collaborators enable row level security;
alter table comments                enable row level security;
alter table templates               enable row level security;
alter table tags                    enable row level security;
alter table worksheet_tags          enable row level security;
alter table unit_systems            enable row level security;
alter table audit_log               enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or public.shares_workspace_with(id));
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- INSERT happens in the SECURITY DEFINER sign-up trigger; allow self-insert too.
create policy profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
create policy workspaces_select on workspaces for select to authenticated
  using (public.is_member(id));
create policy workspaces_insert on workspaces for insert to authenticated
  with check (owner_id = auth.uid());            -- first-run / create workspace
create policy workspaces_update on workspaces for update to authenticated
  using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));
create policy workspaces_delete on workspaces for delete to authenticated
  using (public.member_role(id) = 'owner');

-- ---------------------------------------------------------------------------
-- workspace_members
-- ---------------------------------------------------------------------------
create policy workspace_members_select on workspace_members for select to authenticated
  using (public.is_member(workspace_id) or user_id = auth.uid());
-- Admins invite/add members; the workspace creator may add themselves as the
-- first (owner) member during first-run bootstrap.
create policy workspace_members_insert on workspace_members for insert to authenticated
  with check (
    public.is_workspace_admin(workspace_id)
    or (
      user_id = auth.uid()
      and exists (select 1 from workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
    )
  );
create policy workspace_members_update on workspace_members for update to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));
create policy workspace_members_delete on workspace_members for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create policy projects_select on projects for select to authenticated
  using (public.is_member(workspace_id));
create policy projects_insert on projects for insert to authenticated
  with check (public.member_role(workspace_id) in ('owner','admin','engineer'));
create policy projects_update on projects for update to authenticated
  using (public.member_role(workspace_id) in ('owner','admin','engineer'))
  with check (public.member_role(workspace_id) in ('owner','admin','engineer'));
create policy projects_delete on projects for delete to authenticated
  using (public.member_role(workspace_id) in ('owner','admin','engineer'));

-- ---------------------------------------------------------------------------
-- worksheets
-- ---------------------------------------------------------------------------
create policy worksheets_select on worksheets for select to authenticated
  using (public.worksheet_effective_role(id) is not null);
create policy worksheets_insert on worksheets for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.member_role(workspace_id) in ('owner','admin','engineer')
  );
-- Editors/owners may edit (incl. soft-delete via deleted_at).
create policy worksheets_update on worksheets for update to authenticated
  using (public.worksheet_effective_role(id) in ('owner','editor'))
  with check (public.worksheet_effective_role(id) in ('owner','editor'));
-- Hard delete is reserved for the sheet owner or a workspace admin.
create policy worksheets_delete on worksheets for delete to authenticated
  using (
    public.worksheet_effective_role(id) = 'owner'
    or public.is_workspace_admin(workspace_id)
  );

-- ---------------------------------------------------------------------------
-- worksheet_versions
-- ---------------------------------------------------------------------------
create policy worksheet_versions_select on worksheet_versions for select to authenticated
  using (public.worksheet_effective_role(worksheet_id) is not null);
create policy worksheet_versions_insert on worksheet_versions for insert to authenticated
  with check (public.worksheet_effective_role(worksheet_id) in ('owner','editor'));

-- ---------------------------------------------------------------------------
-- worksheet_collaborators
-- ---------------------------------------------------------------------------
create policy worksheet_collaborators_select on worksheet_collaborators for select to authenticated
  using (
    user_id = auth.uid()
    or public.worksheet_effective_role(worksheet_id) is not null
  );
-- Only the sheet owner or a workspace admin manages grants.
create policy worksheet_collaborators_write on worksheet_collaborators for all to authenticated
  using (
    public.worksheet_effective_role(worksheet_id) = 'owner'
    or public.is_workspace_admin((select workspace_id from worksheets w where w.id = worksheet_id))
  )
  with check (
    public.worksheet_effective_role(worksheet_id) = 'owner'
    or public.is_workspace_admin((select workspace_id from worksheets w where w.id = worksheet_id))
  );

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------
create policy comments_select on comments for select to authenticated
  using (public.worksheet_effective_role(worksheet_id) is not null);
create policy comments_insert on comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.worksheet_effective_role(worksheet_id) in ('owner','editor','commenter')
  );
create policy comments_update on comments for update to authenticated
  using (
    author_id = auth.uid()
    or public.worksheet_effective_role(worksheet_id) = 'owner'
  )
  with check (
    author_id = auth.uid()
    or public.worksheet_effective_role(worksheet_id) = 'owner'
  );
create policy comments_delete on comments for delete to authenticated
  using (
    author_id = auth.uid()
    or public.worksheet_effective_role(worksheet_id) = 'owner'
  );

-- ---------------------------------------------------------------------------
-- templates
-- ---------------------------------------------------------------------------
create policy templates_select on templates for select to authenticated
  using (
    visibility = 'public'
    or author_id = auth.uid()
    or (workspace_id is not null and public.is_member(workspace_id))
  );
create policy templates_insert on templates for insert to authenticated
  with check (
    author_id = auth.uid()
    and (workspace_id is null or public.is_member(workspace_id))
  );
create policy templates_update on templates for update to authenticated
  using (
    author_id = auth.uid()
    or (workspace_id is not null and public.is_workspace_admin(workspace_id))
  )
  with check (
    author_id = auth.uid()
    or (workspace_id is not null and public.is_workspace_admin(workspace_id))
  );
create policy templates_delete on templates for delete to authenticated
  using (
    author_id = auth.uid()
    or (workspace_id is not null and public.is_workspace_admin(workspace_id))
  );

-- ---------------------------------------------------------------------------
-- tags + worksheet_tags
-- ---------------------------------------------------------------------------
create policy tags_select on tags for select to authenticated
  using (public.is_member(workspace_id));
create policy tags_write on tags for all to authenticated
  using (public.member_role(workspace_id) in ('owner','admin','engineer'))
  with check (public.member_role(workspace_id) in ('owner','admin','engineer'));

create policy worksheet_tags_select on worksheet_tags for select to authenticated
  using (public.worksheet_effective_role(worksheet_id) is not null);
create policy worksheet_tags_write on worksheet_tags for all to authenticated
  using (public.worksheet_effective_role(worksheet_id) in ('owner','editor'))
  with check (public.worksheet_effective_role(worksheet_id) in ('owner','editor'));

-- ---------------------------------------------------------------------------
-- unit_systems
-- ---------------------------------------------------------------------------
create policy unit_systems_select on unit_systems for select to authenticated
  using (public.is_member(workspace_id));
create policy unit_systems_write on unit_systems for all to authenticated
  using (public.member_role(workspace_id) in ('owner','admin','engineer'))
  with check (public.member_role(workspace_id) in ('owner','admin','engineer'));

-- ---------------------------------------------------------------------------
-- audit_log — readable by members, append-only, no update/delete policy
-- ---------------------------------------------------------------------------
create policy audit_log_select on audit_log for select to authenticated
  using (public.is_member(workspace_id));
create policy audit_log_insert on audit_log for insert to authenticated
  with check (actor_id = auth.uid() and public.is_member(workspace_id));
