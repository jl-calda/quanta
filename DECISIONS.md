# Decisions

Running log of non-obvious choices, per CLAUDE.md. Newest first.

## Table / spreadsheet region (Func §6.3 + Claude Design `table-region.html`)

- **Engine connection = provider scope-bridge; `graph.ts`/`recalc.ts` untouched.** All
  table math lives in a new pure, deterministic `lib/calc/table.ts` (`evaluateTable(table,
  externalScope?)`) beside the engine. Tables READ worksheet names from the live
  `state.results` (`worksheetScopeFromResults`), and their named outputs FOLD BACK as
  *synthetic definitions* (`name := <serialized>`) the unmodified engine evaluates —
  `buildEngineInputs(content, exportsByTable)` splices them in at each table's reading-order
  position, so downstream regions resolve them through the engine's existing graph with **no
  core change** (`git diff` shows zero lines in `graph.ts`/`recalc.ts`).
- **The settle loop is a pure, bounded fixpoint (`settleTables` in `flatten.ts`).** It re-runs
  engine→tables until the per-table export snapshot stops changing, bounded by a hard cap
  (`MAX_SETTLE_ITERS = 8`) **and** an oscillation guard (a repeated snapshot breaks) so a
  cross-boundary cycle can never spin. Extracted from the provider so it is unit-tested with a
  real `CalcEngine` (fold-back ordering, worksheet-name read, bounded termination). The
  provider just calls it; published results strip the synthetic `tbl:*` regions.
- **Fold-back serialization is lossless for the cases that matter.** `serializeForScope`:
  `String(number)` (IEEE round-trips exactly), a Unit → `"<magnitude> <unit>"`, arrays/matrices
  nest; anything else → `null` and the provider skips that export (so a partial/errored grid
  never injects a broken synthetic def). Other tables receive the *raw* export values via the
  shared scope (no serialization round-trip); only the math engine needs the source form.
- **Lookups are pure and injected as cell-scope functions** (`lib/calc/lookups.ts`:
  Vlookup/Hlookup/Index/Match/Interp), unit-aware (compare by `equalBase` then convert into the
  key's unit), raising typed `CalcError`s. Injecting them into each cell's `node.evaluate(scope)`
  is exactly how the engine resolves callees, so the shared `math` instance stays untouched.
- **`TableRegion` is fully typed (not render-only passthrough), with a legacy migration.** The
  schema adds `columns`/`rows` (raw cell *sources*, never persisted values) + `name`/`eyebrow`/
  `ranges`. Because the old render-only payload stored `rows` as a *count* (a number),
  `parseContent`/`validateContent` run `migrateLegacyTables` first — deriving typed
  `columns`/`rows` from `{header, cells, columnUnits}` and overwriting the numeric `rows` —
  otherwise one bad table would fail the discriminated union and **null the whole document**.
  New fields default to `[]`, and legacy keys still round-trip via `.passthrough()`.
- **Spreadsheet semantics diverge from the worksheet deliberately.** Inside a table, cells may
  reference each other in ANY direction (only a true cycle errors), unlike worksheet regions
  which must be defined earlier in reading order; a small local Kahn sort + cycle naming lives
  in `table.ts` (not a `graph.ts` change). A1 letters derive from **column order**, so moving a
  column shifts its letter — standard spreadsheet behaviour, documented. A column unit attaches
  to bare numeric literals (`120` in a `mm` column → `120 mm`) and is the display target for
  results, but never fabricates dimensions on a dimensionless formula result.
- **Cells show the magnitude only; the unit lives in the column header** (matching the mockup).
  The raw unit-bearing value is kept for calc + exports; `displayCell` renders the magnitude in
  the column's unit (full `formatValue` only for unit-less columns whose value carries its own
  unit). Conditional formatting reuses `applyConditional` on the *display* value.
- **Edit chrome shows while the region is the active selection; otherwise the clean read mode.**
  `selected && canEdit` → the gridded editor (named-range chip, A1 reference box, Geist-Mono
  formula bar, per-cell selection, conditional tints/tags, add row/column); else the banded
  present table (eyebrow, 1.5px ink rule, no gridlines). The read view is a provider-free
  `table-present.tsx` shared with the history/export renderers (which evaluate the table with
  the pure engine; snapshots have no live worksheet scope, so cross-region refs there show an
  inline error — acceptable for a static snapshot). The formula bar is a plain mono `<input>`,
  **not** MathLive — the math-entry seams are left untouched.
- **Sort/filter and true array/spill are deferred but typed-but-inert.** `TableSort`/
  `TableFilter` types + `sort?`/`filter?` fields compile and round-trip, and A1 **range**
  references (`B2:B5`, named ranges) already resolve to matrices for lookups, so the follow-up
  adds only sort/filter UI + spill *output* with no refactor. No dead UI ships (the header
  sort/filter glyphs are omitted this pass — they return with the feature).
- **Table cell edits persist through the existing autosave path** (`SET_REGION_PROP`-style
  dedicated `EDIT_TABLE_CELL`/`ADD_*`/`DELETE_*`/`SET_TABLE_COLUMN` reducer actions → `touched()`
  → the Zod-validated, RLS-gated `saveWorksheet`). No new entity, table, action, or migration —
  content stays in `worksheets.content` JSONB. Table-cell errors surface in-cell; the worksheet
  error count stays math-only (a documented, minor fidelity choice).

## Canvas — structural editing (Func §5.4 + Claude Design `canvas.html`)

- **`selectedId` stays the single primary selection; `selectedIds` is a parallel
  multi-set.** Adding multi-select could have replaced `selectedId` with a set, but
  every existing consumer (`inspector.tsx`, `ribbon/commands.ts`,
  `comments-panel.tsx`, `left-panel.tsx`) reads the lone primary. So the reducer
  keeps `selectedId` as the active/primary id (always a member of `selectedIds`, or
  both empty/null) and adds `selectedIds: string[]` that only the group ops act on.
  After a structural delete, `reconcileSelection` intersects `selectedIds` with the
  surviving `readingOrderIds` — so deleting an **area** also drops its nested
  children from the selection and repairs the primary, with no per-action bookkeeping.
