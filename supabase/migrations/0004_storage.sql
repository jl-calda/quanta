-- ============================================================================
-- Quanta — Foundation (M1): storage buckets + object policies
--
-- Buckets (Func §1):
--   avatars             public-read; a user writes only their own (path = uid/…)
--   worksheet-images    private; RLS by workspace (path = workspace_id/…)
--   template-thumbnails public-read; members of the owning workspace write
--   exports             private; signed URLs only, members read (path = ws_id/…)
--
-- Convention: the FIRST path segment is the owner id (user id for avatars,
-- workspace id otherwise), so policies can authorize on `storage.foldername()`.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('avatars',             'avatars',             true),
  ('worksheet-images',    'worksheet-images',    false),
  ('template-thumbnails', 'template-thumbnails', true),
  ('exports',             'exports',             false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- avatars — world-readable, self-writable
-- ---------------------------------------------------------------------------
create policy "avatars read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- worksheet-images — private, scoped to workspace membership by first segment
-- ---------------------------------------------------------------------------
create policy "worksheet-images read" on storage.objects for select to authenticated
  using (
    bucket_id = 'worksheet-images'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
create policy "worksheet-images write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'worksheet-images'
    and public.member_role(((storage.foldername(name))[1])::uuid) in ('owner','admin','engineer')
  );
create policy "worksheet-images update" on storage.objects for update to authenticated
  using (
    bucket_id = 'worksheet-images'
    and public.member_role(((storage.foldername(name))[1])::uuid) in ('owner','admin','engineer')
  );
create policy "worksheet-images delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'worksheet-images'
    and public.member_role(((storage.foldername(name))[1])::uuid) in ('owner','admin','engineer')
  );

-- ---------------------------------------------------------------------------
-- template-thumbnails — public-read, members of the owning workspace write
-- ---------------------------------------------------------------------------
create policy "template-thumbnails read" on storage.objects for select
  using (bucket_id = 'template-thumbnails');
create policy "template-thumbnails write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'template-thumbnails'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
create policy "template-thumbnails update" on storage.objects for update to authenticated
  using (
    bucket_id = 'template-thumbnails'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
create policy "template-thumbnails delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'template-thumbnails'
    and public.is_workspace_admin(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- exports — private; members read their workspace's artifacts (via signed URLs)
-- ---------------------------------------------------------------------------
create policy "exports read" on storage.objects for select to authenticated
  using (
    bucket_id = 'exports'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
create policy "exports write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exports'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
