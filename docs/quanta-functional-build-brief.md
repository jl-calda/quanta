# Quanta — Functional Build Brief (Next.js + Supabase)

> **Companion to the *Mockup Brief*.** That document tells Claude Design how each screen **looks**. This one tells a coding agent (Claude Code / Cursor / etc.) what each screen **does** and how to **build it** on Next.js + Supabase. Section numbers match: a screen's `§4.3` here pairs with `§4.3` there.
>
> **How to pair them per screen:** paste the Mockup Brief prompt (the look) **and** the matching prompt here (the behavior + data + logic). For an actual build, paste **Section 1 (Master Technical Foundation)** and **Section 2 (Calculation Engine)** first — they're the shared substrate everything else assumes.
>
> **Stack (your akro stack):** Next.js (App Router, Server Components, Server Actions, Route Handlers) + TypeScript + Tailwind + Supabase (Postgres, Auth, RLS, Realtime, Storage, Edge Functions). Geist Sans / Geist Mono. Math: `mathjs` + `katex` (see §2).

---

## 0. How to use this with a build agent

1. **Foundation first.** Paste §1 and §2 so the agent has the schema, conventions, and the calc engine before building any screen.
2. **Then build screen by screen** in the order in §8. For each screen, give the agent: this functional prompt + (optionally) the matching design prompt for the visual target.
3. **Each entry has:** *Pairs with* (Mockup Brief ref) · **Build** (what to implement) · **Data** (Supabase tables/columns it touches) · **Logic & interactions** · **Validation/permissions** · **Edge cases**.
4. **Conventions used throughout** (defined in §1): server reads in Server Components, mutations via Server Actions, client interactivity in `"use client"` islands, Zod for all input validation, RLS for all data access, optimistic UI for editor actions.

---

## 1. Master Technical Foundation  *(paste first to the build agent)*

