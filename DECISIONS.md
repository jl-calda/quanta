# Decisions

Running log of non-obvious choices, per CLAUDE.md. Newest first.

## Dashboard / Home (Func §4.2)

- **The dashboard is a full app shell via a route group, not a bare page.** The
  `Dashboard.html` mockup is a two-pane shell (232px nav rail + 72px top bar) with
  no global chrome above it. `app/app/page.tsx` was `git mv`'d into a new
  `app/(app)/` route group (path-transparent → URL stays `/app`); `app/(app)/layout.tsx`
  owns the full-viewport `flex h-screen` shell + nav rail, and `/app` was added to
  `ConditionalAppBar`'s hide list so the global AppBar doesn't stack on top.
- **Theme + density toggles moved into the nav-rail user menu.** The dashboard top
  bar has no place for them (it carries greeting/search/New-worksheet), so the
  bottom user card opens a popover hosting `ThemeToggle`, `DensityToggle`, and
  `signOut` — keeping the preference controls reachable on every shell page.
- **`createWorksheet` returns `ok({id})` and the client navigates** (matches the
  `create-workspace-form` pattern), rather than calling server `redirect()` (which
  throws `NEXT_REDIRECT`). The split-button / template-card islands `router.push('/w/'+id)`.
- **Create is role-gated in the UI** because RLS `worksheets_insert` requires
  `member_role ∈ {owner,admin,engineer}`. The split-button is disabled with a
  tooltip for lower roles, and the action maps Postgres `42501` to an app-voice
  message — no silent failure.
- **A stub `/w/[id]` editor route** (user choice) renders the new sheet's title +
  "coming soon" so the create flow is verifiable now; it lives outside `(app)`
  (no nav rail) since the editor will own its own chrome later.
- **Search is a debounced client island → `searchWorksheets` server action →
  results popover**, not `?q=` URL filtering, so it overlays browse mode and stays
  interactive while reads remain server-side/RLS-scoped. Tags are matched via
  explicit tag→link→sheet id lookups (fully typed, RLS-safe) rather than a deep
  PostgREST embed; LIKE wildcards in the query are escaped.
- **MiniPreview is a deterministic placeholder** keyed off the worksheet/template
  id (`charSum % 4` over four ported sample calcs) using the server-safe DS math
  primitives — faithful to the "live-math moment" without blocking on the editor /
  calc engine. A guarded `content`-derived path is reserved for later.
- **Seeded six public starter templates** (user choice) in `0006_seed_templates.sql`
  (`workspace_id`/`author_id` null, `visibility = 'public'`, minimal valid content,
  idempotent) so the templates row + empty-state suggestions aren't blank on a
  fresh account. Template/owner queries narrow to active-workspace + public to
  avoid cross-tenant leakage; shared workspace read helpers are wrapped in React
  `cache()` so the layout and page share one fetch per request.

## Sign in / Sign up screen (Func §4.1)

- **The screen is the deliverable; the auth backend already shipped in M1.**
  Server actions (`server/actions/auth.ts`), Zod schemas (`lib/schema/auth.ts`),
  the PKCE/OTP route handlers, middleware gating, and the `handle_new_user`
  trigger were all in place. This task rebuilds the UI to match
  `mathcad-like/project/Sign in.html` 1:1 and wires in the two methods that had
  no front end yet (SAML SSO, password reset).
- **Ported the mockup as inline-style typed React over the DS components**, same
  approach M3 used for `_ds_bundle.js`: the split layout, dark brand panel, and
  forms reuse `@/components/ds` (`Button`, `Input`, `Tabs`, `Checkbox`, math
  primitives) with the mockup's inline styles on semantic tokens. The mockup's
  `<style>` block is ported to `app/(auth)/auth.css` (scoped to the route group).
