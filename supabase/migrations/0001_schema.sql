-- ============================================================================
-- Quanta — Foundation (M1): schema + enums
--
-- Multi-tenant by `workspace_id`. Every domain row is owned by a workspace and
-- access is gated by RLS (see 0002_rls.sql). This file only defines structure;
-- helper functions, policies, and triggers live in the later migrations.
-- ============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()
create extension if not exists "pg_trgm";  -- trigram search on title/tags

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type workspace_role as enum ('owner','admin','engineer','reviewer','viewer','billing');
create type worksheet_role as enum ('owner','editor','commenter','viewer');
create type calc_mode      as enum ('auto','manual');
create type units_system   as enum ('si','uscs','cgs','custom');
create type calc_status    as enum ('current','stale','error');
create type share_scope    as enum ('restricted','workspace','link');
create type member_status  as enum ('active','invited','suspended');

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users user (created by trigger on sign-up)
-- ---------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  full_name    text,
  title        text,
  avatar_url   text,
  -- per-user appearance / editor preferences (theme, density, keymap, formatting)
  preferences  jsonb not null default '{}',
  -- route the user back to where they were on next sign-in (§4.1)
  last_workspace_id uuid,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- workspaces — the tenant
-- ---------------------------------------------------------------------------
create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  owner_id   uuid references profiles,
  plan       text not null default 'free',
  seats      int  not null default 5,
  branding   jsonb not null default '{}',
  -- workspace-level defaults applied to NEW worksheets (§4.7)
  settings   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- profiles.last_workspace_id references workspaces (added here to break the
-- circular dependency between profiles and workspaces).
alter table profiles
  add constraint profiles_last_workspace_fkey
  foreign key (last_workspace_id) references workspaces on delete set null;

-- ---------------------------------------------------------------------------
-- workspace_members — membership + role + invite state
--
-- Deviation from the brief's composite PK (workspace_id, user_id): a surrogate
-- `id` PK with a NULLable `user_id` is used so an *invited* row can exist before
-- the invitee has an account. On sign-in the bootstrap trigger fills `user_id`
-- and flips status to 'active' (invite acceptance, §4.1). Uniqueness is kept by
-- explicit constraints below.
-- ---------------------------------------------------------------------------
create table workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces on delete cascade,
  user_id       uuid references profiles on delete cascade,
  role          workspace_role not null default 'engineer',
  status        member_status  not null default 'active',
  invited_email text,
  invited_by    uuid references profiles,
  created_at    timestamptz not null default now()
);

-- one membership per (workspace, user)
create unique index workspace_members_ws_user_key
  on workspace_members (workspace_id, user_id)
  where user_id is not null;

-- one pending invite per (workspace, email)
create unique index workspace_members_ws_invite_key
  on workspace_members (workspace_id, lower(invited_email))
  where user_id is null and invited_email is not null;

create index workspace_members_user_idx on workspace_members (user_id);
create index workspace_members_invited_email_idx on workspace_members (lower(invited_email));

-- ---------------------------------------------------------------------------
-- projects — folders, nestable
-- ---------------------------------------------------------------------------
create table projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  parent_id    uuid references projects on delete cascade,
  name         text not null,
  created_by   uuid references profiles,
  created_at   timestamptz not null default now()
);
create index projects_workspace_idx on projects (workspace_id);
create index projects_parent_idx on projects (parent_id);