```
You are building "Quanta", a multi-tenant web app for engineering calculations — a hybrid of Mathcad Prime and BlockPad. Engineers write live math in a document; formulas parse, track units, and recalculate like a spreadsheet, and render as textbook notation. Build it on this stack and follow these conventions exactly.

STACK
- Next.js (App Router) + TypeScript. Server Components for data reads; Server Actions for mutations; Route Handlers only for webhooks, file streaming, and the AI proxy. Keep client components small ("use client" islands) — the editor canvas is the main client island.
- Tailwind CSS. Fonts: Geist Sans (UI) + Geist Mono (formula edit / code / table cells) via the `geist` package. Equations are NOT set in Geist (see Calc Engine — they render via KaTeX).
- Supabase: Postgres + Auth + Row Level Security + Realtime + Storage + Edge Functions. Use the official `@supabase/ssr` for server/client clients. All data access goes through RLS — never bypass with the service role except in trusted server-only jobs (exports, admin tasks).
- State/data: prefer server data + Server Actions. For client cache use TanStack Query only where needed (editor). Validate every input with Zod. Use `nuqs` or searchParams for filter/sort state on list pages.

MULTI-TENANCY
- A "workspace" is the tenant. Every domain row carries workspace_id. A user belongs to many workspaces via workspace_members with a role. All RLS is scoped first by workspace membership, then by per-resource grants.

DATA MODEL (create these tables; abridged DDL — expand types/constraints sensibly)
-- enums
create type workspace_role as enum ('owner','admin','engineer','reviewer','viewer','billing');
create type worksheet_role as enum ('owner','editor','commenter','viewer');
create type calc_mode as enum ('auto','manual');
create type units_system as enum ('si','uscs','cgs','custom');
create type calc_status as enum ('current','stale','error');
create type share_scope as enum ('restricted','workspace','link');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text, full_name text, title text, avatar_url text, created_at timestamptz default now());

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique not null, owner_id uuid references profiles,
  plan text default 'free', seats int default 5, branding jsonb default '{}', created_at timestamptz default now());

create table workspace_members (
  workspace_id uuid references workspaces on delete cascade,
  user_id uuid references profiles on delete cascade,
  role workspace_role not null default 'engineer',
  status text not null default 'active',          -- active | invited
  invited_email text, created_at timestamptz default now(),
  primary key (workspace_id, user_id));

create table projects (                            -- folders, nestable
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  parent_id uuid references projects on delete cascade,
  name text not null, created_by uuid references profiles, created_at timestamptz default now());

create table worksheets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  project_id uuid references projects on delete set null,
  title text not null default 'Untitled',
  content jsonb not null default '{"version":1,"rows":[]}',   -- the document tree (see Calc Engine)
  calc_mode calc_mode not null default 'auto',
  units_system units_system not null default 'si',
  custom_unit_system_id uuid,
  page_settings jsonb default '{}',      -- size, orientation, margins, header/footer
  layout_settings jsonb default '{}',    -- default columns, indent step, snap
  calc_status calc_status not null default 'current',
  error_count int not null default 0,
  owner_id uuid references profiles, created_by uuid references profiles,
  updated_at timestamptz default now(), created_at timestamptz default now(),
  deleted_at timestamptz);               -- soft delete (Trash)

create table worksheet_versions (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid references worksheets on delete cascade,
  content jsonb not null, label text, summary jsonb,
  created_by uuid references profiles, created_at timestamptz default now());

create table worksheet_collaborators (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid references worksheets on delete cascade,
  user_id uuid references profiles, invited_email text,
  role worksheet_role not null default 'viewer',
  share_scope share_scope not null default 'restricted',
  link_token text unique, created_at timestamptz default now());

create table comments (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid references worksheets on delete cascade,
  region_id text not null,               -- references a region id inside content jsonb
  author_id uuid references profiles, body text not null,
  parent_id uuid references comments on delete cascade,
  resolved boolean default false, created_at timestamptz default now());

create table templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,  -- null = public/global
  title text not null, description text, discipline text, standard text,
  content jsonb not null, thumbnail_url text,
  visibility text not null default 'private',  -- private | workspace | public
  author_id uuid references profiles, usage_count int default 0, created_at timestamptz default now());

create table tags (id uuid primary key default gen_random_uuid(), workspace_id uuid references workspaces, name text);
create table worksheet_tags (worksheet_id uuid references worksheets on delete cascade, tag_id uuid references tags on delete cascade, primary key (worksheet_id, tag_id));

create table unit_systems (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces on delete cascade,
  name text not null, mapping jsonb not null,  -- {length:'mm', force:'kN', ...}
  created_by uuid references profiles, created_at timestamptz default now());

create table audit_log (
  id bigserial primary key, workspace_id uuid references workspaces,
  actor_id uuid references profiles, action text, target_type text, target_id uuid,
  metadata jsonb, created_at timestamptz default now());

STORAGE BUCKETS: avatars (public-read), worksheet-images (RLS by workspace), template-thumbnails (public-read), exports (private, signed URLs).

REFERENCE DATA (functions, units, constants) is SHIPPED IN CODE as typed JSON (not in DB) — see §4.6. The DB stores only user-defined custom unit systems.

RLS PHILOSOPHY
- Enable RLS on every table. Write SECURITY DEFINER helper functions and use them in policies:
  • is_member(ws uuid) -> boolean: exists in workspace_members for auth.uid().
  • member_role(ws uuid) -> workspace_role.
  • worksheet_role(ws_role, ws uuid, sheet uuid) -> effective worksheet_role: max of (workspace role mapping) and worksheet_collaborators grant and link-token access.
- Examples:
  • worksheets SELECT: is_member(workspace_id) OR exists collaborator grant OR valid link_token.
  • worksheets UPDATE: effective worksheet_role in ('owner','editor') AND deleted_at is null.
  • comments INSERT: effective role in ('owner','editor','commenter').
  • workspace_members INSERT/UPDATE/DELETE: member_role(workspace_id) in ('owner','admin').
- Create a trigger to insert a profiles row on auth.users insert. Create a trigger to bump worksheets.updated_at and to snapshot a worksheet_version on labeled saves.

ROLES → CAPABILITIES (enforce in RLS AND gate in UI)
Map the 7 workspace roles to capabilities; this is the source of truth for the admin matrix (§4.11):
- owner/admin: manage members, billing (owner), templates, branding, all worksheets.
- engineer: create/edit worksheets, share, export, approve own.
- reviewer: comment + suggest + approve/sign, read all shared, no structural edits.
- viewer: read + export only.
- billing: billing views only.
Worksheet-level roles (owner/editor/commenter/viewer) can override downward per worksheet via collaborator grants.

REALTIME / COLLAB (MVP → later)
- MVP: presence (who's viewing, avatars in app bar) via a Supabase Realtime channel per worksheet; broadcast calc-status and comment changes; autosave with last-write-wins + a version snapshot on conflict.
- Later: true concurrent editing via Yjs CRDT (y-supabase / a small WS relay) for the content tree; keep the JSONB as the persisted snapshot.

SHARED CONVENTIONS
- Server Actions return typed results { ok, data?, error? }. Surface errors as the app's voice (specific + fixable), never raw Postgres errors.
- Optimistic updates in the editor; reconcile on server confirmation; roll back on failure with a toast.
- Soft-delete worksheets (deleted_at) → Trash; hard-delete after retention window via a scheduled Edge Function.
- All times stored UTC; render in user's locale/timezone.

FOLDER STRUCTURE (suggested)
/app (routes) · /components (ui + editor) · /lib/supabase (clients) · /lib/calc (the engine, framework-agnostic, unit-tested) · /lib/units · /lib/schema (zod) · /server/actions · /server/queries · /types.

Build the calc engine in /lib/calc as a pure, framework-independent, fully unit-tested module FIRST (see §2). The UI binds to it.
```

---

## 2. The Calculation Engine  *(the hard core — paste with §1)*