- **Modifier-clicks are resolved by one shared helper, called from three places.**
  `regions/region-select.ts#applyModifierSelect` maps Cmd/Ctrl→`TOGGLE_SELECT`,
  Shift→`SELECT_TO` (a slice of `readingOrderIds`), and a plain click *while a group
  is selected*→`SELECT` (collapse, not begin-edit). It's called first in the three
  click interceptors that `stopPropagation` — `region-item`, committed `math-region`,
  and `text-region` — because each stops the bubble so a single wrapper handler can't
  see the click. Render-only views have no own `onClick` and flow through
  `region-item`. `RegionRenderProps.selected` now means "is primary"; the `is-selected`
  highlight comes from `selectedIds.includes(id)`, and the per-region toolbar shows
  only for a lone primary (the group bar covers multi).
- **Drag split-ratio = a gutter track + `SET_SPLIT`, resolved from the pointer's
  absolute fraction.** Multi-column rows interleave `fr` cell tracks with a fixed
  gutter track holding a dashed rule and an 8×26 drag handle (`canvas.tsx#SplitHandle`).
  The drag reads `(clientX − rect.left) / rect.width` of the grid container — the same
  *scaled* rect for both, so it's zoom-invariant — and redistributes only the dragged
  boundary's adjacent pair. The fixed gutter px introduces a sub-2% nonlinearity that's
  imperceptible for a direct-manipulation handle. `clampSplit` (reducer) keeps every
  column ≥ ~0.14 and normalizes to exactly `columns` ratios; `SET_COLUMNS` clears any
  prior split.
- **Drag-into-cell targets *empty* cells only.** Dropping onto a populated cell is
  already handled by region-relative `MOVE_TO` (before/after a sibling), so only empty
  cells are `MOVE_TO_CELL` drop targets — this sidesteps the double-fire (region drop
  *and* cell drop) and the area-child ambiguity entirely. `region-item.onDrop` also
  `stopPropagation`s defensively. `MOVE_TO_CELL` checks its preconditions on the
  original tree (so a same-cell / out-of-range drop is a true no-op that never dirties
  the doc), then reuses `MOVE_TO`'s splice→relocate→`pruneEmptyRows` body.
- **Long-doc virtualization via CSS `content-visibility`, not JS windowing.** A page
  body over `VIRTUALIZE_ROWS` (60) gets `.ed-virtualize`, which sets
  `content-visibility:auto; contain-intrinsic-size:auto 64px` on each `.ed-row`. This
  keeps every row in the DOM — so drag, selection, and `scrollToRegion`
  (`scrollIntoView` force-renders skipped subtrees) all keep working — unlike JS
  windowing, which would unmount off-screen rows and break those. Off-screen rows get
  paint containment that would clip the overflowing hover chrome (grip/toolbar/insert),
  so any **live** row opts back out to `content-visibility:visible`: `:hover` (atomic
  with the pointer, via CSS) plus a React `.is-live` class for the selected/editing row.
- **Group ops over the selection are reducer actions, not N dispatches.**
  `DELETE_SELECTED` / `INDENT_SELECTED` / `DUPLICATE_SELECTED` each run one `mutate()`
  looping the existing single-region logic (`locate`+`splice`; `INDENT` clamp;
  `reidRegion`+`structuredClone`, which already recurses areas). The ribbon's Indent
  routes to `INDENT_SELECTED` when 2+ are selected so it never silently acts on only the
  primary; border/span stay primary-target. A sticky group bar (mounted outside the
  zoom-scaled page) and Delete/Escape/⌘A on the canvas drive them.

## Editor left panel (Func §5.3 + Claude Design `left-panel.html`)

- **Outline right-column shows the auto section number, not a page number.** The
  mockup's right-aligned mono number is a page number, but Func §5.3 calls for
  "auto outline numbering" and the worksheet isn't paginated yet (the canvas is a
  single continuous page). So the slot renders the hierarchical TOC number
  (`1`, `1.1`, `1.1.1`, `2`, …) computed in reading order from heading levels
  (`buildOutline` in `lib/worksheet/outline.ts`). Tagged-region leaves are
  unnumbered. Feature matrix governs over the mockup placeholder per CLAUDE.md.
- **Folder open/closed is shown by chevron rotation, not a new icon.** The icon
  registry has no `folderOpen` glyph; rather than invent one (CLAUDE.md: no new
  visual language / flag substitutions), the Files tree rotates the existing
  `chevR` 90° when open and keeps the `folder` glyph constant.
- **Reference count = distinct *other* regions that reference a name.** Computed
  purely from content (`buildSymbolTable`) by parsing each math region
  (`parseRegion`) and intersecting deps with the set of defined names via the
  engine's `filterUnitLiterals` — so unit literals (`kN`, bare `b`) never inflate
  counts, a user-defined name that shadows a unit *is* counted, and a region's
  self-reference is excluded. Content-derived (not result-derived), so it's
  correct in Manual mode before a recalc. `filterUnitLiterals` is now re-exported
  from `@/lib/calc`.
- **Variables value/unit split gates on `isUnit(value)`, not on whitespace.** The
  engine's `formatted` joins value+unit with one space, but matrices/booleans can
  contain spaces; `splitValueUnit` only splits (on the first space) when the raw
  value is a unit, otherwise the whole string is the value with an empty unit.
- **Error rows show only the alert icon** (full message in `title`) and the footer
  summarizes the count of `unit-mismatch` errors specifically — matching the
  mockup, and avoiding a false "conflict" when results are merely stale.
- **Files tree is a server-side snapshot.** `getEditorProjectTree` (new
  `server/queries/editor.ts`) reuses the file browser's cached `getProjectTree`
  plus a non-deleted-worksheets read, assembled by the pure `buildWorksheetTree`
  (`lib/worksheet/project-tree.ts`), and threaded through `EditorApp` →
  `LeftPanel`. Clicking a sheet client-navigates via `next/navigation`; folders
  default-open along the current sheet's ancestor chain. No client Supabase calls,
  no `localStorage` for open state (React state only).
