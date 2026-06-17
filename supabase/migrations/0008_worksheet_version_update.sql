-- ---------------------------------------------------------------------------
-- Version history — "Name this version"
--
-- worksheet_versions previously carried only SELECT + INSERT policies, so RLS
-- denied every UPDATE. Naming a version (updating its `label`) needs an UPDATE
-- policy; gate it to the same owner/editor role that may insert a version.
-- ---------------------------------------------------------------------------
create policy worksheet_versions_update on worksheet_versions for update to authenticated
  using (public.worksheet_effective_role(worksheet_id) in ('owner','editor'))
  with check (public.worksheet_effective_role(worksheet_id) in ('owner','editor'));