```
Build Quanta's calculation engine as a pure TypeScript module in /lib/calc, independent of React and Supabase, with thorough unit tests. This is the product's crux. Persisted documents are JSONB; the engine operates on the in-memory document model.

LIBRARIES (a LAYERED engine — numeric + symbolic)
- mathjs (main thread): parsing (math.parse), fast numeric evaluation (node.evaluate(scope)), UNITS (math.Unit, dimensional checking, conversion), matrices, and node.toTex() for rendering. Configure precision (BigNumber/number) as a setting. This is the instant recompute path.
- katex: render TeX (from toTex or a custom builder) into the region. Plain-text edit mode shows the raw formula in Geist Mono; committed mode shows KaTeX.
- MathLive (mathfield): the **PRIMARY input — natural Mathcad-style 2D math entry**. The engineer types and notation builds live: '/' → stacked fraction, '^' → superscript, '_' → subscript, a function or Greek name → the symbol, space exits the current subexpression, ':' → the ':=' assignment. Configure MathLive's keybindings/macros for this Mathcad-like behavior. A plain-text formula field is a **secondary/optional** fast-entry mode. Both round-trip through the same AST (MathLive ↔ LaTeX ↔ mathjs/SymPy). The entry → crisp textbook notation (STIX) transform is the product's signature; rendered math ≥ ~18–20px.
- SYMBOLIC engine = SymPy via Pyodide (Python→WASM), run in a Web Worker: symbolic solve, simplify, factor, expand, collect, rewrite; symbolic diff/integrate/limit/series (incl. Big-O / "standard"); dsolve (symbolic ODE); integral transforms (fourier/laplace/ztrans + inverses); gradient; assumptions (assume); decomp; coeffs. A math region can carry a symbolic evaluation ("→") in addition to numeric ("="). Render symbolic results in math notation (e.g. zeros := s+4 → −4; roots → [−1, −1+2i, −1−2i]). Support a per-keyword "hide symbolic keywords" display toggle.
- HEAVY NUMERIC = NumPy/SciPy (also Pyodide, same worker): linear & nonlinear system solving, optimization (minimize/maximize/minerr), ODE/PDE (odesolve/pdesolve/numol), curve fitting & smoothing (genfit/polyfit/interp), probability & statistics, signal & image processing (FFT/filters), design of experiments, root-finding (also powers Goal Seek). Solve blocks live in /lib/calc/solve and call these; expose objective/constraint scaling + CTOL/TOL.
- PYTHON SCRIPTING: the SAME Pyodide runtime powers "advanced scripted controls" and "script modules" — so the symbolic engine, the scientific numeric library, and Python integration are ONE dependency, not three. (VBScript/JScript optional for Mathcad import compatibility only.)
- DATA TYPES: scalars, vectors/matrices/arrays, COMPLEX numbers, DATE/TIME values + arithmetic, ranges (+ vec()/IsRange()), strings. Units attach to all numeric types incl. composite FEET-AND-INCHES; support USER-DEFINED units and unit systems, and LaTeX-style identifiers.
- THREADING: mathjs + units stay on the main thread for instant recompute as the user types; Pyodide (symbolic + heavy numeric + Python) runs in a Web Worker, lazy-loaded on first use and cached, so symbolic/Python calls never block typing and light worksheets stay fast. The engine stays pure/deterministic so it runs identically on main thread, worker, and Node (for server-side export).

DOCUMENT MODEL (the JSONB in worksheets.content)
content = {
  version: 1,
  rows: Row[]
}
Row = { id, columns: 1|2|3, split?: number[],   // ratios summing to 1; default equal
        cells: Cell[] }                          // length === columns
Cell = { regions: Region[] }                     // regions flow vertically within a cell
Region = {
  id, type: 'math'|'text'|'table'|'plot'|'solve'|'image'|'sketch'|'control'|'area'|'include',
  indent: number,                                // 0..n indent steps
  border?: boolean, tag?: string, disabled?: boolean,
  ...typeSpecific
}
// type-specific payloads:
math:  { source: string,                         // raw formula, e.g. "N_Rd: phi*A_s*f_ub"  ( ':' or ':=' defines )
         display: { name:boolean, formula:boolean, substituted:boolean, result:boolean },
         format: ResultFormat, unit?: string, conditional?: CondRule[] }
table: { rows, cols, columnUnits?: string[], cells: TableCell[][], header?: boolean }
       // TableCell = { source?: string, format?: ResultFormat }  ('=' prefixed source for formulas; refs by A1 or named)
plot:  { kind:'xy'|'polar'|'contour'|'surface'|'bar', traces: Trace[], axes: AxesCfg, title?, legend?:boolean }
control:{ kind:'dropdown'|'slider'|'radio'|'checkbox'|'button'|'textbox'|'listbox',
          bind: string,                          // variable name it sets
          options?: {label:string, value:string}[], min?, max?, step?, invert?, default? }
area:  { title, collapsed:boolean, locked?:boolean, passwordHash?, visibleWhen?: string }  // visibleWhen = boolean expr over vars
include:{ sourceWorksheetId, alias?, status:'current'|'stale' }
ResultFormat = { decimals?:number, sigfigs?:number, notation:'auto'|'decimal'|'sci'|'eng',
                 radix:'dec'|'bin'|'oct'|'hex', trailingZeros?:boolean, thousands?:boolean,
                 expThreshold?:number, zeroThreshold?:number }
CondRule = { op:'>'|'>='|'='|'!='|'<'|'<=', value:number|string, style:{color?,fill?,bold?,label?} }

PIPELINE (the engine's responsibilities)
1) READING ORDER: flatten rows→cells(left→right)→regions(top→bottom, respecting indent only visually) into an ordered list of "evaluables" (math regions, table cells, controls produce variable bindings). This order defines scope visibility: a name must be defined earlier in reading order than its use (above, or to the left within the same row). Enforce and use this for "undefined / defined later" errors.
2) PARSE: input arrives as LaTeX from MathLive (primary) or as a plain-text formula (secondary); normalize either to the engine's expression form. Split into name (lhs before ':' or ':=') and expression (rhs), then parse rhs with math.parse → AST. An expression with no ':' is an EVALUATION (display value), not a definition. Unit literals are first-class (12 kN, 700 MPa, 16 mm, 5 ft 6 in → attached units); also support functions (Sqrt, Max, Vlookup, Interp, etc.), ranges (i: 1..5), matrices, complex & date/time values, and references to earlier names.
3) DEPENDENCY GRAPH: from each AST, collect referenced symbols (variables, function names) → build a directed graph name→deps. Include table cells and control bindings as nodes. Detect cycles (report "circular reference: a → b → a"). Topologically sort.
4) EVALUATE: walk in topo order, maintaining a scope object {name: value}. Values carry units via math.Unit. On each node.evaluate(scope):
   - UNITS: rely on mathjs unit arithmetic. Catch unit-mismatch errors (adding kN to mm, etc.) and attach a typed error to the region. Convert results to the region's target display unit if set, else to the worksheet's unit system defaults (map dimension→preferred unit; for 'custom' use the custom unit_system mapping).
   - Store both the raw value and a formatted string per ResultFormat (decimals/sigfigs/notation/radix/unit). Engineering notation = exponent multiple of 3. Radix bin/oct/hex only for dimensionless integers.
5) RENDER: produce TeX for each region: name := formula  (via node.toTex()), plus the result. For "substituted/show-steps", build a second TeX where leaf variable symbols are replaced by their formatted values (do a TeX transform on the AST, substituting numeric leaves), giving: formula → formula-with-values → result. Respect the display flags {name,formula,substituted,result}.
6) CONDITIONAL FORMAT: after evaluation, test each CondRule against the result; apply the first matching style (color/fill/label like OK/FAIL). Also evaluate area.visibleWhen booleans to hide/show sections.
7) DIRTY-TRACKING & MODES:
   - On edit of region X: mark X and all transitive dependents dirty. In 'auto' mode, recompute the dirty subgraph (debounced ~150ms). In 'manual' mode, leave them visibly stale until "Recalculate" (all dirty) or "Recalculate to here" (dirty nodes up to a chosen region in reading order).
   - Maintain worksheet.calc_status (current/stale/error) and error_count; expose them for the app bar/status bar.
8) ERRORS: a typed error model surfaced per region: { kind:'unit-mismatch'|'undefined'|'defined-later'|'cycle'|'parse'|'domain'|'singular'|'no-solution', message, fixHint, span? }. Messages are specific and fixable ("Units don't match: kN vs mm.", "f_ub is not defined above or to the left."). Provide a worksheet-level aggregate for the error summary (§7.29).

TABLES / SPREADSHEETS
- Evaluate cells with '=' formulas using the same engine; support A1 refs within the table and references to worksheet variables; per-column units in columnUnits; lookup functions (Vlookup/Hlookup/Index/Match/Interp) over table ranges. Cell results feed the dependency graph if the table defines named outputs.

SOLVE BLOCKS
- A solve block defines guess vars, a set of constraint equations/inequalities, and a solver call (find/minimize/maximize/minerr/odesolve). Build the residual/objective from the constraints and run the chosen numeric method; return a result vector bound to output names. Surface non-convergence as 'no-solution'.

PERFORMANCE
- Debounce recompute; only recompute the dirty subgraph; memoize parsed ASTs per region (reparse only on source change). For large worksheets or heavy solves, support running the engine in a Web Worker (postMessage the doc + dirty set, receive results) so typing stays smooth. Keep the engine synchronous and pure so it runs identically on main thread, worker, or (for server-side export) Node.

DETERMINISM
- The same document must evaluate identically on client and server (for PDF export with computed results). No reliance on browser-only APIs in /lib/calc.

TESTS (write these)
- Units: arithmetic, conversion, mismatch detection. Ordering: defined-later & above/left rules. Graph: cycle detection, topo correctness, partial recompute. Formatting: decimals/sigfigs/sci/eng/radix. Show-steps substitution. Conditional rules. Table refs + lookups. A few end-to-end worksheets (e.g., the anchor pull-out check).
```