- **"+ heading" needed a dedicated `INSERT_HEADING` reducer action.**
  `INSERT_REGION` can't set `heading` atomically and doesn't return the new id, so
  a follow-up `SET_REGION_PROP` couldn't reach it; `INSERT_HEADING` mirrors
  `INSERT_REGION_WITH_SOURCE`, creating an H1 text region and opening it for edit.
- **Scroll-to-region** adds a stable `region-<id>` DOM id to the region wrapper and
  a `scrollToRegion` helper (`block: "nearest"`, reduced-motion aware, no-op when
  the node is absent — e.g. inside a collapsed area); panel rows call it after
  `SELECT` on the next animation frame.
- **`.lp-row` hover wash lives in `editor.css`, and non-active rows omit the inline
  background** (the mockup's inline `transparent` would override the `:hover`
  rule), so the hover only applies where intended while active rows keep their
  inline `accent-tint`.

## Ribbon (M5 · Func §5.2 + Claude Design `ribbon-app.jsx`)

- **Full ribbon ported as a folder, not one file.** `components/editor/ribbon.tsx`
  (Home/Insert-only stub) is replaced by `components/editor/ribbon/` —
  `index.tsx` (shell: tab strip + collapse + active tab), `primitives.tsx`
  (typed `Group`/`BigBtn`/`SmBtn`/`Stepper`/`DropField`/`ColumnsPicker`/
  `RowsColsPicker`/`Tile`/…), `glyphs.tsx` (STIX math glyphs), `tabs.tsx` (all 11
  tab bodies), `quick-access.tsx`, and `commands.ts`. `editor-app.tsx` imports
  `./ribbon` unchanged (resolves to `index.tsx`).
- **One typed command dispatcher — `useRibbonCommands()`.** Every control fires a
  `cmd.*` that maps onto the existing reducer actions / provider helpers
  (`recalculate`, `setMode`) / the math-entry bridge; `sel.*` reflects the current
  selection (region type, decimals, show-steps, border, row columns, calc mode,
  units system, comments-open, isPlot) so controls render the right
  active/value/enabled state. Mutations gate on `canEdit`; `New comment` on
  `useComments().canComment`; view/nav (tab switch, collapse, recalc, reference,
  units cycle, comments panel) stay enabled.
- **Math-operator groups drive natural entry via a shared bridge.** New
  `components/editor/math-entry.ts` (`insertIntoActiveField`) inserts a LaTeX
  template into the focused MathLive `<math-field>` (`executeCommand(["insert",…])`,
  detected by tag name — no `mathlive` import, SSR-safe) or plain text into an
  `<input>`/`<textarea>`. `keypad.tsx` was refactored onto it (so the keypad now
  also works in the 2D math field). Operator/matrix tiles use
  `onMouseDown`+`preventDefault` so they never steal field focus; with no field
  focused they fall back to opening a seeded math region. Templates
  (`OPERATOR_TEMPLATES`, `MATRIX_TEMPLATES`, `matrixLatex/Source`) are pure and
  unit-tested.
- **Honest wiring vs. faithful placeholders.** Wired to real features: region
  inserts, decimals, show-steps, region border, indent/outdent, row columns, span,
  calc mode, recalc/to-here, function/unit/constant reference, comments panel,
  operator/structure/matrix inserts, evaluation glyphs, and the units-system
  cycle. Controls with no backing feature yet (clipboard, sketch, page setup /
  margins / headers, TOC / go-to-page, track changes / compare / spell / lock,
  multithreading / solver options, trace style, find, text styles, bold/italic/
  underline, color, align, conditional format) render faithfully but `disabled`
  with a "— coming soon" tooltip rather than faking behaviour.
- **Plot tab's Traces/Axes/Chart groups are contextual.** They render only when a
  plot region is selected (`sel.isPlot`) — the contextual *appearance* is the
  wired behaviour; their inner controls are disabled until plot editing ships.
- **`findRowOf(content, id)` added to `flatten.ts`** (pure, descends into areas)
  so the column controls target the selected region's row and the picker reflects
  its count.
- **Quick-access strip built but not mounted.** The component
  (`ribbon/quick-access.tsx`) is fully wired and exported, but no new chrome
  toggle is added to switch the editor into it this pass — the design export shows
  it only on a spec board, and the collapsed ribbon already covers reclaiming
  vertical room. Mounting it behind a preference is a later follow-up.
- **~45 ribbon icons added to `icons.tsx`**, path data ported 1:1 from
  `ribbon-icons.jsx` (same 24×24 / 1.5px wrapper). `IconName` being a
  `Record`-keyed union makes typecheck enforce that every glyph exists.

## Workspace admin (§4.11 / Func §4.11)

- **No new migration.** The existing schema already supports everything:
  `workspace_members` carries `role`/`status`/`invited_email`/`invited_by`, the
  `member_status` enum has `active|invited|suspended`, RLS gates member
  INSERT/UPDATE/DELETE to owner/admin (`is_workspace_admin`), the
  `protect_last_owner` trigger blocks orphaning a workspace, the sign-up trigger
  (`handle_new_user`) already accepts pending invites on sign-in, and `audit_log`
  + its RLS exist. The feature is pure UI + Server Actions + queries on top.
- **Route gate + RLS.** `/admin` (in the `(app)` group) redirects non
  owner/admin to `/app`; RLS remains the real gate (every mutation is owner/admin
  only). Discoverability via a "Workspace admin" item in the user menu, shown only
  when `canAdmin` (passed layout → NavRail → UserMenu).
- **"Projects" column → "Worksheets owned".** The mockup shows a per-member
  project count + "manage projects" and an invite-time "Assign to projects"
  picker, but there is **no project↔member assignment** in the schema. We show the
  count of non-deleted worksheets a member owns (`worksheets.owner_id`, real data
  that also drives the ownership-transfer flow) and drop the project picker /
  "manage projects". The matrix's "partial = assigned projects only" stays as a
  documented capability state (display only).
