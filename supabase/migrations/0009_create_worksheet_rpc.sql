-- ---------------------------------------------------------------------------
-- Worksheet creation via a SECURITY DEFINER RPC
--
-- Creating a worksheet through a direct `insert` requires the user's JWT to
-- reach PostgREST so `worksheets_insert` (`created_by = auth.uid()` AND an
-- owner/admin/engineer role) passes. In our Next.js Server Action runtime the
-- supabase-js write POST did not carry that token — reads were authenticated,
-- but the insert arrived as `anon` (auth.uid() null) and RLS rejected it (42501)
-- even for owners/admins.
--
-- This function runs as definer so the insert bypasses that RLS WITH CHECK, but
-- it still authorizes the caller explicitly: a non-null auth.uid() and an
-- owner/admin/engineer role in the target workspace. The Server Action calls it
-- over a raw fetch with `Authorization: Bearer <jwt>` (see `rpcAsUser`) so the
-- token reliably reaches Postgres. Distinct SQLSTATEs let the app tell apart
-- "session lost" (28000) from "insufficient role" (42501).
-- ---------------------------------------------------------------------------
create or replace function public.create_worksheet(
  p_workspace_id uuid,
  p_project_id uuid default null,
  p_title text default 'Untitled worksheet',
  p_content jsonb default '{"version":1,"rows":[]}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_role workspace_role;
  v_id   uuid;
begin
  if v_uid is null then
    raise exception 'create_worksheet: auth.uid() is null (request not authenticated)'
      using errcode = '28000';
  end if;

  v_role := public.member_role(p_workspace_id);
  if v_role is null or v_role not in ('owner','admin','engineer') then
    raise exception 'create_worksheet: insufficient role (%)', coalesce(v_role::text, 'none')
      using errcode = '42501';
  end if;

  insert into public.worksheets (workspace_id, project_id, title, content, owner_id, created_by)
  values (
    p_workspace_id,
    p_project_id,
    coalesce(nullif(p_title, ''), 'Untitled worksheet'),
    coalesce(p_content, '{"version":1,"rows":[]}'::jsonb),
    v_uid,
    v_uid
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_worksheet(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.create_worksheet(uuid, uuid, text, jsonb) to authenticated;