---

## 3. Pages — functional build prompts

### 4.1 Auth — functional
*Pairs with Mockup Brief §4.1.*
```
Build Quanta authentication on Supabase Auth. Behavior: email+password, magic link, Google OAuth, and SAML SSO (enterprise) sign-in; sign-up creates a profile (trigger) and, if no workspace, runs first-run workspace creation (name + slug). 
Data: auth.users (Supabase), profiles (via trigger), workspaces + workspace_members (owner) on first sign-up. 
Logic: use @supabase/ssr; session in cookies; protect all /app routes via middleware that redirects unauthenticated users to /sign-in. After login, route to the last workspace (store last_workspace_id on profile) or the workspace picker. Invite-acceptance flow: an invited_email row in workspace_members upgrades to a real membership when that email signs in. 
Validation: Zod on email/password; show specific inline errors ("That password doesn't match."). Rate-limit attempts. 
Edge cases: already-authenticated visiting /sign-in → redirect to app; expired magic link → friendly re-request; OAuth account-linking when email already exists.
```

### 4.2 Dashboard / Home — functional
*Pairs with §4.2.*
```
Build the Quanta home/dashboard as a Server Component. 
Data reads (RLS-scoped to current workspace): recent worksheets (order by updated_at desc, limit ~6, with calc_status), a few templates (visibility in workspace/public), the project list, and the user's profile. 
Logic: "New worksheet" split-button → Server Action createWorksheet(workspaceId, projectId?, templateId?) inserts a worksheets row (content from template or empty) and redirects to /w/[id]. "Continue working" cards link to the editor and show a live calc_status chip. Global search (header) hits a server query across worksheets.title and tags (use Postgres full-text or trigram). 
Permissions: only show worksheets the user can access; respect workspace switch (the workspace switcher updates last_workspace_id and re-scopes all queries). 
Edge cases: brand-new account → empty-state CTA + template suggestions; no projects yet; search debounce + empty results.
```