- **"Last active" is derived from `audit_log`.** The latest audit `created_at`
  per actor (computed in JS over a bounded recent window, since PostgREST has no
  easy group-by), falling back to "Joined {date}" / "Invited {date}".
- **Owner role is editable in the table** (the mockup locks it) to support the
  required "downgrade owner who owns worksheets → transfer ownership" prompt. The
  last-owner safety net is the `protect_last_owner` trigger, whose
  `check_violation` (SQLSTATE 23514) we translate into a fixable message.
- **Ownership transfer is a prompt, not a hard block.** Demoting an owner who
  owns worksheets opens a dialog offering "Transfer & downgrade" (reassigns those
  worksheets' `owner_id` to a chosen owner/admin first) or "Downgrade anyway".
- **Seats are advisory.** Usage = active members vs `workspaces.seats`; inviting
  past the count warns but doesn't block (seats are consumed on acceptance).
- **Roles & permissions matrix is read-only** over `lib/workspace/capabilities`
  (the role→capability map). "Add custom role" is a disabled affordance. Members,
  Roles, and Audit log are built fully; the rest render the mockup's placeholder.

## Print / export preview (§4.10 / Func §4.10)

- **One renderer, two consumers.** `lib/export/document.tsx` (`ExportDocument`)
  is a pure, no-`"use client"` React component rendered both in the live preview
  overlay and on the server via `renderToStaticMarkup`. That shared path is what
  makes the PDF/HTML match the screen — math goes through `katex.renderToString`,
  which runs identically in Node and the browser.
- **Deterministic re-evaluation, never trust client results.** The server
  re-runs the pure engine (`evaluateForExport` = `evaluateSheet` over the flat
  region list with `SI_SYSTEM`, exactly as the editor does) from the worksheet's
  stored content. The on-screen preview reuses the editor's live `state.results`
  for zero-lag WYSIWYG; both come from the same pure pipeline, so they agree.
- **PDF via Puppeteer on the same HTML; Word/Excel are structured/linear.**
  `puppeteer-core` + `@sparticuz/chromium` renders the self-contained print HTML
  (true notation, native `@page` pagination, header/footer/page-numbers via
  templates). `docx`/`xlsx` (SheetJS) are value-faithful structured exports —
  math is linearized (`name := formula = result`), not 2D — which is the
  pragmatic standard and keeps numbers exact.
- **Self-contained HTML with inlined fonts.** `lib/export/html.ts` (node-only)
  rewrites KaTeX's `url(fonts/…woff2)` to base64 data URIs and inlines Geist
  Sans/Mono, so the artifact and Puppeteer's `setContent` need no base URL. STIX
  Two Text is fetched by `next/font` (not vendored), so the few inline operators
  using `--font-math` fall back to serif; the *math glyphs* are KaTeX's own
  embedded fonts, so notation is unaffected.
- **`react-dom/server` is dynamically imported.** Next rejects a static import of
  it in the server graph, so `buildExportHtml` is async and `await import()`s it
  (also keeps it out of any client bundle). PDF generation likewise dynamically
  imports chromium behind a node-only module, with `serverExternalPackages` set
  so it is never bundled.
- **Action for docx/xlsx/html, route handler for PDF.** Lightweight formats use
  the established Server Action pattern (`server/actions/export.ts`); PDF needs
  the Node runtime + a longer `maxDuration`, so it gets its own route
  (`app/api/worksheets/[id]/export/route.ts`). Both share `runExport`, which
  enforces the gate server-side on every request.
- **Preview pagination is a scroll-window clip, exact breaks come from the PDF.**
  The overlay measures the flowed body once and renders N page frames each
  showing a `translateY` window of the same content — paginated-looking without
  brittle client-side measurement of every region. UI copy says breaks are
  approximate; Puppeteer paginates the PDF precisely.
- **Export gate = view+ with a workspace opt-in for viewers.** New
  `WorkspaceSettings.allowViewerExport` (default off, on the existing Sharing
  section). Owners/editors always export; viewers/commenters only when enabled.
  Enforced in `page.tsx` (UI gate) and again in `runExport`/`isExportAllowed`
  (the hard gate). Artifacts land in the pre-existing private `exports` bucket
  under `${workspace_id}/…` (its RLS keys on the first path segment) and download
  via a 300s signed URL.

## Version history (§4.9 / Func §4.9)

- **A dedicated route, not a modal.** The mockup is a full-page three-panel
  screen (its own app bar with a "Back to worksheet" link), so it lives at
  `/w/[id]/history` — the global AppBar is already suppressed for `/w/*`
  (`conditional-app-bar.tsx`). Entry point is a "Version history" link in the
  editor app menu. A modal would not match the export.
- **Snapshots render through the real engine.** Each version's `content` is run
  through the pure, synchronous `evaluateSheet` (SI display) — the same core the
  editor uses — so historical textbook notation + results are faithful, not a
  separate renderer. Read-only region views (`history-region.tsx`) are a
  presentational copy of the editor's committed math/text views; table/plot/
  image/control reuse the existing render-only views.
- **Diff is a pure, tested util** (`lib/worksheet/diff.ts`): region-level by id +
  a stable content hash. An `area`'s hash excludes its nested `regions` so a
  child edit doesn't also mark the container changed (children are diffed
  independently via `walkRegions`).
- **All versions load with content up front.** The history page is a Server
  Component that loads every version's content, so selection / compare / synced
  scroll are pure client interactions with no round-trips. The live worksheet is
  prepended as a synthetic "Current draft" entry (sentinel id `current`); Name
  and Restore are disabled for it. Lazy per-selection content fetch is a future
  optimization (fine under last-write-wins, modest version counts).
