-- ============================================================================
-- Quanta — Sign-up: seed the first workspace name from the user's company.
--
-- M1 (0003_triggers.sql) named the bootstrapped first workspace
-- "{display_name}'s workspace". The Sign in / Sign up screen collects an
-- optional Company, so when present, prefer it for the workspace name + slug.
-- This is an additive `create or replace`; the invite-acceptance path and the
-- profile bootstrap are unchanged.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  display_name text;
  company text;
  workspace_name text;
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
  company := nullif(trim(new.raw_user_meta_data->>'company'), '');

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
  --    Prefer the company name when supplied, else "{display_name}'s workspace".
  if accepted_count = 0
     and not exists (select 1 from workspace_members where user_id = new.id) then
    workspace_name := coalesce(company, display_name || '''s workspace');
    slug := public.generate_workspace_slug(coalesce(company, display_name));
    insert into workspaces (name, slug, owner_id)
    values (workspace_name, slug, new.id)
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