### 4.3 Worksheet Editor — functional (core)
*Pairs with §4.3; depends on §2 and the editor zones §5.x and components §6.x.*
```
Build the Quanta Worksheet Editor at /w/[id] as the primary client island wrapping the pure calc engine (§2). This is the core of the app.
Load: a Server Component fetches the worksheet (content, settings, calc_status) RLS-checked; hydrate the editor client with content + the user's effective worksheet role. Initialize the engine, evaluate once, render.
Document/state: hold the content tree (rows→cells→regions) in client state (e.g., a reducer or a small store). Every structural op (add/move/delete region, change columns, indent/outdent, span) and every content edit updates the tree and the engine incrementally (dirty-track + recompute per calc_mode).
Persistence (autosave): debounce ~1–2s after changes → Server Action saveWorksheet(id, content, derivedMeta) that writes content + calc_status + error_count + updated_at. Optimistic; show "Saving…/Saved/*Unsaved" in the app bar. Create a worksheet_version snapshot on explicit "Save version", on large diffs, and on session end.
Calc controls: Auto/Manual toggle (writes calc_mode), Recalculate (recompute all dirty), Recalculate-to-here (recompute dirty up to a region). Status chip reflects engine state.
Collaboration: join a Realtime channel per worksheet for presence (avatars), broadcast calc_status + comment changes; if two editors, last-write-wins with a version snapshot (note Yjs path for later).
Permissions: viewers/commenters get a read-only canvas (no structural ops; commenters can add comments); editors/owners get full editing. Enforce both in UI and via RLS on saveWorksheet.
Keyboard: '=' opens a math region at caret; ⌘K command palette; standard cut/copy/paste/duplicate; arrow/tab navigation between regions and across columns.
Edge cases: concurrent edits, offline (queue saves locally, sync on reconnect), very large worksheets (virtualize pages; worker-run engine), broken include source, calc errors (render per-region, aggregate in status bar).
Reference §5.x for each zone's behavior and §6.x for each region type's logic.
```

### 4.4 Template gallery — functional
*Pairs with §4.4.*
```
Build the template gallery (Server Component + client filters). 
Data: templates where visibility='public' OR (workspace-scoped) OR author=user, filterable by discipline/standard/type (searchParams via nuqs); a "Your templates" tab (author_id=user). 
Logic: "Use template" → Server Action createWorksheet(..., templateId) clones content into a new worksheet and increments templates.usage_count; "Preview" opens a read-only render of template.content in a drawer (reuse the editor in read-only mode). "Save as template" (from editor) inserts a templates row with a generated thumbnail (render page 1 to image via a server Edge Function or client canvas → upload to template-thumbnails). 
Permissions: workspace members can use workspace/public templates; only authors/admins edit or delete a template. 
Edge cases: template content schema migration (version field), missing thumbnail, empty category.
```

### 4.5 File browser — functional
*Pairs with §4.5.*
```
Build the file browser at /worksheets. 
Data: projects (tree, parent_id) + worksheets (non-deleted) scoped to workspace, with tags and calc_status; list/grid; sort & filter via searchParams. 
Logic (Server Actions): createFolder, renameWorksheet/renameProject, moveWorksheet(projectId), duplicateWorksheet (deep-copy content), softDeleteWorksheet (set deleted_at → Trash), restore, and multi-select bulk actions (move/tag/delete). Breadcrumb from the project tree. Search across title+tags. 
Permissions: actions gated by effective role; viewers can open/export only. 
Edge cases: nested-folder moves (prevent cycles), deleting a folder with worksheets (cascade to Trash, confirm), pagination/virtualization for large lists, optimistic row updates.
```

### 4.6 Reference library — functional
*Pairs with §4.6.*
```
Build the functions/units/constants reference. 
Data: SHIPPED JSON in /lib/calc/reference (functions with signature, params, description, units behavior, example) and /lib/units (unit catalog by dimension with SI equivalence) and /lib/constants (CODATA). No DB. 
Logic: searchable, categorized; the detail pane renders a live worked example by running the engine on the example string (so examples can't drift from the engine). "Insert into worksheet" — when opened from the editor, dispatches an insert into the document tree at the caret; when opened standalone, copies a snippet. 
Edge cases: keep the reference catalog in sync with engine-registered functions (generate the function list from the engine's registry where possible); search across symbol + name + aliases.
```

### 4.7 Settings (full page) — functional
*Pairs with §4.7.*
```
Build per-user + per-workspace settings. 
Data: profiles (account, appearance prefs stored as jsonb on profile), and for workspace-level defaults a settings jsonb on workspaces (default calc_mode, units, formatting). The "Calculation" and "Units & formatting" sections set defaults applied to NEW worksheets (existing worksheets keep their own). 
Logic: Server Actions updateProfilePrefs / updateWorkspaceSettings; live preview of result formatting runs the engine's formatter on a sample value. Save-on-change with toast; sticky save bar for grouped forms. 
Permissions: workspace defaults editable by owner/admin only; personal prefs by self. 
Edge cases: theme = system (respect prefers-color-scheme), custom unit system management links to §7.10.
```

### 4.8 Shared — functional
*Pairs with §4.8.*
```
Build "Shared with me / by me". 
Data: worksheets joined to worksheet_collaborators where user_id=me (shared with me) or where I'm owner and grants exist (shared by me); show my effective role + last activity (from audit_log or updated_at). 
Logic: "Manage access" opens the Share dialog (§7.23); revoke = delete a collaborator grant (Server Action, admin/owner of sheet only). Optional activity feed from audit_log. 
Permissions: a user sees only sheets they have a grant to or are workspace-visible. 
Edge cases: pending invites by email (no user_id yet), link-shared sheets, role changes reflecting immediately.
```

### 4.9 Version history — functional
*Pairs with §4.9.*
```
Build version history for a worksheet. 
Data: worksheet_versions (content snapshots + label + summary + author). 
Logic: list newest→oldest; selecting a version renders it read-only (engine in read mode); "Compare" diffs two versions' content trees (region-level diff: added/changed/removed by region id + shallow content hash) with synced scroll; "Restore" = write the chosen content back to worksheets.content AND snapshot the current state first (Server Action, editor/owner only); "Name this version" updates label. 
Edge cases: large diffs, versions referencing removed includes, restoring across content schema versions (migrate on read).
```