- **Restore snapshots the current draft first** (`restoreWorksheetVersion`),
  then overwrites `worksheets.content`; both the snapshot insert and the update
  require owner/editor via RLS. `calc_status` is left as-is — the editor
  recomputes on next load (auto) or marks stale (manual), reconciling it.
- **Naming a version needed a new RLS UPDATE policy.** `worksheet_versions` had
  only SELECT + INSERT, so any UPDATE was denied. `0008_worksheet_version_update`
  adds an UPDATE policy gated to owner/editor (same as inserts). Timestamps are
  formatted server-side and passed as strings to avoid hydration drift.

## Shared (Func §3.8 / §4.8)

- **Worksheets only, active-workspace scoped.** `worksheet_collaborators` grants
  worksheets, not folders — there's no `project_collaborators` table — so the
  Shared tables list shared **worksheets** (the mockup's folder rows were
  illustrative). Like every other page it's scoped to the active workspace.
  *Shared with me* = my collaborator grants on sheets I don't own; *Shared by me*
  = sheets I own that carry ≥1 grant (no `granted_by` column, so ownership is the
  honest proxy for "I shared this").
- **Effective role in code, not per-row RPC.** "Your role" is the stronger of the
  explicit grant and the workspace-role baseline, computed by
  `lib/worksheet/roles.ts` (mirrors `worksheet_effective_role` in `0002_rls.sql`)
  to avoid an N+1 of RPC calls. RLS still enforces the real gate.
- **Last activity = `worksheets.updated_at`** (indexed, trigger-bumped) — the
  cheap, always-present signal — for the table column and the default sort.
- **The activity feed is real**, not mock: `getSharedActivity` unions recent
  `comments`, `worksheet_versions`, and `audit_log` share/role events for the
  visible sheets and folds them via the pure `lib/worksheet/activity.ts` mapper.
  Share mutations write `audit_log` (the table already has an INSERT policy), so
  sharing shows up in the feed; audit writes are best-effort so a logging hiccup
  never fails the mutation.
- **One reusable `ShareDialog`, self-contained.** Opened from the Shared page's
  *Manage access* and the editor app-bar's Share button (same props: worksheet
  id + name + `canManage`). It owns its own inline feedback (no toast-host
  dependency) so it drops into any surface; invite/role/revoke/link controls
  render only when `canManage` (sheet owner or workspace admin, per
  `worksheet_collaborators_write`). The editor computes `canManage` server-side
  (`role === 'owner' || is_workspace_admin`).
- **Data-layer MVP for invites & links (no external delivery).** Inviting a
  non-member inserts a *pending* grant (`invited_email`, null `user_id`);
  `0004_worksheet_invites.sql` extends `handle_new_user()` to claim those on
  sign-up, reusing M1's dedupe-then-attach pattern. *Copy link* ensures a
  `share_scope='link'` + `link_token` grant and copies the worksheet URL. **Out
  of scope (typed follow-ups):** real email delivery (SMTP/Resend) and a public
  unauthenticated `/shared/link/[token]` route to open link-shared sheets.

## Settings (Func §4.7)

- **Two stores, split by ownership.** Calculation + Units & formatting are
  **workspace defaults** that seed NEW worksheets — persisted to
  `workspaces.settings` (jsonb) and editable by **owner/admin only** (RLS
  `workspaces_update` is the hard gate; `updateWorkspaceSettings` also checks the
  role to return the app-voice message). Appearance (theme/density) + Editor
  (keymap) are **per-user**, persisted to `profiles.preferences` (jsonb) and
  editable by the user. No migration needed — both jsonb columns already exist.
- **Theme/density stay cookie-backed *and* are mirrored to the profile.** The
  live, no-flash mechanism remains the existing `PreferencesProvider`
  (`useTheme`/`useDensity`, cookie-seeded in the root layout); the Settings
  controls call those setters for instant application **and** write the value to
  `profiles.preferences` for cross-device persistence. The provider stays the
  source of truth for the currently-applied value, so the Appearance controls
  read live provider state (not the possibly-stale profile).
- **Live preview runs the real engine formatter.** The Units & formatting preview
  converts a 52 800 N sample to the chosen system's display unit
  (`toDisplayUnit`/`SI_SYSTEM`, or `Unit.to()` for USCS/CGS with a try/catch
  fallback) and formats it with `formatValue(value, toResultFormat(format))` —
  not the mockup's hand-rolled `formatResult`. The settings→`ResultFormat` map
  (`lib/settings/types.ts`) treats `decimals`/`sigfigs` as mutually exclusive
  (Auto sig-figs lets decimals drive) and derives the engine's single symmetric
  `expThreshold` from "use exponential above". Both exp thresholds and USCS/CGS
  are still stored for fidelity even though the engine currently models one
  threshold and only `SI_SYSTEM`.
- **Save patterns mirror the mockup.** Toggles/radios/selects/steppers save on
  change (optimistic, with rollback + error toast on failure); the free-form
  tolerance fields (`ctol`/`tol`/`maxIter`, `expHigh`/`expLow`) buffer into a
  draft, raise the sticky "unsaved changes" bar, and commit on **Save changes**.
  Instant saves strip uncommitted tolerance drafts from their payload
  (`withSavedTolerances`) so **Discard** stays meaningful against one jsonb blob.
- **The save-confirmation toast is the mockup's compact dark pill**, ported from
  the design export (settings.html), rather than the generic raised DS `Toast` —
  the pill *is* part of the official settings screen, so porting it is faithful
  to "match the mockup".
- **Reached from the user menu.** A "Settings" link sits in the existing
  bottom-of-rail user-menu popover (which already carries the gear icon); the
  page renders inside the `(app)` shell, so the outer `NavRail` is the layout's,
  and the island only owns the 244px settings sub-nav + content.

## Template gallery (Func §4.4)

- **"Your templates" = templates you authored, not a saved/bookmarked set.** The
  mockup's `SAVED_IDS` is placeholder; the tab maps to Func's "author" scope
  (`author_id = auth.uid()`), so no new table is needed. A favourites/bookmark
  collection is a separate future feature.
