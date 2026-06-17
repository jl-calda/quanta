# Decisions

Running log of non-obvious choices, per CLAUDE.md. Newest first.

## M2 — Calc engine (core pipeline)

- **Scope: the deterministic main-thread pipeline only.** Parse → dependency
  graph → topo sort → dirty-track → recalc (Auto/Manual/recalc-to-here), plus
  result formatting, show-steps, conditional formatting, and the typed error
  model. Tables, solve blocks, and SymPy/NumPy (Pyodide) stay on their existing
  worker stubs — deferred to later milestones.
- **The engine consumes a flat, reading-order region list, not the JSONB tree.**
  `evaluateSheet(RegionInput[])` / `CalcEngine` take regions already flattened
  into reading order (`{ id, source, unit?, format?, conditional?, … }`). The
  `worksheets.content` Zod schema + the rows→cells→regions flattener come with
  the editor milestone; this keeps `/lib/calc` decoupled and pure.
- **One unified typed error model (`CalcError.kind`).** The seed's 4-code
  `CalcErrorCode` was replaced by the §2 `kind` union
  (`unit-mismatch|undefined|defined-later|cycle|parse|domain|singular|no-solution`)
  with `message`/`fixHint`/`span`. `evaluate()` now returns `kind` too — one
  model, not two parallel ones. A `CalcEngineError` lets inner layers (e.g. the
  formatter) raise a precise typed error the orchestrator surfaces verbatim.
- **Defined names shadow units (the single-letter problem).** Many engineering
  variables (`b`, `h`, `t`, `g`, `d`, `s`, `m`…) are also mathjs unit names, so
  `collectDeps` keeps *all* non-callee symbols; `filterUnitLiterals(deps,
  definedNames)` then drops only references that no region defines AND that
  mathjs recognizes as units. mathjs scope already shadows units at eval time, so
  a defined `b` resolves to its value, not "bit". This is what makes
  cross-region dependencies on short-named variables work at all.