### 4.10 Print / export preview — functional
*Pairs with §4.10.*
```
Build export/print. 
Logic: compute the worksheet deterministically server-side (the pure engine runs in Node) so exported results match the screen. 
- PDF: render the paginated worksheet (HTML/CSS print or a React-PDF/Puppeteer Edge Function) honoring page size/margins/header-footer, "include region borders", "expand show-steps", "inputs summary", watermark, page range → upload to exports bucket → return a signed URL. 
- Word (.docx): generate via a docx library from the computed model. 
- Excel (.xlsx): export tables/values via SheetJS. 
- HTML: static render. 
- Print: browser print of the present view. 
Data: reads worksheet content; writes nothing except an optional audit_log entry; stores artifacts in exports (signed, expiring). 
Permissions: anyone with view+ can export (respect a workspace setting that can disable export for viewers). 
Edge cases: huge worksheets (stream/paginate), fonts (embed Geist + the math font / KaTeX fonts in PDF), plots rendered to vector/png for export.
```

### 4.11 Workspace / team admin — functional
*Pairs with §4.11.*
```
Build workspace admin (owner/admin only — gate route + RLS). 
Data: workspace_members (+ profiles), seats/plan on workspaces, audit_log, projects, templates, branding. 
Logic (Server Actions): invite member (insert workspace_members status='invited' + send email; accept on sign-in), change role, suspend/remove, manage project access. Roles & permissions matrix is the UI over the role→capability map in §1 (capabilities are enforced in RLS; custom roles = a future capabilities table). Seat usage = count of active members vs seats; block invites over seat limit. Audit log table reads audit_log. 
Permissions: only owner/admin; billing role sees billing only. 
Edge cases: can't remove the last owner; downgrading a member who owns worksheets (transfer ownership prompt); invite to existing member (no-op/notice).
```

### 4.12 Empty states — functional
*Pairs with §4.12.* Mostly presentational. Functionally: each empty state's primary action wires to the relevant Server Action (create worksheet/folder, clear filters, open AI). The "offline" state reflects real connection status (navigator.onLine + Supabase channel state) and shows the local-save/sync indicator.

---

## 4. Editor zones — functional  *(mirror §5.x)*

### 5.1 Top app bar — functional
*Pairs with §5.1.* Title edit → debounced renameWorksheet. Autosave indicator reflects the save queue state. Calc controls write calc_mode and trigger engine recompute. Status chip is derived from engine state (current/stale/error + counts). Presence avatars from the Realtime channel. Share/comments/AI buttons open their panels/dialogs.

### 5.2 Ribbon — functional
*Pairs with §5.2.* The ribbon is a **command dispatcher**: every control fires a typed editor command (insertRegion, setColumns, indent, setResultFormat, toggleShowSteps, insertFunction, recalculate, etc.) handled by the editor reducer. Controls reflect the current selection's state (e.g., decimals stepper shows the selected region's format; column buttons show the active row's column count). Disable commands not permitted for the user's role. Collapsed-ribbon state persists in user prefs.

### 5.3 Left panel — functional
*Pairs with §5.3.* Outline = derived from text-region headings + tagged regions (computed from the tree); click scrolls to region. Variables = derived from the engine's symbol table (name, current value+unit, definition location, reference count, error flag); click scrolls to definition; reflects live recompute. Files = the project tree (same data as §4.5), current sheet highlighted.

### 5.4 Canvas — functional
*Pairs with §5.4.* The canvas renders the content tree and owns structural editing: create region (incl. '=' to open math at caret), reorder via drag (DnD that moves a region within/between cells — updates the tree, never free-floats), set row columns (1/2/3) with split-ratio drag, span-all-columns, indent/outdent, delete, multi-select + group ops. Every op is an editor command → reducer → engine dirty-track → autosave. Enforce read-only for viewers. Virtualize long documents. Reading order (for scope) is recomputed on any structural change and fed to the engine.

### 5.5 Right panel (Inspector) — functional
*Pairs with §5.5.* Two-way binding to the selected region's properties: result format, target unit, display flags (name/formula/substituted/result), conditional-format rules, border, tag, comment — and table/plot/text/control-specific props. Editing a property dispatches a command that mutates the region and recomputes/re-renders only what's affected. Multi-select edits apply to all selected where applicable.

### 5.6 Status bar — functional
*Pairs with §5.6.* Region/error counts and calc status from the engine; page indicator from layout; units-system selector writes worksheet.units_system and triggers re-display (re-convert results to new system defaults); zoom is a client-only view transform.

### 5.7 Math keypad / operator palette — functional
*Pairs with §5.7.* Each glyph inserts the corresponding token/structure into the active math region's source at the caret (e.g., fraction, √, Σ with placeholders); shows the keyboard shortcut. Pin state + position persist in prefs. Purely an input aid over the math region.

### 5.8 Command palette (⌘K) — functional
*Pairs with §5.8.* Fuzzy index of: editor commands, navigation targets (pages, variables, outline), reference inserts (functions/units), and recent worksheets (server query). Selecting dispatches the command or navigates. Keyboard-first; debounced search.

