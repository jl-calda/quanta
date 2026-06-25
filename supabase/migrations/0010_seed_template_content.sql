-- ============================================================================
-- Quanta — Seed real content into the public starter templates (Phase 2).
--
-- 0006 seeded six public starters with an empty tree so the gallery had rows to
-- show; their thumbnails fell back to the procedural `TemplateThumb`. This fills
-- each with a small, engine-clean calc (heading + unit-aware math ending in a
-- green utilization check) so `ContentSnapshot` renders a REAL thumbnail across
-- the gallery, files grid and dashboard.
--
-- The JSON is generated from (and drift-guarded against) the typed source of
-- truth `lib/templates/starter-content.ts`. Idempotent + non-destructive: each
-- row is updated only while it still holds the empty 0006 tree, so re-running the
-- set never clobbers edits. Migrations run as table owner, bypassing RLS.
-- ============================================================================

update templates set content = '{"version":1,"rows":[{"id":"ll-row","columns":1,"cells":[{"regions":[{"id":"ll-h","indent":0,"type":"text","text":"Horizontal lifeline — mid-span sag","heading":3,"eyebrow":"EN 795 · fall arrest"},{"id":"ll-f","indent":0,"type":"math","source":"F := 6 kN","unit":"kN"},{"id":"ll-l","indent":0,"type":"math","source":"L := 10 m","unit":"m"},{"id":"ll-t","indent":0,"type":"math","source":"T := 20 kN","unit":"kN"},{"id":"ll-d","indent":0,"type":"math","source":"d := F * L / (4 * T)","unit":"mm"},{"id":"ll-dl","indent":0,"type":"math","source":"d_lim := 900 mm","unit":"mm"},{"id":"ll-ur","indent":0,"type":"math","source":"UR := d / d_lim","format":{"decimals":2},"conditional":[{"op":"<=","value":1,"style":{"color":"var(--status-pass)","fill":"var(--status-pass-bg)","label":"OK"}}]}]}]}]}'::jsonb
where title = 'Lifeline span deflection'
  and visibility = 'public'
  and workspace_id is null
  and content = '{"version":1,"rows":[]}'::jsonb;

update templates set content = '{"version":1,"rows":[{"id":"gr-row","columns":1,"cells":[{"regions":[{"id":"gr-h","indent":0,"type":"text","text":"Guardrail post — point load","heading":3,"eyebrow":"AS 1657 · barriers"},{"id":"gr-p","indent":0,"type":"math","source":"P := 1.5 kN","unit":"kN"},{"id":"gr-h2","indent":0,"type":"math","source":"h := 1.1 m","unit":"m"},{"id":"gr-m","indent":0,"type":"math","source":"M := P * h","unit":"kN m"},{"id":"gr-z","indent":0,"type":"math","source":"Z := 12000 mm^3","unit":"mm^3"},{"id":"gr-sig","indent":0,"type":"math","source":"sigma := M / Z","unit":"MPa"},{"id":"gr-fy","indent":0,"type":"math","source":"f_y := 250 MPa","unit":"MPa"},{"id":"gr-ur","indent":0,"type":"math","source":"UR := sigma / f_y","format":{"decimals":2},"conditional":[{"op":"<=","value":1,"style":{"color":"var(--status-pass)","fill":"var(--status-pass-bg)","label":"OK"}}]}]}]}]}'::jsonb
where title = 'Guardrail point-load check'
  and visibility = 'public'
  and workspace_id is null
  and content = '{"version":1,"rows":[]}'::jsonb;

update templates set content = '{"version":1,"rows":[{"id":"bg-row","columns":1,"cells":[{"regions":[{"id":"bg-h","indent":0,"type":"text","text":"Bolt group — eccentric shear","heading":3,"eyebrow":"Eurocode 3 · §3.12"},{"id":"bg-v","indent":0,"type":"math","source":"V_Ed := 84 kN","unit":"kN"},{"id":"bg-n","indent":0,"type":"math","source":"n := 6"},{"id":"bg-fv","indent":0,"type":"math","source":"F_v := V_Ed / n","unit":"kN"},{"id":"bg-frd","indent":0,"type":"math","source":"F_Rd := 60 kN","unit":"kN"},{"id":"bg-ur","indent":0,"type":"math","source":"UR := F_v / F_Rd","format":{"decimals":2},"conditional":[{"op":"<=","value":1,"style":{"color":"var(--status-pass)","fill":"var(--status-pass-bg)","label":"OK"}}]}]}]}]}'::jsonb
where title = 'Bolt group capacity'
  and visibility = 'public'
  and workspace_id is null
  and content = '{"version":1,"rows":[]}'::jsonb;