- **Cycle detection vs. reading order.** Reading-order visibility ("defined above
  or to the left") yields `defined-later`/`undefined`; a separate Tarjan SCC over
  the resolved edges catches true cycles (`a → b → a`) and self-reference. Topo
  sort (Kahn) breaks ties by reading-order index, so evaluation order — and every
  result — is deterministic across client, worker, and Node.
- **Display-unit mapping is a preferred-unit list, tried in order.** SI defaults
  (`kN, MPa, kN·m, mm²…`) are matched by `equalBase`; the first dimensional match
  wins, else mathjs's own choice stands. A per-region target `unit` overrides.
  Note: mathjs cannot distinguish moment from energy dimensionally (both
  force·length), so moments rely on the region's target unit — documented as a
  known seam, not a bug.
- **`CalcEngine` is incremental but the pure core does the work.** It caches
  parsed ASTs by `id`+`source`, marks an edited region + transitive dependents
  dirty, and supports Auto (recompute now) / Manual (leave visibly stale) /
  recalc-to-here (commit only the prefix). Debouncing lives in the UI; the engine
  stays synchronous and pure so Node/worker/client results are identical.

## M1 — Data layer (Supabase schema + RLS + Auth)

- **Schema/RLS/triggers live as SQL migrations in `supabase/migrations/`,
  not applied to a live project.** The container is ephemeral and no project is
  linked, so the deliverable is versioned DDL (`0001_schema` → `0004_storage`)
  runnable via `supabase db reset` / `db push`. The hand-authored `Database`
  type in `lib/supabase/types.ts` mirrors it (regenerate with `supabase gen
  types` once linked).
- **`workspace_members` uses a surrogate `id` PK with a NULLable `user_id`,**
  not the brief's composite `(workspace_id, user_id)`. An *invited* row must
  exist before the invitee has an account; nullable `user_id` + partial unique
  indexes (one membership per user, one pending invite per email) make invite
  acceptance a simple `UPDATE` in the sign-up trigger. Documented inline in the
  migration.
- **First-workspace bootstrap is in the `handle_new_user` trigger.** On
  `auth.users` insert it (1) creates the profile, (2) accepts any pending
  invites matching the email (dropping dupes for workspaces already joined),
  and (3) only if the user has no membership at all, creates a default
  "{name}'s workspace" with a unique generated slug and an owner membership,
  then sets `profiles.last_workspace_id`. The §4.1 onboarding screen
  (`/onboarding`) is the explicit create/rename path and is skipped when a
  workspace already exists.
- **RLS helpers are `SECURITY DEFINER` with a locked `search_path`.**
  `is_member` / `member_role` / `is_workspace_admin` / `worksheet_effective_role`
  read membership without recursing through the very policies being evaluated.
  Effective worksheet role = strongest of the workspace-role→worksheet-role
  baseline mapping and an explicit collaborator grant (rank helper). `billing`
  gets no worksheet baseline.
- **A `protect_last_owner` trigger** blocks removing/demoting a workspace's last
  active owner (brief edge case) at the data layer, independent of UI.
- **`@supabase/ssr` bumped 0.5.2 → 0.12.0 (with `supabase-js` ^2.108).** ssr
  0.5.2's `createServerClient` was built against an older `supabase-js`
  `SupabaseClient` generic arity; against the resolved 2.108 it mistyped every
  `.insert/.update` as `never`. 0.12.0 peers `supabase-js@^2.108`, which fixed
  it. The `Database` type also needs `Views`/`CompositeTypes` as
  `{ [_ in never]: never }` (not `Record<string, never>`, which pollutes
  `keyof` and breaks `from()` overload resolution) plus declared
  `Relationships` for embedded selects.
- **Middleware protects `/app`, `/w`, `/worksheets`, `/onboarding`** and bounces
  signed-in users away from `/sign-in`/`/sign-up`, round-tripping the requested
  path via `?next=`. The root `middleware.ts` still passes through untouched
  until the Supabase env vars are set (scaffold builds with no secrets).
- **Auth surface = email/password + magic link + Google OAuth + SAML SSO**, all
  through `@supabase/ssr`. Session-establishing flows redirect server-side from
  the Server Action; magic link / email confirm land on Route Handlers
  (`/auth/confirm` verifies the OTP, `/auth/callback` exchanges the PKCE code).
  Errors are mapped to the app's voice, never raw provider strings.
- **Storage buckets seeded in a migration** (avatars, worksheet-images,
  template-thumbnails, exports) with object policies keyed on the first path
  segment (user id for avatars, workspace id otherwise) so membership helpers
  authorize reads/writes.

## M0 — Project scaffold

- **Tailwind v4 (CSS-first `@theme`), not v3 config.** The `_ds` design system is
  expressed entirely as CSS custom properties. Tailwind v4's `@theme inline`
  maps the semantic `_ds` variables onto Tailwind's token namespace, so utilities
  (`bg-paper`, `text-muted`, `border-hairline`, `font-math`, `text-20`) resolve
  through the same variables and follow `[data-theme="dark"]` at runtime. No
  `tailwind.config.*` is needed. `dark:` is registered as a `@custom-variant`
  bound to `[data-theme="dark"]` (attribute-driven, not OS `prefers-color-scheme`).
- **Density + theme persist in cookies, not `localStorage`.** CLAUDE.md forbids
  `localStorage`/`sessionStorage` in client components, and the reference
  `density.js` used `localStorage`. Cookies are read in the root layout (Server
  Component) and applied to `<html data-density data-theme>` on the first paint,
  so there is no flash. The client provider writes the cookie + sets the
  attribute on toggle. `<html suppressHydrationWarning>` covers the toggled
  attributes.
- **Fonts via `next/font` (self-hosted), not the Google Fonts `@import`.** Geist
  Sans/Mono come from the `geist` package, STIX Two Text from `next/font/google`.
  Each exposes a CSS variable (`--font-geist-sans`, `--font-geist-mono`,
  `--font-stix`) that is chained in front of the original `_ds` fallback stacks,
  so the `--font-sans/mono/math` tokens still resolve with no FOUT and no CDN
  dependency at runtime.
- **Pyodide loads from a CDN inside a classic Web Worker, lazily.** The wasm
  runtime is never bundled; it is fetched on first calculation via
  `importScripts(<cdn>/pyodide.js)`. A classic worker is used so `importScripts`
  is available across both the webpack (build) and Turbopack (dev) pipelines.
  Version is pinned in one constant (`PYODIDE_VERSION`) for easy bumps.
- **Supabase clients are constructed lazily and the env is read at call time.**
  `getSupabaseEnv()` only throws when a client is actually built without config,
  so the scaffold type-checks and builds with no secrets. The root middleware
  passes requests through untouched until the Supabase env vars are set; once
  set, it refreshes the auth session on every matched request.
- **The calc engine seed uses `mathjs` and is pure.** `evaluate()` lives in
  `/lib/calc`, has no I/O or global state, and is unit-tested first (units,
  mismatch, parse error, determinism). Symbolic algebra / heavy numeric work is
  delegated to the Pyodide worker in later milestones.
- **npm as the package manager** (no `pnpm`/`yarn` lockfile assumed on Windows).
- **Global reduced-motion guard in `globals.css`.** The `--dur-*` tokens are
  zeroed under `prefers-reduced-motion`, but components may use a hardcoded
  Tailwind `duration-*` utility that doesn't read those tokens. A global
  `@media (prefers-reduced-motion: reduce)` guard neutralizes animation/
  transition durations everywhere, so the binding CLAUDE.md motion rule holds
  regardless of how a component expresses its duration.
