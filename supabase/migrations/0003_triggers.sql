-- ============================================================================
-- Quanta — Foundation (M1): triggers & lifecycle functions
--
--  • handle_new_user   — on auth.users insert: create profile, accept pending
--                        invites by email, and bootstrap a first workspace.
--  • set_updated_at    — bump worksheets.updated_at on every update.
--  • protect_last_owner— never let a workspace lose its last active owner.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Unique slug helper — slugify the seed and append a numeric suffix on clash.
-- ---------------------------------------------------------------------------
create or replace function public.generate_workspace_slug(seed text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := regexp_replace(lower(coalesce(nullif(trim(seed), ''), 'workspace')), '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  if base = '' then
    base := 'workspace';
  end if;
  candidate := base;
  while exists (select 1 from workspaces where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n::text;
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- On sign-up: profile + invite acceptance + first-workspace bootstrap.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  display_name text;
  accepted_count int := 0;
  first_ws uuid;
  new_ws uuid;
  slug text;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- 1) Profile
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    display_name,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- 2) Accept any pending invites addressed to this email. Drop invites for
  --    workspaces the user already belongs to, then claim the rest.
  delete from workspace_members m
  where m.user_id is null
    and lower(m.invited_email) = lower(new.email)
    and exists (
      select 1 from workspace_members e
      where e.workspace_id = m.workspace_id and e.user_id = new.id
    );

  update workspace_members
     set user_id = new.id, status = 'active', invited_email = null
   where user_id is null
     and lower(invited_email) = lower(new.email);
  get diagnostics accepted_count = row_count;

  -- 3) Bootstrap a first workspace only if the user has no membership at all.
  if accepted_count = 0
     and not exists (select 1 from workspace_members where user_id = new.id) then
    slug := public.generate_workspace_slug(display_name);
    insert into workspaces (name, slug, owner_id)
    values (display_name || '''s workspace', slug, new.id)
    returning id into new_ws;

    insert into workspace_members (workspace_id, user_id, role, status)
    values (new_ws, new.id, 'owner', 'active');

    first_ws := new_ws;
  else
    select workspace_id into first_ws
    from workspace_members
    where user_id = new.id and status = 'active'
    order by created_at asc
    limit 1;
  end if;

  -- 4) Land the user in a workspace on next sign-in.
  update profiles set last_workspace_id = first_ws where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- worksheets.updated_at bump
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists worksheets_set_updated_at on worksheets;
create trigger worksheets_set_updated_at
  before update on worksheets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Never remove or demote the last active owner of a workspace.
-- ---------------------------------------------------------------------------
create or replace function public.protect_last_owner()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  ws uuid;
  remaining int;
begin
  ws := coalesce(old.workspace_id, new.workspace_id);

  -- Only guard transitions that remove an owner.
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active') then
    select count(*) into remaining
    from workspace_members
    where workspace_id = ws
      and role = 'owner'
      and status = 'active'
      and id <> old.id;
    if remaining = 0 then
      raise exception 'A workspace must keep at least one active owner.'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_members_protect_last_owner on workspace_members;
create trigger workspace_members_protect_last_owner
  before update or delete on workspace_members
  for each row execute function public.protect_last_owner();