update templates set content = '{"version":1,"rows":[{"id":"bm-row","columns":1,"cells":[{"regions":[{"id":"bm-h","indent":0,"type":"text","text":"Simply-supported beam — UDL","heading":3,"eyebrow":"Eurocode 3 · §6.2"},{"id":"bm-w","indent":0,"type":"math","source":"w := 12 kN/m","unit":"kN/m"},{"id":"bm-l","indent":0,"type":"math","source":"L := 6 m","unit":"m"},{"id":"bm-m","indent":0,"type":"math","source":"M := w * L^2 / 8","unit":"kN m"},{"id":"bm-v","indent":0,"type":"math","source":"V := w * L / 2","unit":"kN"},{"id":"bm-mrd","indent":0,"type":"math","source":"M_Rd := 90 kN m","unit":"kN m"},{"id":"bm-ur","indent":0,"type":"math","source":"UR := M / M_Rd","format":{"decimals":2},"conditional":[{"op":"<=","value":1,"style":{"color":"var(--status-pass)","fill":"var(--status-pass-bg)","label":"OK"}}]}]}]}]}'::jsonb
where title = 'Beam UDL — moment & shear'
  and visibility = 'public'
  and workspace_id is null
  and content = '{"version":1,"rows":[]}'::jsonb;

update templates set content = '{"version":1,"rows":[{"id":"an-row","columns":1,"cells":[{"regions":[{"id":"an-h","indent":0,"type":"text","text":"Cast-in anchor — steel pull-out","heading":3,"eyebrow":"ETAG 001 · tension"},{"id":"an-as","indent":0,"type":"math","source":"A_s := 157 mm^2","unit":"mm^2"},{"id":"an-fu","indent":0,"type":"math","source":"f_uk := 500 MPa","unit":"MPa"},{"id":"an-nrd","indent":0,"type":"math","source":"N_Rd := 0.6 * A_s * f_uk","unit":"kN"},{"id":"an-ned","indent":0,"type":"math","source":"N_Ed := 18 kN","unit":"kN"},{"id":"an-ur","indent":0,"type":"math","source":"UR := N_Ed / N_Rd","format":{"decimals":2},"conditional":[{"op":"<=","value":1,"style":{"color":"var(--status-pass)","fill":"var(--status-pass-bg)","label":"OK"}}]}]}]}]}'::jsonb
where title = 'Anchor pull-out (concrete)'
  and visibility = 'public'
  and workspace_id is null
  and content = '{"version":1,"rows":[]}'::jsonb;

update templates set content = '{"version":1,"rows":[{"id":"ld-row","columns":1,"cells":[{"regions":[{"id":"ld-h","indent":0,"type":"text","text":"Fixed ladder rung — point load","heading":3,"eyebrow":"OSHA 1910 · access"},{"id":"ld-p","indent":0,"type":"math","source":"P := 1.33 kN","unit":"kN"},{"id":"ld-l","indent":0,"type":"math","source":"L := 400 mm","unit":"mm"},{"id":"ld-m","indent":0,"type":"math","source":"M := P * L / 4","unit":"kN m"},{"id":"ld-z","indent":0,"type":"math","source":"Z := 1800 mm^3","unit":"mm^3"},{"id":"ld-sig","indent":0,"type":"math","source":"sigma := M / Z","unit":"MPa"},{"id":"ld-fy","indent":0,"type":"math","source":"f_y := 250 MPa","unit":"MPa"},{"id":"ld-ur","indent":0,"type":"math","source":"UR := sigma / f_y","format":{"decimals":2},"conditional":[{"op":"<=","value":1,"style":{"color":"var(--status-pass)","fill":"var(--status-pass-bg)","label":"OK"}}]}]}]}]}'::jsonb
where title = 'Ladder cage loading'
  and visibility = 'public'
  and workspace_id is null
  and content = '{"version":1,"rows":[]}'::jsonb;
