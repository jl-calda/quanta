-- ============================================================================
-- Quanta — Template gallery support (§4.4 Templates).
--
-- Adds the `type` facet the gallery filters on (discipline/standard/type), and a
-- SECURITY DEFINER helper to bump `usage_count` when a template is used. The
-- bump can't go through `templates_update` RLS: a member using a *public*
-- template is neither its author nor a workspace admin, so a plain UPDATE would
-- match no row. The function instead scopes its write to templates the caller is
-- allowed to *see* (same predicate as `templates_select`), so it can only ever
-- increment a count the user could already read.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- type facet
-- ---------------------------------------------------------------------------
alter table templates add column if not exists template_type text;
create index if not exists templates_type_idx on templates (template_type);

-- Backfill the public starter templates with a sensible type so the gallery's
-- Type filter has data to group on (values mirror the design's facet family).
update templates set template_type = v.type
from (values
  ('Lifeline span deflection',   'Member check'),
  ('Guardrail point-load check', 'Loading'),
  ('Bolt group capacity',        'Connection'),
  ('Beam UDL — moment & shear',  'Member check'),
  ('Anchor pull-out (concrete)', 'Connection'),
  ('Ladder cage loading',        'Loading')
) as v(title, type)
where templates.title = v.title
  and templates.visibility = 'public'
  and templates.workspace_id is null
  and templates.template_type is null;

-- ---------------------------------------------------------------------------
-- usage_count bump (used by "Use template")
-- ---------------------------------------------------------------------------
create or replace function public.increment_template_usage(tpl uuid)
returns void
language sql volatile security definer set search_path = public
as $$
  update templates
     set usage_count = usage_count + 1
   where id = tpl
     and (
       visibility = 'public'
       or author_id = auth.uid()
       or (workspace_id is not null and public.is_member(workspace_id))
     );
$$;

grant execute on function public.increment_template_usage(uuid) to authenticated;
