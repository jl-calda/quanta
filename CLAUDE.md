# CLAUDE.md — Quanta

Project memory for Claude Code. Read this first, every session. It carries the **design system**, the locked decisions, the engineering standards, and a map to the full specs. The design language below is ported from the **Claude Design export** (`mathcad-like/project/_ds/`); treat it as binding.

---

## Product

**Quanta** is a multi-tenant web app for engineering calculations — a hybrid of **PTC Mathcad Prime** and **BlockPad**. Practicing engineers (structural, civil, mechanical) write live math in a document; formulas parse, **track units**, render as **textbook notation**, and **recalculate like a spreadsheet**. Output is precise and trustworthy enough to hand to a client or a checker.

---

## How to work here (golden rules)

- **Match the design system exactly** (below). Port the `_ds` tokens; reuse the components; **never invent a new visual language**.
- **`ultrathink`** before planning a milestone or making a non-obvious decision.
- **Stay focused;** within a task make reasoned decisions instead of asking — log any non-obvious assumption in `DECISIONS.md`, and commit per task.
- **RLS on every query/mutation** + UI gating by role. **Zod** validate all inputs. **Server Components** for reads, **Server Actions** for mutations.
- **The calc engine is pure/deterministic** (`/lib/calc`) and identical on client, worker, and Node. Unit-test it first.
- **Verify before commit:** typecheck → lint → test → production build. Never commit a broken state. Errors surface in the app's voice (specific + fixable), never raw Postgres.
- **No `localStorage`/`sessionStorage`** in client components — use React state or Supabase.

---

## Stack & locked decisions

- **Next.js (App Router) + TypeScript + Tailwind**; **Supabase** (Postgres/RLS/Auth/Realtime/Storage/Edge Functions) via `@supabase/ssr`.
- **Calc engine = layered** (Functional Brief §2): `mathjs` (parse, numeric, units, matrices, `toTex`) on the main thread; **SymPy + NumPy/SciPy via Pyodide** in a **Web Worker** (symbolic algebra + heavy numeric + the same runtime powering Python scripted controls/script modules); **MathLive** (the primary editor — natural Mathcad-style 2D math entry); **KaTeX** (render). Pure module in `/lib/calc`.
- **Input model — natural Mathcad-style entry, unit-aware (PRIMARY):** engineers type into a region and 2D notation builds live (`/`→stacked fraction, `^`→superscript, `_`→subscript, function/Greek names→symbols, space exits a subexpression, `:`→`:=`); MathLive is configured for this behavior. A plain-text formula mode is **secondary/optional**. Formulas are **unit-aware like Mathcad** — `12 kN` / `700 MPa` / `16 mm` / `5 ft 6 in` attach units; the engine runs dimensional analysis, auto-converts, flags mismatches inline, and every result carries + displays its unit in the worksheet's unit system. Units flow through functions, tables, matrices, solve blocks, and plots. A **Mathcad-style keymap** drives entry (`:`→`:=`, `/`→fraction, `^`/`_`, backslash→√, `.`→literal subscript, **Space = expand selection**, Ctrl+G→Greek, F9→recalc), defined once in `/lib/keymap` (it also feeds the shortcuts reference modal) and selectable in Preferences (Mathcad default / Default).
- **Fonts:** Geist Sans (UI) · Geist Mono (formula-edit/code/cells) · STIX Two Text (rendered math).
- **Canvas = hybrid flow:** reading-order rows → each row 1–N columns → regions can span all columns → regions can indent. **No free placement.** **Chrome = full ribbon** (collapsed-ribbon is a secondary state only).
- **Document content = one JSONB tree** (`worksheets.content`: rows → cells → regions). **Collab MVP** = autosave + presence + last-write-wins; Yjs CRDT later.

---

## Design system — "Precision instrument / engineering ledger"

**Source of truth:** `mathcad-like/project/_ds/quanta-design-system-*/` — link its `styles.css`, read its `readme.md`, reimplement components from `_ds_bundle.js` as typed React. **Always prefer the semantic CSS variables** (`--surface-paper`, `--text-primary`, `--accent`, `--status-error`) over raw hex, so dark theme and retuning flow through.

### Direction
Calm, dense, authoritative — a precise drafting tool, **not** a consumer SaaS toy or generic dashboard. The memorable signature is the **live-math moment**: a typed, spreadsheet-style formula transforms into crisp textbook notation with a highlighted result and unit. A faint **blueprint dot-grid** sits under every worksheet. No bubbly cards, no oversized hero numbers, no gradients, **no emoji**.