- **The dark brand panel re-aliases the semantic tokens.** The global
  `[data-theme="dark"]` only overrides the *base* palette (`--paper`, `--ink`…)
  plus four semantic aliases; the rest were resolved at `:root` and merely
  inherited, so `.auth-brand-panel[data-theme="dark"]` re-declares them against
  the now-dark base (verbatim from the mockup's own comment). This keeps the
  brand panel dark while the form panel follows the page theme.
- **One tabbed screen across both routes.** `/sign-in` and `/sign-up` both render
  `<AuthScreen>` with `initialTab`; the `Tabs` + the contextual top-right link
  switch in place (local state, no navigation), matching the mockup. Both routes
  stay registered so middleware gating and deep links keep working.
- **The global AppBar is suppressed on auth routes** via a small client
  `ConditionalAppBar` (`usePathname`) rather than restructuring layouts — the
  mockup is a standalone 100vh experience. Hidden on `/sign-in`, `/sign-up`,
  `/reset-password`.
- **Magic link, Forgot password, and SSO are inline, not separate screens.**
  Magic link and reset are dispatched with the current email via extra
  `useActionState` hooks (FormData built in the click handler); SSO expands an
  inline domain field and hands the browser to the IdP URL. Credential errors
  surface under the password field with a "Reset it" link (mockup behavior);
  other auth errors use a form-level inline banner. Errors clear on edit.
- **Password reset is implemented end to end** (user choice): a non-enumerating
  `requestPasswordReset` (always reports success) emails a recovery link →
  `/auth/confirm` (verifies the recovery OTP) → `/reset-password` →
  `updatePassword`. The new password page is a calm centered card, not the split.
- **Company seeds the first workspace name** (user choice). Sign-up passes
  `company` in user metadata; migration `0005_signup_company.sql` does a
  `create or replace` of `handle_new_user` so the bootstrapped workspace name +
  slug prefer the company when present, else the existing `{name}'s workspace`.
  The invite-acceptance path is unchanged.
- **`next` is threaded through every email/redirect target** (magic link, sign-up
  confirmation, OAuth, SSO) so post-auth landing honors the originally requested
  path the middleware round-tripped via `?next=`.
- **Minimal `/terms` + `/privacy` placeholder pages** (user choice) so the
  footer/consent links resolve instead of 404ing; the Google "G" follows the
  mockup's monochrome line treatment (replacing the old multicolor `GoogleMark`).

## M3 — Design-system components (Foundation) + `/design` index

- **Ported the `_ds_bundle.js` components 1:1 as inline-style typed React, not a
  Tailwind rewrite.** The bound design system renders every component with inline
  `style={{…}}` on the semantic CSS variables (`var(--accent)`, `color-mix(in
  srgb, … 22%/28% …)`, etc.) and drives hover/active/focus through React state.
  Recreating that verbatim guarantees pixel-identical output to the design source
  (CLAUDE.md's binding "match the visual output"), needs zero token work (every
  `--var` already lives in `app/styles/tokens/`), and is the only clean way to
  express the em-based math primitives. Dark theme + density still flow through
  because the components read the same variables. The 21 components live under
  `components/ds/{core,forms,navigation,feedback,math}` (kebab-case files, the
  repo convention) and are re-exported from the `@/components/ds` barrel.
- **`"use client"` only where there are hooks/handlers.** Button, IconButton,
  Input, Select, Checkbox, Switch, Tabs, Dialog, Tooltip, MathRegion are client
  components; Badge, Card, Toast and the math primitives stay directive-free so
  they remain usable from Server Components.
- **`MathRegion` is kept in its own module, away from the `Math` primitive.** The
  exported `Math` notation wrapper shadows the global `Math`; `MathRegion` calls
  `Math.max(180, …)` for its edit-input min-width and must see the global, so it
  never imports the primitive (the two live in `math/math-region.tsx` and
  `math/math-parts.tsx`). The remaining bundle exports — the editor ui-kit
  (AppBar, Ribbon, Worksheet, Inspector/Outline panels, EditorApp) — are out of
  M3 scope and land with the editor-shell milestone.
- **Native-attribute prop collisions are `Omit`-ed, not renamed.** `Card.title`,
  `Input.size`/`Input.prefix`, `Select.size`, `IconButton.type`, and
  `Checkbox`/`Switch` `style` clash with DOM attributes, so each Props interface
  `Omit`s the conflicting native key and re-declares it with the DS meaning,
  preserving `...rest` passthrough typing.
- **The screens-index is the public root route `/design`, and it is both catalog
  and showcase** (per product decision). A faithful port of
  `mathcad-like/project/index.html` (three groups, line-glyph + dot-grid
  thumbnails, the `Core` badge) is preceded by a live **Foundation** section that
  exercises every M3 component (and uses `Card` for its own layout). Catalog
  cards link to a real route where one exists (`/sign-in`, `/app`) and carry a
  `Planned` badge otherwise. Thumbnails reuse the `--d-thumb-sm` density token and
  the global `.q-grid` utility; the page sits outside the auth-gated paths so it
  works as a developer handoff surface. It inherits the global AppBar's
  theme/density toggles for quick visual verification.

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
