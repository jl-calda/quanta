-- ============================================================================
-- Quanta — Seed public starter templates (§4.2 Dashboard).
--
-- The dashboard's "Start from a template" row and the brand-new-account empty
-- state suggest pre-built calcs. These global starters are workspace-agnostic
-- (workspace_id is null) and public, so every tenant sees them; `templates_select`
-- already permits `visibility = 'public'`. Migrations run as the table owner and
-- bypass RLS, so the direct insert is fine.
--
-- Content is a minimal valid worksheet tree (`{version:1, rows:[]}`) for now —
-- the editor milestone will flesh these out with real region trees. Idempotent
-- via a stable title guard so re-running the migration set won't duplicate rows.
-- ============================================================================

insert into templates (title, description, discipline, standard, content, visibility)
select v.title, v.description, v.discipline, v.standard,
       '{"version":1,"rows":[]}'::jsonb, 'public'
from (values
  ('Lifeline span deflection',
   'Mid-span deflection of a horizontal lifeline under a fall arrest load.',
   'Fall protection', 'EN 795'),
  ('Guardrail point-load check',
   'Top-rail and post check for a concentrated horizontal point load.',
   'Barriers', 'AS 1657'),
  ('Bolt group capacity',
   'Eccentric shear on a bolt group via the elastic (vector) method.',
   'Connections', 'Eurocode 3'),
  ('Beam UDL — moment & shear',
   'Simply-supported beam under a uniformly distributed load: M, V, deflection.',
   'Beams', 'Eurocode 3'),
  ('Anchor pull-out (concrete)',
   'Concrete cone breakout capacity for a single cast-in anchor.',
   'Anchors', 'ETAG 001'),
  ('Ladder cage loading',
   'Rung and stringer check for a fixed ladder with a cage.',
   'Access', 'OSHA 1910')
) as v(title, description, discipline, standard)
where not exists (
  select 1 from templates t
  where t.visibility = 'public'
    and t.workspace_id is null
    and t.title = v.title
);