### Color (light is default; dark = `[data-theme="dark"]`, hues lifted ~15% L)
Base palette → semantic aliases:
- paper `#FCFCFA` → `--surface-paper` (worksheets) · chrome `#F4F5F7` → `--surface-chrome` (ribbon/panels/bars) · raised `#FFFFFF` → `--surface-raised` (modals/menus) · hover `#ECEEF1` → `--surface-hover`
- ink `#15181D` → `--text-primary` / `--text-math` · muted `#6B7280` → `--text-muted` · inverse `#FCFCFA` → `--text-inverse`
- blueprint `#1F5FBF` → `--accent` / `--text-link` / `--focus-ring` (primary actions, links, selection, active-region outline) · tint `#E8F0FC` → `--accent-tint` · press `#18509F` → `--accent-press`
- pass `#1E8E5A` → `--status-pass` (results, OK/PASS) · warning `#C6890B` → `--status-warning` · error `#C2392B` → `--status-error`; soft tints `#E4F3EB` / `#FAF1DC` / `#F8E7E4` → `--status-*-bg`
- rule `#E2E5EA` → `--border-hairline` · rule-strong `#D2D6DD` → `--border-strong` · grid-dot `#D8DEE7` → `--grid-dot`
- Dark: paper `#14171C` · chrome `#1B1F26` · rule `#2A2F38` · ink `#E8EAED` · muted `#99A1AD` · blueprint `#5B9BFF` · tint `#1B2A40` · pass `#46B07C` · warning `#E0A93A` · error `#E0685B`.
Imagery (rare) is cool/technical — blueprints, line drawings, CAD — never warm lifestyle photography.

### Typography (each family has one job)
- **Geist Sans** — all UI, labels, body. Hierarchy via **weight + size**, never a separate display face. `--font-sans`.
- **STIX Two Text** — rendered math notation; **the product's voice** (true stacked fractions, radicals, integrals, subscripts). `--font-math`.
- **Geist Mono** — formula editing, code/scripts, table cells. Edited region = raw formula in mono; committed = STIX notation above. `--font-mono`.
- Scale: **11 / 12 / 13 / 14 / 16 / 20 / 28** px. Body 13–14. Weights 400/500/600/700. **Sentence case** everywhere; the only uppercase is the **eyebrow** (11–12px tracked `0.08em`, `.q-eyebrow`) and short status tags (OK/PASS/FAIL). Math never below 24px; 11px floor on UI.

### Spacing · shape · elevation · motion
- Spacing **4 / 8 / 12 / 16 / 24 / 32**. Dense but breathable; optimize editors for **≥1440px**, multiple panels visible.
- Radii: **4px** (inputs/buttons/regions) · **6px** (panels/cards) · **8px** (modals). Pill (`999px`) only for the switch knob. Precise, not bubbly.
- **1px hairline borders** (`--border-hairline`) do the structural work. Shadows restrained: none on chrome, `--shadow-sm` (raised), `--shadow-popover` (menus/tooltips), single soft `--shadow-modal` (dialogs). No glow, no stacked drop-shadows, no colored left-border cards.
- **Dot-grid** `.q-grid` — 16px radial dots in `--grid-dot` — the signature canvas texture. No gradients/photo heroes/noise.
- Motion: **90ms** hovers, **150ms** state changes, **240ms** the edit→commit math transform. Ease-out (`--ease-out`); no bounce, no infinite loops; respects `prefers-reduced-motion`.

