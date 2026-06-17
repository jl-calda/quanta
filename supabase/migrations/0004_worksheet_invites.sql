-- ============================================================================
-- Quanta — Sharing (Func §3.8 / §4.8): claim pending worksheet invites on sign-up
--
-- M1's handle_new_user() claims pending *workspace* invites by email. Per-
-- worksheet sharing (the Shared page) can also invite people who don't have an
-- account yet: a `worksheet_collaborators` row with `invited_email` and a null
-- `user_id`. This migration extends handle_new_user() to claim those too, using
-- the same dedupe-then-attach pattern (respecting the
-- `worksheet_collaborators_sheet_user_key` unique index on (worksheet_id,
-- user_id)). The rest of the function is unchanged from 0003_triggers.sql.
-- ============================================================================

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

  -- 2) Accept any pending workspace invites addressed to this email. Drop
  --    invites for workspaces the user already belongs to, then claim the rest.
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

  -- 2b) Accept any pending worksheet shares addressed to this email. Drop
  --     invites for sheets the user already has a grant on (keeps the
  --     (worksheet_id, user_id) unique index satisfied), then claim the rest.
  delete from worksheet_collaborators c
  where c.user_id is null
    and lower(c.invited_email) = lower(new.email)
    and exists (
      select 1 from worksheet_collaborators e
      where e.worksheet_id = c.worksheet_id and e.user_id = new.id
    );

  update worksheet_collaborators
     set user_id = new.id, invited_email = null
   where user_id is null
     and lower(invited_email) = lower(new.email);

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