-- ---------------------------------------------------------------------------
-- worksheets — the document; content is the JSONB tree (rows → cells → regions)
-- ---------------------------------------------------------------------------
create table worksheets (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces on delete cascade,
  project_id    uuid references projects on delete set null,
  title         text not null default 'Untitled',
  content       jsonb not null default '{"version":1,"rows":[]}',
  calc_mode     calc_mode    not null default 'auto',
  units_system  units_system not null default 'si',
  custom_unit_system_id uuid,
  page_settings   jsonb not null default '{}',
  layout_settings jsonb not null default '{}',
  calc_status   calc_status not null default 'current',
  error_count   int  not null default 0,
  owner_id      uuid references profiles,
  created_by    uuid references profiles,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz   -- soft delete → Trash
);
create index worksheets_workspace_idx on worksheets (workspace_id);
create index worksheets_project_idx on worksheets (project_id);
create index worksheets_updated_idx on worksheets (workspace_id, updated_at desc);
create index worksheets_title_trgm_idx on worksheets using gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- worksheet_versions — content snapshots
-- ---------------------------------------------------------------------------
create table worksheet_versions (
  id           uuid primary key default gen_random_uuid(),
  worksheet_id uuid not null references worksheets on delete cascade,
  content      jsonb not null,
  label        text,
  summary      jsonb,
  created_by   uuid references profiles,
  created_at   timestamptz not null default now()
);
create index worksheet_versions_sheet_idx on worksheet_versions (worksheet_id, created_at desc);

-- ---------------------------------------------------------------------------
-- worksheet_collaborators — per-worksheet grants + link sharing
-- ---------------------------------------------------------------------------
create table worksheet_collaborators (
  id            uuid primary key default gen_random_uuid(),
  worksheet_id  uuid not null references worksheets on delete cascade,
  user_id       uuid references profiles on delete cascade,
  invited_email text,
  role          worksheet_role not null default 'viewer',
  share_scope   share_scope    not null default 'restricted',
  link_token    text unique,
  created_at    timestamptz not null default now()
);
create unique index worksheet_collaborators_sheet_user_key
  on worksheet_collaborators (worksheet_id, user_id)
  where user_id is not null;
create index worksheet_collaborators_user_idx on worksheet_collaborators (user_id);

-- ---------------------------------------------------------------------------
-- comments — anchored to a region id inside content
-- ---------------------------------------------------------------------------
create table comments (
  id           uuid primary key default gen_random_uuid(),
  worksheet_id uuid not null references worksheets on delete cascade,
  region_id    text not null,
  author_id    uuid references profiles,
  body         text not null,
  parent_id    uuid references comments on delete cascade,
  resolved     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index comments_sheet_idx on comments (worksheet_id);

-- ---------------------------------------------------------------------------
-- templates — workspace_id null = public/global
-- ---------------------------------------------------------------------------
create table templates (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  title        text not null,
  description  text,
  discipline   text,
  standard     text,
  content      jsonb not null,
  thumbnail_url text,
  visibility   text not null default 'private', -- private | workspace | public
  author_id    uuid references profiles,
  usage_count  int  not null default 0,
  created_at   timestamptz not null default now()
);
create index templates_workspace_idx on templates (workspace_id);
create index templates_visibility_idx on templates (visibility);

-- ---------------------------------------------------------------------------
-- tags + worksheet_tags
-- ---------------------------------------------------------------------------
create table tags (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name         text not null
);
create unique index tags_workspace_name_key on tags (workspace_id, lower(name));

create table worksheet_tags (
  worksheet_id uuid not null references worksheets on delete cascade,
  tag_id       uuid not null references tags on delete cascade,
  primary key (worksheet_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- unit_systems — user-defined custom unit systems (reference data ships in code)
-- ---------------------------------------------------------------------------
create table unit_systems (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name         text not null,
  mapping      jsonb not null, -- {length:'mm', force:'kN', ...}
  created_by   uuid references profiles,
  created_at   timestamptz not null default now()
);
create index unit_systems_workspace_idx on unit_systems (workspace_id);

-- worksheets.custom_unit_system_id references unit_systems (added here because
-- unit_systems is declared after worksheets).
alter table worksheets
  add constraint worksheets_custom_unit_system_fkey
  foreign key (custom_unit_system_id) references unit_systems on delete set null;

-- ---------------------------------------------------------------------------
-- audit_log — append-only activity (shares, role changes, deletes, exports …)
-- ---------------------------------------------------------------------------
create table audit_log (
  id          bigserial primary key,
  workspace_id uuid references workspaces on delete cascade,
  actor_id    uuid references profiles,
  action      text,
  target_type text,
  target_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_workspace_idx on audit_log (workspace_id, created_at desc);