### Components (namespace `window.QuantaDesignSystem_019e2c`; reimplement as typed React, match output — exact props in `_ds_bundle.js`)
- **core/** — `Button` · `IconButton` · `Badge` (tones `neutral|accent|pass|warning|error`, variant `soft|solid`, 4px radius, h19, optional dot) · `Card` (hairline + 6px on chrome; flat by default, raised = `--shadow-sm`)
- **forms/** — `Input` · `Select` · `Checkbox` · `Switch`
- **navigation/** — `Tabs`
- **feedback/** — `Dialog` (single `--shadow-modal`, scrim) · `Toast` · `Tooltip`
- **math/** — `MathRegion` (the signature) + notation primitives `Var` `Sub` `Sup` `Frac` `Sqrt` `Op` `Unit` `Math`
- **ui_kits/editor/** — `AppBar` · `EditorApp` · `InspectorPanel` · `OutlinePanel` · `Ribbon` · `Worksheet` (high-fidelity editor recreation)

### Iconography
Thin-stroke **1.5px line icons**, geometric, rounded caps — Lucide / Phosphor-light family. Monochrome, inherit `currentColor`. **No** filled/duotone/skeuomorphic icons. Unicode math symbols (√ π · ≤ ² Σ ∫) are **typography** (STIX), not icons. Canonical set: **Lucide (light, 1.5px)** until Quanta ships its own sprite — flag any substitution.

### Logo
A rounded-square calc region containing a fraction rule and a green result dot — a calculation cell in miniature. Assets: `quanta-logo.svg` / `quanta-logo-dark.svg`. Clear space = the mark's corner radius; recolor only within blueprint/ink/pass.

### Voice & content
Sentence case. Active verbs that name the outcome — "Recalculate", "Insert plot", "Share worksheet", **not** "Submit/OK/Done/Go". Errors say what's wrong **and how to fix it**, in the app's voice ("Units don't match: left is kN, right is mm. Check the expression."), never "Oops/Something went wrong/Invalid input". Empty states = one primary action ("No regions yet. Add your first calculation." + **Add region**). Results always carry units (SI: kN, kN·m, MPa, mm); utilization as a ratio to two decimals (0.85), not %. No emoji.

### Interaction states & accessibility (floor)
Hover → surfaces wash to `--surface-hover`, links underline. Press → primary deepens to `--accent-press`, nudges 0.5px down (no scale toys). Selected/active → blueprint-tint fill + 1px blueprint outline (regions) or solid blueprint (toggles/active icon buttons). **Focus → visible 2px blueprint ring, 1px offset, on every interactive element — non-negotiable.** AA contrast throughout; `prefers-reduced-motion` honored; every icon-only control has a tooltip + accessible label.

---

## Calc engine (the crux) — detail in Functional Brief §2
Pipeline: parse (mathjs) → dependency graph → topological sort → dirty-track → recalculate (Auto/Manual; recalc-to-here). **Input = natural Mathcad-style 2D entry via MathLive (primary; plain-text formula secondary)** → units-aware AST → recalc → `toTex` → KaTeX/STIX render (rendered math ≥ ~18–20px). Units checking/conversion on every value, like Mathcad (incl. feet-inches & custom units). Result formatting (decimals/sigfigs/notation/radix/fractions). Show-steps substitution. Conditional formatting. **Symbolic** via Pyodide/SymPy (solve, simplify, factor, expand, diff, integrate, limit, series, dsolve, transforms, gradient, assume, decomp). **Scientific numeric** via NumPy/SciPy (solving, optimization, ODE/PDE, curve fit, statistics, signal/image, DOE, goal-seek). Typed error model surfaced per region. Build pure, test exhaustively, run heavy work in the Web Worker.

## Data model & security — detail in Functional Brief §1
Multi-tenant: every row carries `workspace_id`. Core tables: profiles, workspaces, workspace_members (roles), projects, worksheets (JSONB `content`), worksheet_versions, worksheet_collaborators, comments, templates, tags, unit_systems, audit_log. RLS on everything via helper functions (`is_member`, `member_role`, effective `worksheet_role`) **plus** UI gating. Seven workspace roles (owner/admin/engineer/reviewer/viewer/billing) + four worksheet roles (owner/editor/commenter/viewer).

---

## Specs map (precedence)

| Spec | Role |
|---|---|
| **Claude Design export** (`mathcad-like/`: README, `chats/`, `project/*.html`, `project/*-app.jsx`, `project/_ds/`) | **How it LOOKS** — recreate screens faithfully, port `_ds` tokens/components |
| **Functional Build Brief** | **How it's BUILT** — §1 schema/RLS/auth, §2 engine, §3–§7 per-screen, §8 order |
| **Feature Coverage Matrix** | **WHAT must exist** — feature checklist + Part C gap-fill prompts + Part A engine |
| **Mockup Brief** | Design intent per screen/component |
| **Autonomous build prompt** | The run-to-completion build order |

**On conflict:** features → Matrix · build approach → Functional Brief · visual look → the export.

---

## Build workflow
Milestones **M0–M11** (scaffold → schema/RLS/auth → calc engine → DS components + screens-index → editor shell → math region → region types → pages → modals → gap features → export/AI → hardening). Drive them from `quanta-build-tracker.html` — one row per page/component, each carrying its design + feature prompt; work top to bottom. Every task: implement → typecheck/lint/test/build → fix → commit.