- **Filters are URL searchParams, server-rendered.** `/templates` is a Server
  Component that parses `tab/q/discipline/standard/type` via
  `templateFiltersSchema`; the client gallery only translates interactions into
  URL pushes. Filters are therefore shareable and RLS-scoped at the source. The
  filter chip values are **data-driven** (`getTemplateFacets` returns the
  distinct discipline/standard/type actually present), not a hardcoded list.
- **A `template_type` column was added (migration 0007).** The schema had
  discipline + standard but no type; the gallery's third facet needed one. The
  six public seeds are backfilled with a sensible type.
- **`usage_count` is bumped via a `SECURITY DEFINER` RPC
  (`increment_template_usage`), not a direct UPDATE.** `templates_update` RLS
  only lets the author / a workspace admin write a row, so a member using a
  *public* template they don't own would match no row. The function scopes its
  write to templates the caller may *read* (same predicate as
  `templates_select`), so it can only ever bump a count the user could already
  see. `createWorksheet` calls it best-effort after a template-seeded insert.
- **"Save as template" visibility maps the scope enum to the stored value.** The
  dialog offers `author | workspace | public`; `author` is stored as the
  existing `visibility = 'private'` (visible only to the author). This avoids a
  data/enum rename when RLS only special-cases `'public'`. `workspace_id` is set
  only for the `workspace` scope.
- **The Preview drawer reuses the editor's read-only renderer, not a new path.**
  It mounts `EditorProvider` + `Canvas` with `canEdit={false}` (Canvas already
  gates its edit chrome on `canEdit`; autosave is disabled), scaled into the
  drawer. That chunk (mathjs/KaTeX) is **lazy-loaded** via `next/dynamic` so it
  only ships when a template with real content is previewed — `/templates` First
  Load stays ~131 kB. When a template's content is empty (the current seeds), the
  body falls back to the seeded math-thumbnail "pages" matching the export.
- **Thumbnails are generated, not stored.** `TemplateThumb` renders one of 8
  textbook-math variants chosen deterministically from the template id (ported
  from `gallery-thumbs.jsx`). "Save as template" leaves `thumbnail_url` null —
  the deterministic renderer is the thumbnail; a stored image is a future path.
- **`featured` = Quanta-official (curated) templates** (`author_id is null`),
  since there's no `featured` column and the flag is decorative.
- **Drawer footer is trimmed to functional controls.** The export shows
  bookmark / copy-link / duplicate / use-template; bookmarking needs the
  out-of-scope favourites store and "duplicate" overlaps "use template", so the
  footer ships **Copy link** (a `?preview=<id>` deep link, honoured on load) +
  **Use template**. The card class is namespaced `tpl-gallery-card` so its hover
  rules don't bleed into the dashboard's `tpl-card`.

## MathLive natural 2D entry (Func §2 / Matrix G2)

- **MathLive is the primary math-entry surface; the mono field stays as a
  secondary toggle.** `components/editor/math-field.tsx` wraps MathLive's
  `<math-field>` web component; `MathEditor` (`regions/math-region.tsx`) now
  renders it by default with the entry-mode chip (`√x` active, `Aa` plain text)
  switching to the existing Geist-Mono input. Committed math is unchanged —
  still KaTeX from the engine's `tex`.
- **Canonical `region.source` stays engine plain-text; no `latex` field is
  added to the content tree.** MathLive is *seeded from* plain text and
  *commits back to* plain text, so the content schema, the round-trip save, the
  plain-text secondary mode, and the committed KaTeX render are all untouched.
  The alternative (storing LaTeX as the source) would have been lossy and forced
  every consumer to convert.
- **The LaTeX↔text converters live in `/lib/calc` (`latex.ts`), the engine's
  single source of truth.** `latexToSource` turns MathLive/mathjs LaTeX into the
  mathjs grammar (`\frac`→`(a)/(b)`, `\sqrt`/`\sqrt[n]`→`sqrt`/`nthRoot`,
  `\cdot`/`\times`→`*`, `\mathrm{kN}`→`kN`, `\_`/`_{}`→`_`, Greek, `\left/\right`
  stripped) and is defensive (never throws). `sourceToLatex` seeds the field via
  mathjs `toTex` + a rebuilt `name := …`. `normalizeSource` now routes input
  carrying a backslash/brace/`~` through `latexToSource` — the documented seam,
  also a safety net if LaTeX reaches the engine directly. The editor's commit
  path normalizes up front, so stored sources are always plain text. Exotic
  LaTeX (matrices, integrals, `cases`, feet-inches `5 ft 6 in`) is deferred.
- **MathLive config is derived from `lib/keymap`** (`mathlive.ts`,
  `mathfieldOptionsFromKeymap`) so both keymaps drive entry from one source:
  MathLive's native `/`,`^`,`_`,`\`,Space cover most moves; we add the `:`→`:=`
  (Mathcad) / `:=` (Default) assign, explicit fraction/root/Greek chords for the
  Default profile, and curated multi-letter unit inline shortcuts (`kN`,`MPa`,…)
  so unit tokens stay upright. The keymap layer takes no dependency on the
  `mathlive` package (stays portable); the editor casts onto MathLive's types.
  Keymap selection in Preferences is still a later item — MathLive uses
  `DEFAULT_KEYMAP_ID` today but is built to accept either keymap.
- **MathLive is loaded client-only via a dynamic `import()` inside an effect**
  (never a top-level import) because it touches `window` and registers a custom
  element at import — a static import would break `next build`/SSR. The build
  confirms it code-splits into its own async chunk (loaded only when editing),
  so the editor's first-load bundle is unchanged.
- **MathLive fonts are served locally from `/public/mathlive/fonts`** (copied
  from the package; `fontsDirectory` set, `soundsDirectory` null) rather than a
  runtime CDN — self-contained, ~300 KB, and only the edit field uses them
  (committed math is KaTeX). Toggling entry modes uses `onMouseDown`
  `preventDefault` on the chip so the active field never blurs/commits mid-toggle.