### 5.9 AI assistant — functional
*Pairs with §5.9.* A panel that calls the Anthropic API via a **server Route Handler proxy** (never expose the key client-side; stream responses). Capabilities: draft a calculation (returns proposed regions as the document-model JSON → preview → "Insert" applies them to the tree), check the worksheet for errors (send the engine's error list + relevant region sources, get suggested fixes), explain a result, convert units, summarize for review. Pass the current worksheet context (sources + computed values) as structured input. Tool-style: have the model output region JSON conforming to the §2 schema so inserts are deterministic. Always show a "verify before use" note. Log usage; respect per-plan limits.

---

## 5. Core components — functional  *(mirror §6.x)*

### 6.1 Math region — functional (engine integration)
*Pairs with §6.1; the heart.* Edit mode = a Geist-Mono text field bound to region.source with autocomplete (variables/functions/units from the engine + reference). On commit (Enter/blur): parse → update graph → recompute dirty subgraph → render TeX (formula + result, plus substituted line if show-steps) via KaTeX → apply conditional format → persist (autosave). Render the 10 states from §6.1 driven by engine output: empty, editing, evaluated, named-value, show-steps, conditional pass/fail, unit-mismatch error, undefined error, vector/range result, selected. Inline error badge from the typed error model with a fix action. Display flags toggle which lines render.

### 6.2 Text region — functional
*Pairs with §6.2.* Rich text (Tiptap/ProseMirror or a lightweight contenteditable) storing structured JSON; supports headings (feed the outline), inline formatting, inline math snippets (a small read-only KaTeX inline node bound to an expression), and links/tags. No engine impact except inline-math evaluation and heading → outline.

### 6.3 Table / spreadsheet — functional
*Pairs with §6.3.* A grid bound to table payload; cells with '=' formulas evaluated by the engine; A1 + named refs; per-column units; lookup functions (Vlookup/Index/Match/Interp) over ranges; conditional formatting per cell/column; formula bar for the selected cell (Geist Mono). Cell outputs can define names that feed the worksheet graph. Insert/delete rows/cols, resize, sort. Read/present mode = clean banded table.

### 6.4 Plot — functional
*Pairs with §6.4.* Bind traces to expressions/ranges/table columns; recompute trace data on dependency change (sample x-range, evaluate y via engine with units, convert to axis units). Render with a charting lib (recharts for xy/bar; a contour/surface lib or plotly for 3D/contour). Interactions: drag axis ranges (writes axes cfg), hover read-out (nearest data point), legend toggles. Empty state until x/y chosen.

### 6.5 Solve block — functional
*Pairs with §6.5.* Sub-regions: guesses (definitions), constraints (equations/inequalities), solver call. On recompute, build residual/objective from constraints and run the chosen solver (§2 solve); bind result vector to output names (feeding the graph); surface non-convergence. Algorithm choice + tolerances stored on the block.

### 6.6 Image / sketch — functional
*Pairs with §6.6.* Image: upload to worksheet-images (signed), store URL + alt + caption in the region; resize. Sketch: a lightweight vector canvas (store shapes as JSON in the region; render to SVG); thin-line technical tools; export sketch to the PDF as vector. No engine impact.

### 6.7 Input controls — functional
*Pairs with §6.7.* Each control writes its bound variable into the engine scope as a definition (so it participates in the graph and drives recompute live): dropdown/radio/listbox set discrete values; slider sets a numeric (with min/max/step/units); checkbox a boolean; textbox a typed value; button triggers an action/recompute. Changing a control marks dependents dirty and recomputes (auto) or marks stale (manual). Bindings validated (type/units) against use sites.

### 6.8 Collapsible area — functional
*Pairs with §6.8.* Group of regions with collapsed state; optional lock with passwordHash (gate edits client+server; treat as soft protection, not security — note this). `visibleWhen` boolean expression evaluated by the engine to hide/show the section (BlockPad-style conditional visibility, e.g. show only when Load case = Fall-arrest); hidden sections can be excluded from print. Collapsing is view-only and doesn't remove regions from the graph (unless disabled).

### 6.9 Include / reference — functional
*Pairs with §6.9.* An include pulls named values/functions from another worksheet: on load, fetch the source worksheet (RLS-checked), evaluate it, and inject its exported names into this worksheet's scope under an optional alias; mark status current/stale when the source's updated_at changes; "Refresh" re-pulls; "Unlink" removes. Internal links/tags jump within the document. Guard against include cycles across worksheets.

### 6.10 Region chrome — functional
*Pairs with §6.10.* Shared selection/hover behavior: reorder drag (within the flow), column-split control, indent/outdent, span toggle, border toggle, context menu commands — all dispatch editor commands (no free placement). Multi-select aggregates ops (put in 2 columns, align, group, delete). Disabled for read-only roles.

### 6.11 Tokens & autocomplete — functional
*Pairs with §6.11.* The autocomplete source is the engine's live symbol table (variables with value+unit + definition location) plus the function/unit reference catalog; ranked by reading-order proximity and match. Variable hover popover reads current value/unit/definition from the engine. Function-signature hints from the reference.

### 6.12 Error / warning badges — functional
*Pairs with §6.12.* Driven entirely by the engine's typed error model: per-region error/warning/stale badges with specific messages + fix actions; the status-bar aggregate opens the error summary (§7.29) listing each with a jump link. Redefinition warnings are toggleable in settings.

---

## 6. Modals & dialogs — functional  *(mirror §7.x — grouped; logic-heavy ones detailed)*

**File & data dialogs (§7.1–7.4, 7.31).** New/From-template/Import → createWorksheet (clone template content or parse import). Open → navigate. Save/Save-As → write content / clone to a new worksheet row. Export → §4.10 pipeline. Save-as-template → insert templates row + thumbnail. Import: .xlsx via SheetJS → seed tables; .csv → table; Mathcad .mcdx → best-effort map (flag as partial/complex). All gated by role; validate names with Zod; confirm overwrite.

**Insert dialogs (§7.5–7.7, 7.13–7.17).** Insert function/unit/symbol/plot/table/image/control/solve → each builds a Region payload (§2 schema) and dispatches insertRegion at the caret; the function/unit pickers read the shipped reference; plot/table/control wizards collect config then insert. No DB writes except image upload.

**Formatting dialogs (§7.8, 7.11, 7.12, 7.18, 7.19).** Result format / headers-footers / page setup / conditional formatting / text styles → mutate the selected region or worksheet.page_settings/layout_settings (Server Action autosave). Result-format + conditional-format previews run the engine formatter/rule evaluator live. Text styles persist to worksheet (and optionally workspace default template).

**Settings dialogs (§7.9, 7.10, 7.26, 7.27).** Worksheet settings → write calc_mode/units_system/page/layout (re-display on units change). Custom unit systems → CRUD on unit_systems (mapping dimension→unit); set worksheet default. Preferences → profile prefs jsonb. Account → profiles + Supabase Auth (password, 2FA, sessions), notification prefs.

**Collaboration dialogs (§7.23, 7.24, 7.9-version).** Share → manage worksheet_collaborators (invite by email/user, per-person role, general access scope, link token + copy); enforce sheet owner/admin. Comments → CRUD on comments anchored to region_id, threads, resolve, @mentions (notify); realtime updates. Version history → §4.9.

**Utility (§7.20–7.22, 7.25, 5.8).** Tag/internal-link → set region.tag / insert link to a tag (validate target exists). Find & replace → client search over the tree (scopes: math/text/tables), replace dispatches edits + recompute. Go to page → scroll. Keyboard shortcuts → static reference. Command palette → §5.8.

**Confirmations (§7.28).** Pure UI guards in front of destructive Server Actions (unsaved-close, delete→trash, overwrite, restore-version, revoke-access). Always state the consequence; destructive styling.

**AI assistant modal (§7.30).** Same as §5.9, modal form; shares the server proxy + region-JSON output contract.

---

## 7. Cross-cutting functional concerns

**Keyboard & keymap (Mathcad-style).** A single keymap module (`/lib/keymap`) drives BOTH the MathLive bindings and the Keyboard-shortcuts reference modal, so they never drift. Math entry: `:`→`:=`, `=`→evaluate, `/`→stacked fraction, `^`→superscript, `_`→subscript, backslash→√ (Ctrl+backslash→nth root), `.`→literal name subscript (F.t→F_t), `[`→index subscript, `|`→abs, **Space→expand selection up the expression tree** (signature Mathcad key), Tab/arrows→placeholders, Ctrl+G→Greek (type `p` then Ctrl+G→π); insert sum / product / integral / derivative / partial / limit / range / matrix (Ctrl+M). Region/app (platform-aware ⌘/Ctrl): F9 recalculate, Shift+F9 recalculate-to-here, Ctrl+Enter new region, Space on an empty new region→text, ⌘/Ctrl+S / Z / Shift+Z / F / K / P, `/`→shortcuts reference. A **Keymap** preference (`Mathcad` default | `Default`) swaps the set. Accessibility: no focus trap, screen-reader keys unblocked, every shortcut also reachable via ribbon/menu.

**Autosave & versions.** Debounced content saves; labeled + periodic + on-exit snapshots to worksheet_versions; updated_at trigger; conflict → snapshot + last-write-wins (MVP).

**Realtime & collaboration.** Per-worksheet Realtime channel: presence (avatars), broadcast calc_status + comments; (later) Yjs CRDT for concurrent region editing with the JSONB as the persisted snapshot.

**Permissions enforcement.** Two layers, always both: RLS on every query/mutation (source of truth) + UI gating by effective role (hide/disable). Effective worksheet role = max(workspace-role mapping, collaborator grant, link access). Export-for-viewers and other capabilities are workspace settings.

**Import/export pipeline.** Deterministic server-side evaluation (pure engine in Node) so exports match the screen; PDF (Puppeteer/React-PDF, embed Geist + KaTeX fonts, plots → vector/png), docx, xlsx (SheetJS), HTML; artifacts to exports bucket via signed URLs; Mathcad import is best-effort.

**Offline & sync.** Detect connection (navigator.onLine + channel state); queue content saves locally (IndexedDB) and replay on reconnect; show the offline indicator (§4.12).

**Audit & telemetry.** Write audit_log on shares, role changes, deletes, restores, exports; surface in admin (§4.11).

**Testing.** Unit-test /lib/calc exhaustively (§2). Integration-test Server Actions with RLS (run as different roles). E2E the editor's core loop: type formula → render → recalc → autosave → reload → identical. Test export determinism (client value === server value).

**Security notes.** Area "password protection" is soft (UX), not a security boundary — state this. AI key only server-side. Validate all region JSON from AI/import against the §2 schema before inserting.

---

## 8. Build order & milestones

1. **Foundation:** Supabase schema + RLS + helper functions + Auth + profile/workspace bootstrap (§1, §4.1).
2. **Calc engine in /lib/calc** with full tests (§2) — before any editor UI.
3. **Editor skeleton (§4.3, §5.4, §6.1):** load/save a worksheet, render the content tree, math region edit→render→recalc→autosave. This is the riskiest core — prove it early end-to-end.
4. **Editor zones & inspector (§5.1–5.6, §5.5):** ribbon command dispatch, panels, status, result formatting, show-steps, conditional format.
5. **More region types (§6.3 tables, §6.7 controls, §6.4 plots, §6.8 areas):** the next most-used.
6. **Around-the-editor pages (§4.2 dashboard, §4.5 files, §4.4 templates):** CRUD + navigation.
7. **Collaboration (§7.23 share, §7.24 comments, §4.9 versions, presence):** and the permissions matrix (§4.11).
8. **Export (§4.10)** with server-side determinism; then **AI assistant (§5.9)**, **includes (§6.9)**, **solve blocks (§6.5)**, reference library (§4.6).
9. **Hardening:** offline/sync, worker-run engine, audit, admin, import, performance + virtualization.

*Two things to decide before step 3:* (a) **content storage** — single JSONB doc (recommended, simplest, matches block-editor patterns) vs. a regions table (finer queries, harder ordering/collab); (b) **collab model for v1** — autosave + presence + last-write-wins (recommended MVP) vs. Yjs CRDT now (more work, true concurrency). The prompts above assume **JSONB doc + MVP collab**, with the Yjs path noted for later.
```

