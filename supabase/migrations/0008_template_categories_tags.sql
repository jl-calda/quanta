-- ============================================================================
-- Quanta — Template gallery: categories & tags (§4.4 Templates, Phase 2).
--
-- Rounds out the gallery's filter facets. Discipline / Standard / Type already
-- exist (see 0007); this adds a single-value `category` grouping and a
-- multi-value `tags` array, both filterable. They live as columns on the
-- existing `templates` table — no new entity/table — exactly mirroring how 0007
-- added `template_type`. Tags are a Postgres text[] (queried with @> via a GIN
-- index), so a junction table isn't needed.
--
-- RLS is unchanged: adding columns doesn't alter row visibility, and the
-- existing `templates_*` policies still gate every read/write server-side.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- category + tags facets
-- ---------------------------------------------------------------------------
alter table templates add column if not exists category text;
alter table templates add column if not exists tags text[] not null default '{}';

create index if not exists templates_category_idx on templates (category);
create index if not exists templates_tags_idx on templates using gin (tags);

-- Backfill the public starter templates so the new Category / Tag filters have
-- data to group on in a fresh or demo database (same match shape as 0007).
update templates set category = v.category, tags = v.tags
from (values
  ('Lifeline span deflection',   'Structural',  array['deflection','serviceability','span']),
  ('Guardrail point-load check', 'Structural',  array['guardrail','point load','safety']),
  ('Bolt group capacity',        'Connections', array['bolt','steel','capacity']),
  ('Beam UDL — moment & shear',  'Structural',  array['beam','udl','moment','shear']),
  ('Anchor pull-out (concrete)', 'Connections', array['anchor','concrete','pull-out']),
  ('Ladder cage loading',        'Access',      array['ladder','loading','access'])
) as v(title, category, tags)
where templates.title = v.title
  and templates.visibility = 'public'
  and templates.workspace_id is null
  and templates.category is null;