## Math region — mockup-fidelity polish (Mockup 6.1)

- **Inline operator palette while editing (Frame A).** `MathEditor` now stacks a
  `MathPalette` (the 10-key bar + typing hint) beneath the field. Keys insert
  through the existing `insertIntoActiveField` bridge (the same one the floating
  `Keypad` and the ribbon use) on `onMouseDown` + `preventDefault`, so they land
  at the caret of whichever surface is focused (MathLive *or* the mono field) and
  never blur/commit. The palette and the global keypad **coexist** — the keypad
  stays the always-available, draggable surface; the inline bar is the per-edit
  affordance from the mockup. Palette data + the result split live in the pure,
  node-testable `regions/math-display.ts` (no JSX/React/katex), so vitest covers
  them without a DOM (`environment: "node"`; no jsdom/RTL in the repo).
- **Show-steps is the stacked three-line breakdown (Frame C),** not an inline
  run: `name := formula` / `Substituted` (muted) / `Result`, each section after
  the first separated by a dashed hairline, with eyebrow headers. Gated on
  `display.substituted && result.substitutedTex`; otherwise the compact one-line
  form (Frames B/E) renders. Added a `muted` prop to `KatexMath` (`.ed-katex.is-muted`)
  because `.ed-katex .katex` pins the colour and an ancestor style can't override it.
- **The result unit is its own token (Frame C `ResUnit`).** `splitResultUnit`
  separates magnitude from unit (only when `isUnit(value)`; mathjs formats units
  as `"<n> <unit>"`, so a first-space split is lossless) and renders the unit as a
  smaller upright **sans** sub-span inheriting the pill tone.
- **Units are NOT recoloured inside the committed KaTeX *formula*.** mathjs `toTex`
  emits units as `\mathrm{…}` — indistinguishable from `\mathrm{…}` function names —
  so editor-side tinting would mis-colour functions. Honouring "no engine changes",
  the unit-token treatment is applied where the value/unit split is reliable (the
  result pill). Tagging units in `toTex` (e.g. `\class{q-unit}{…}`) is a deferred
  engine follow-up that would let the formula itself carry the green unit token.

## Worksheet editor (Func §4.3 / §5.x)

- **The content tree is formalized here, not in `/lib/calc`** (closing the M2
  seam). `lib/worksheet/content.ts` holds the Zod schema + types (`rows →
  columns/cells → regions`); `lib/worksheet/flatten.ts` is a pure tree↔engine
  bridge (`flattenToRegionInputs` walks reading order — rows top→bottom, cells
  left→right, descending into areas — emitting one `RegionInput` per **math**
  region; `mapResults` indexes results by id). `/lib/calc` stays decoupled and
  consumes only the flat list.
- **Non-lossy round-trip.** Render-only region payloads (table/plot/image/
  control/area/include/solve) are `.passthrough()` in the schema so a load→save
  never strips fields the editor doesn't yet deeply edit. `parseContent` never
  throws into the UI (falls back to an empty doc) and repairs the
  `cells.length === columns` invariant by widening columns / padding cells —
  never dropping a region.
- **Span has one canonical model: a spanning region is the sole region of a
  `columns:1` row.** No separate `span` flag — `TOGGLE_SPAN` extracts the region
  into its own single-column row. Keeps reading order and recalc deterministic.
- **State = `useReducer` + Context; the `CalcEngine` lives in a ref behind a
  side-effect bridge.** Structural ops mutate the tree via `structuredClone`
  (infrequent, click-driven — correctness over hand-threaded immutability) and
  are exhaustively unit-tested (`editor-reducer.test.ts`). The provider effect
  reconciles the engine from `content`: **Auto** recomputes and publishes
  results; **Manual** marks the edit stale and waits for Recalculate /
  recalc-to-here. Recalc is **commit-driven** (Enter/blur), not per-keystroke —
  the engine's debounce hook is reserved for a future live-typing mode.
- **KaTeX renders the engine's TeX** (`RegionResult.tex` / `substitutedTex`) so
  any user formula renders faithfully; `throwOnError:false` + a guard degrade a
  bad string to raw text rather than blanking a region. The hand-composed STIX
  primitives stay for static/mockup content. **MathLive** 2D entry is a deferred
  seam (editing is a Geist-Mono field with the Mathcad `:`→`:=` transform from
  `lib/keymap`); it slots in by replacing the mono input + filling
  `normalizeSource` in `lib/calc/parse.ts`. Added `katex` + `@types/katex`.
- **Autosave** debounces ~1.2s on `saveState:'unsaved'`, sets Saving/Saved/
  Unsaved/Error, and **flushes the pending save on unmount** (navigation never
  drops the last edit). Reads content/status from a ref so it never persists a
  stale closure. `saveWorksheet` writes `content + calc_status + error_count`
  (the `worksheets_set_updated_at` trigger bumps `updated_at`); a 0-row update
  for a loaded sheet ⇒ the role can't edit ⇒ app-voice read-only message.
  Last-write-wins (Yjs path later). Version snapshots via an explicit
  "Save version" (app-bar menu) → `saveWorksheetVersion`.
- **Presence** joins a `ws:<id>` Realtime channel via the browser client and
  degrades to no-op when the Supabase env is absent (never crashes the editor).
- **Read-only** for viewers/commenters is gated in the UI (chrome hidden/
  disabled, no editing, autosave off) **and** by RLS on every mutation. The
  global AppBar is suppressed on `/w` (editor owns its chrome), like `/app`.
- **Scope (core-first):** math + text/heading fully editable + all structural
  ops (add/move/delete/indent/columns 1–3/span/duplicate, drag-reorder incl.
  across cells); table/plot/image/control/area render faithfully (area
  collapsible) with payload editing deferred; single growing page (pagination
  later); ⌘K palette, Share/Comments/AI deferred (present but disabled). `forall-
  people` is not in scope; units stay mathjs (main thread, SI wired; USCS/CGS are
  display selections).
- **vitest `@/` alias added** (`vitest.config.ts`) so tests can value-import app
  modules (the reducer pulls in `@/lib/worksheet/*`); calc tests use relative
  imports and are unaffected.

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

## Reference library (§4.6 / Func §3.6)

- **The catalog ships as in-code data, not a DB table.** Functions live in
  `/lib/calc/reference/functions.ts`, units in `/lib/units/catalog.ts`,
  constants in `/lib/constants/catalog.ts`; `/lib/calc/reference/tree.ts`
  assembles the category tree + flat `ALL` + lookup indices. Pure data, imported
  directly — no query, no RLS, no network.
- **Worked examples are run through the engine, never hard-coded.**
  `runExample()` (`/lib/calc/reference/examples.ts`) feeds a `WorkedExample`'s
  region sources through `evaluateSheet`, so the rendered value is the engine's
  output and can't drift. The integrity test asserts every example evaluates
  cleanly and pins a few known results (`sqrt → 12.53 mm`, `mean → 12.85 kN`,
  `interp → 0.90 kPa`, `g0 → 735.5 N`).
- **Examples use engine-native math where the engine lacks the function.** The
  engine is stock mathjs, which has `mean/max/sqrt/std/…` and full unit
  arithmetic but not Mathcad's `interp/Vlookup/root/Odesolve`. Those entries
  still teach the real function (signature, params, prose) while the example
  demonstrates the *operation* with engine-native expressions (e.g. `interp` via
  explicit linear-interpolation arithmetic), keeping the rendered result honest.
- **Only engine-known units are catalogued.** Every unit's `insert` is a
  mathjs-valid literal (`"1 mm"`, `"1 degC"`), so dropping it at the caret
  evaluates immediately. USCS units mathjs doesn't register (kip, ksi) are
  deferred until the engine registers them, rather than inserting tokens that
  would parse-error.
- **A dedicated `INSERT_REGION_WITH_SOURCE` reducer action** sets the new math
  region's source in the same mutation and returns its id synchronously in
  `selectedId` — avoiding the async hazard of dispatching `INSERT_REGION` then
  trying to `EDIT_SOURCE` an id we don't yet hold.
- **One browser, two hosts.** `components/reference/reference-library.tsx` is a
  reusable 3-pane component; the editor hosts it in a near-full-screen overlay
  (`components/editor/reference-overlay.tsx`, launched from the ribbon Insert
  buttons) with an "Insert into worksheet" action, and `/reference` (inside the
  `(app)` group, inheriting the real nav rail) hosts it with a copy-to-clipboard
  action. A custom overlay is used rather than the DS `Dialog` because the dense
  edge-to-edge 3-pane needs full height and no body padding.

## Editor app bar (M5 · Func §5.1)

- **Ported `app-bar.html` faithfully** (`components/editor/app-bar.tsx`): the 40px
  bar — menu · wordmark · editable title · lock · live autosave on the left;
  Auto/Manual · Recalculate · calc-status chip in the center; Present · Share ·
  comments · AI · presence avatars on the right.
- **Share button is `primary`** (blue), per the mockup — precedence "visual look →
  the export" (CLAUDE.md), overriding the earlier secondary styling.
- **Lock icon shows when `!canEdit`** (viewer/commenter), tooltip "Shared ·
  read-only for viewers"; the title input is also disabled in that state.
- **Title rename is debounced (~600ms)** while typing and committed immediately on
  blur / Enter (Func §5.1 "debounced rename"), through the provider's `rename`
  → `renameWorksheet` server action.
- **Autosave indicator** reads `state.saveState`: animated spinner (saving), bold
  mono `*` (unsaved), check (saved), plus a fourth `error` case ("Couldn't save —
  retry") not in the specimen but needed by the real save queue. The spinner uses
  a new `spinner` glyph + `.q-spin` keyframe in `editor.css`, disabled under
  `prefers-reduced-motion`.
- **Calc-chip wording aligned to the mockup**: "All current" / "Needs recalculate"
  / "N error(s)" (keeping the live error count from the engine).
- **Tooltips use the DS `Tooltip` with `side="bottom"`** so they sit below the
  40px bar (matching the mockup); `IconButton`'s built-in tooltip is top-anchored
  and would clip above the bar.
- **Comments / AI buttons now open docked right-edge drawers** (Func §5.1
  "buttons open panels"), superseding the earlier no-op stub. A new reducer UI
  field `rightPanel: "none" | "comments" | "ai"` (toggled via
  `TOGGLE_RIGHT_PANEL` / `CLOSE_RIGHT_PANEL`, mutually exclusive) drives a
  `RightDrawer` that sits beside the inspector; the buttons show the DS active
  (blueprint-tint/solid) state while their drawer is open.
  - **Comments panel is fully wired to real data.** A `CommentsProvider` client
    store is seeded server-side by `getWorksheetComments` (RLS-scoped, author
    identity stitched in one `.in()` hop), and `addComment` / `setCommentResolved`
    server actions (Zod-validated, RLS-gated) handle posting and resolve/reopen
    with optimistic update + revert-on-error. New notes anchor to the selected
    region (or the `"worksheet"` sentinel — `region_id` is free text). The
    app-bar comments badge now shows the live **open (unresolved) count** from
    the provider, restoring the mockup's count pill. `canComment` (commenter+)
    gates the composer; pure helpers (`openCommentCount`, `sortCommentsAsc`,
    `upsertComment`, `reidComment`) are unit-tested.
  - **AI panel is an honest preview shell.** The assistant ships in M11
    (export/AI); rather than fake responses, the drawer shows what Quanta AI will
    do, suggestion chips, and a composer that reports it isn't connected yet.
    Flagged "Preview".
- **Present stays a non-destructive stub** (present mode is a later milestone; not
  in the §5.1 button-panel list). Share remains fully wired (opens `ShareDialog`).
- **Two small editor icons added** (`x`, `send`, plus `checkCirc` for resolve) to
  the editor icon registry, matching the Lucide 1.5px line set.
