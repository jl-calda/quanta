# Quanta — Claude Design Mockup Brief

> **What this is.** A complete, paste-ready set of prompts for mocking up an engineering calculation app that fuses **PTC Mathcad Prime** (whiteboard worksheet, ribbon, typed regions, units systems, advanced controls, result formatting) with **BlockPad** (word-processor document feel, press-`=` formulas that render as math notation, inline named values, units intelligence, native spreadsheets, show-steps, conditional formatting, AI assist).
>
> **Working name:** *Quanta*. Rename freely (swap the word "Quanta" everywhere). If this is a companion to your akro platform, align the branding accordingly.
>
> **Target:** a modern **web app** (desktop-class density), not a Windows desktop port — but it keeps the information density and power of the desktop references.
>
> **Locked decisions (v1).** (1) **Canvas = hybrid flow.** Content flows top-to-bottom in reading-order *rows*; any row can split into **1–N columns** (default 1, common 2) so a region can sit beside another (equation + note, or two parallel calcs); a region can **span all columns** (headings, plots, wide tables); regions can be **indented** in steps within a column (sub-steps/derivations). **No free placement** — snapping is to columns and indent stops, which keeps recalc order predictable (top-to-bottom by row, left-to-right within a row). (2) **Chrome = full ribbon.** The compact toolbar is only the *collapsed-ribbon* space-saving state, not an alternative primary chrome.

---

## 0. How to use this document with Claude Design

1. **Start a Claude Design project.** Paste **Section 1 (Master Design System)** as the very first message so it becomes persistent context. Everything else assumes it.
2. **Then paste one item prompt at a time** (a page, a modal, or a component). Each prompt is written to stand on the shared design system, so you don't need to re-paste tokens.
3. **Each item** has: a one-line **Purpose**, a fenced **Prompt** (copy the whole block), and short **States / notes** where useful.
4. **Suggested build order** is in Section 9. The single highest-leverage screen is the **Worksheet Editor (4.3)** and the **Math region (6.1)** — do those first; they define the product.
5. Sample content throughout uses **your domain** (height-safety / access systems: anchor-point loads, lifeline spans, guardrail checks, ladder loads, SS316 fasteners) so mockups look real and relevant. Swap if you want neutral examples.

---

## 1. Master Design System  *(paste first)*

```
You are designing "Quanta", a web-based engineering calculation app — a hybrid of Mathcad Prime and BlockPad. Engineers write live math inside a document; formulas render as clean textbook notation, track units, and recalculate like a spreadsheet. The audience is practicing engineers (structural, civil, mechanical) who value precision, density, and trustworthy output they can hand to a client or a checker.

Use this exact design system for every screen unless I say otherwise.

DESIGN DIRECTION — "Precision instrument / engineering ledger."
Calm, dense, and authoritative. It should feel like a precise drafting tool, not a consumer SaaS toy and not a generic dashboard. No rounded "bubbly" cards, no oversized hero numbers, no playful gradients. The memorable signature is the live-math moment: the engineer types math naturally (Mathcad-style 2D entry — fractions stack, subscripts and exponents form as you type), crisp textbook notation builds live, and a highlighted result carries its unit. The canvas carries a faint blueprint dot-grid.

COLOR (light theme, default):
- Canvas / paper:        #FCFCFA  (worksheet pages — near-white warm paper)
- App chrome surface:    #F4F5F7  (ribbon, panels, bars)
- Surface border / rule: #E2E5EA  (hairline 1px dividers, region borders)
- Ink (primary text/math):#15181D (near-black for equations and body)
- Muted text:            #6B7280
- Accent — "Blueprint":  #1F5FBF  (primary actions, links, selection, active region outline)
- Accent tint:           #E8F0FC  (selected-region fill, hover)
- Result / pass:         #1E8E5A  (evaluated results, "OK/PASS" utilization)
- Warning:               #C6890B  (redefinition, near-limit utilization)
- Error / fail:          #C2392B  (unit mismatch, calc error, "FAIL")
Dark theme (offer as a toggle): canvas #14171C, chrome #1B1F26, border #2A2F38, ink #E8EAED, accent #5B9BFF, keep semantic hues but lift lightness ~15%.

TYPOGRAPHY:
- UI / labels / body:  **Geist Sans** (Vercel's geometric grotesque — clean, technical, with a wide weight range Thin–Black). Sentence case everywhere. Tight and precise; build hierarchy with weight + size rather than a separate display face.
- Math notation:       a true math/serif face — STIX Two / Computer Modern / Cambria Math look. Equations MUST look like a textbook (proper fractions, radicals, integral signs, subscripts), not like code. This is the product's voice — spend the typographic boldness here. (Geist is for the UI, never for rendered equations.)
- Formula-edit (secondary plain-text mode) + code/scripts + table cells: **Geist Mono** (the matching monospace — pairs perfectly with Geist Sans). The PRIMARY math entry is natural Mathcad-style 2D editing (notation builds live in the math face above); the optional plain-text formula mode and any code/cells use Geist Mono.
- Type scale (UI): 11 / 12 / 13 / 14 / 16 / 20 / 28. Body 13–14. Labels 11–12 uppercase-tracked for section eyebrows only.

LAYOUT / SHAPE:
- Radii: 4px (inputs, buttons, regions), 6px (panels/cards), 8px (modals). Precise, not pill-shaped.
- Borders: 1px hairline #E2E5EA. Use rules and borders to structure, not heavy shadows. Modals get a single soft shadow.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. Dense but breathable.
- Icon style: thin-stroke (1.5px) line icons, geometric, consistent set (think Lucide / Phosphor light).
- Density: desktop-class. Multiple panels visible at once. Assume a wide screen ≥1440px for the editor; design responsive fallbacks but optimize for desktop.

VOICE / COPY:
- Active voice, plain verbs. Buttons say what happens ("Recalculate", "Insert plot", "Share worksheet"), not "Submit".
- Errors explain what's wrong and how to fix it, in the app's voice, never apologetic or vague ("Units don't match: left side is kN, right side is mm. Check the expression.").
- Empty states are an invitation to act, with one primary action.

ACCESSIBILITY FLOOR: visible keyboard focus rings (2px accent), AA contrast, respects reduced motion, all icon-only buttons have tooltips/labels.

When you mock a screen, populate it with realistic ENGINEERING content (worksheets about anchor-point loads, lifeline spans, guardrail checks, beam capacity, SS316 fasteners) so it reads as a real tool — never lorem ipsum.
```

---

## 2. Product concept & core interaction model  *(reference — keep in mind, no mockup)*

Bake these mechanics into every relevant prompt so the product is internally consistent:

- **The document is a stack of pages** (A4/Letter) on an infinite vertical canvas with a faint blueprint dot-grid. Content lives in **regions** (a.k.a. blocks) arranged in a **hybrid-flow column grid:** regions flow top-to-bottom in reading-order **rows**; any row can be split into **1–N columns** (default 1; 2 is common) so regions sit **side by side** (e.g. equation left + note right, or two parallel calcs); a region can **span all columns** (headings, plots, wide tables); and a region can be **indented** in steps within its column (for sub-steps/derivations). Snapping is to **columns and indent stops** — not free placement — so **recalc order stays predictable** (top-to-bottom by row, left-to-right within a multi-column row).
- **Region types:** math, text (rich), table/spreadsheet, plot, solve block, image/sketch, input control, collapsible area, include/reference.
- **Math input (natural Mathcad-style, PRIMARY):** the user clicks (or types) to open a **math region** and enters math naturally — 2D notation builds live as they type (`/`→stacked fraction, `^`→superscript, `_`→subscript, function/Greek names→symbols, space exits a subexpression, `:`→`:=`), via a MathLive-style editor. A **plain-text formula** mode (`Sqrt()`, `Max()`, `Vlookup()`, `+ - * / ^`) is **secondary**. Values are **named inline** (`F_t := 12 kN`) and are **unit-aware** — `12 kN` / `700 MPa` / `16 mm` attach units, dimensional analysis flags mismatches inline, and every result carries its unit. Later regions reference those names.
- **Units intelligence:** units attach to numbers (`12 kN`), auto-convert, and are **checked**; mismatches flag inline. A worksheet has a **units system** (SI / USCS / CGS / custom).
- **Live recalculation:** changing any value updates all dependents. Supports **Auto** and **Manual** calc modes (Manual = a "Recalculate" button + per-region/up-to-here calc).
- **Show steps:** any result can expand to show the formula with values **plugged in**, then the result. The user controls which of {name, formula, substituted, result} are visible.
- **Conditional formatting & visibility:** results can restyle by value (e.g., red if utilization > 1.0); whole sections can hide/show based on a result or a dropdown.
- **Display constraint to honor:** a variable must be defined **earlier in reading order** — i.e. **above**, or **to the left within the same row** — before it's used. Surface this in error copy.

---

## 3. Information architecture (the full surface to mock)

**Pages (full screens)** — Section 4
1. Sign in / Sign up
2. Dashboard / Home
3. **Worksheet Editor** (core) — broken into editor zones in Section 5
4. Template gallery
5. File browser (projects & folders)
6. Function & units reference library
7. Settings / Preferences (full page)
8. Shared-with-me / collaboration
9. Version history (full view)
10. Print / export preview
11. Workspace / team admin (multi-tenant)
12. Empty-states catalog

**Editor zones (components inside the editor)** — Section 5
App bar · Ribbon (+ compact toolbar alt) · Left panel (outline/navigator/files) · Canvas · Right panel (inspector) · Status bar · Floating math keypad/operator palette · Command palette (⌘K) · AI assistant panel

**Core region/block components** — Section 6
Math region (5 states) · Text region · Table/spreadsheet · Plot · Solve block · Image/sketch · Input controls (7) · Collapsible area · Include/reference · Region chrome · Inline tokens & autocomplete · Inline error/warning badges

**Modals & dialogs** — Section 7
New worksheet/from template · Open · Save/Save As · Export · Insert function · Insert unit · Symbol/operator palette · Result format · Worksheet settings · Custom unit system · Headers & footers · Page setup · Insert plot wizard · Insert table/spreadsheet · Insert image · Insert control + script editor · Solve-block config · Conditional formatting · Text-style editor · Tag & internal link · Find & replace · Go to page · Share · Comments/review · Keyboard shortcuts · App preferences · Account/profile · Confirmations (unsaved/delete/overwrite) · Calc-error detail · AI assistant (modal mode) · Save-as-template · Onboarding tour

**Cross-cutting** — Section 8
Toasts · context menus · tooltips · loading/recalculation indicator · empty states · onboarding.

---

## 4. Page prompts

### 4.1 Sign in / Sign up
**Purpose:** Get the engineer into the app; convey "serious precision tool" in the first impression.

```
Design the Quanta authentication screen (light theme). Split layout: left 45% is a brand panel on a #14171C dark field showing the product wordmark "Quanta", a one-line value prop ("Engineering calculations that read like a textbook and recalculate like a spreadsheet."), and a quiet looping/visual motif of a live math region resolving from a typed formula to rendered notation with a units result — the signature moment, understated. Right 55% on warm paper #FCFCFA holds the form: tabbed "Sign in" / "Create account"; email + password fields (4px radius, hairline border, accent focus ring); a primary "Sign in" button in Blueprint #1F5FBF; "Continue with Google" and "Continue with SSO" secondary buttons with thin line icons; small links "Forgot password" and "Sign in with magic link". Footer: tiny links Terms · Privacy. Keep it restrained and credible. Show an inline error state example under the password field ("That password doesn't match. Try again or reset it."). Also produce the "Create account" tab variant (name, work email, company, password, a checkbox to agree to terms).
```

### 4.2 Dashboard / Home
**Purpose:** Landing after login — resume work, start new, browse templates and files.

```
Design the Quanta home/dashboard (signed-in, light theme, desktop ≥1440px). Layout: a slim left global nav rail (icons + labels: Home, Worksheets, Templates, Shared, Trash, and at bottom a workspace switcher + user avatar). Main area:
- Top bar: greeting + workspace name on the left ("Acme Safety Engineering"), a global search field center ("Search worksheets, templates, functions…"), and a prominent "New worksheet" split-button on the right (primary action + dropdown for "Blank", "From template", "Import .xlsx / Mathcad").
- "Continue working" row: 3–4 recent-worksheet cards, each showing a tiny rendered preview of the worksheet's first page (math regions visible), title ("Roof anchor point — pull-out check"), project tag, last-edited time, and a calc-status chip (green "All current" / amber "Needs recalculate").
- "Start from a template" row: horizontally scrollable template cards (e.g., "Lifeline span deflection", "Guardrail point-load check", "Bolt group capacity", "Ladder cage loading"), each with a thumbnail and a category label.
- "Your projects" section: a compact table/list of folders & worksheets with columns Name, Project, Owner, Calc status, Modified, and a kebab menu.
Use hairline rules between sections, generous but dense spacing, and the engineering-ledger aesthetic. Include an empty-state variant for a brand-new account (no recents): a centered invitation card "Create your first worksheet" with primary button and three template suggestions.
```

### 4.3 Worksheet Editor — the core screen
**Purpose:** Where everything happens. This is the product. Mock the full shell with a real worksheet loaded.

```
Design the Quanta Worksheet Editor — the core screen (light theme, desktop 1440–1680px). This fuses a Mathcad ribbon + worksheet with a BlockPad live-math document. Build the full shell with a realistic worksheet loaded.

OVERALL FRAME (top to bottom):
1) APP BAR (36–40px): left = app menu (≡) + editable worksheet title "Roof anchor point — pull-out check" with an autosave indicator ("Saved" / "Saving…" / "*Unsaved"); center = calc controls (a segmented Auto/Manual toggle + a "Recalculate" button with a ⟳ icon, disabled/greyed when Auto) and a calc-status chip ("All current"); right = a faint "▷ Present" button, a "Share" button, a comments icon, an AI sparkle button, and the user avatar.
2) RIBBON (two rows, Fluent-style but web-modern): tabs = Home · Insert · Math · Operators · Functions · Matrices · Plot · Format · Document · Calculate · Review. Show the HOME tab active with grouped controls and section labels beneath each group: [Clipboard: cut/copy/paste] [Region: math, text, table, image, area, control] [Math format: result format, units display, decimals, show-steps] [Text styles dropdown] [Insert: function, unit, symbol Σ, plot, solve block]. Thin line icons, small labels, group dividers. Include a "compact / hide ribbon" chevron at the right end.
3) WORKSPACE (3 columns):
   - LEFT PANEL (collapsible, ~240px): tabs "Outline" (a clickable table of contents built from text-region headings + tagged regions, with page numbers), "Variables" (live list of defined names with current values + units, e.g. F_t = 12.0 kN, L = 3.20 m), and "Files" (project tree). Show Outline active.
   - CANVAS (center, the star): a vertical stack of A4 pages on a #FCFCFA field over a faint blueprint dot-grid, with a page margin frame and a header/footer band. Layout is **hybrid flow** — reading-order rows, where a row can be one column (full width) or split into columns for side-by-side content, and regions can be indented. Populate page 1 with a believable calc that **shows off the column layout:**
       • A worksheet TITLE text region + a small project/info block (Project, By, Date, Rev).
       • A "Design inputs" collapsible AREA containing 3–4 math regions with inline named values and units: F_t := 12·kN (applied tie-back force), φ := 0.75 (resistance factor), d := 16·mm (anchor dia, SS316), f_ub := 700·MPa.
       • A heading "Anchor tensile capacity".
       • A **2-column row** demonstrating side-by-side layout: LEFT column = a math region in textbook notation computing tensile area A_s and capacity N_Rd = φ·A_s·f_ub, RESULT highlighted (green) "= 52.8 kN"; RIGHT column = a short text note ("Tensile stress area at thread root; SS316 A4-70.") with a small clause/standard reference. Show the faint column gutter between them.
       • A "utilization" math region: UR := F_t / N_Rd = 0.23, conditionally formatted green with an "OK" tag.
       • One math region in ERROR state (red underline + inline badge) to show the pattern, e.g. a unit mismatch.
       • A small embedded TABLE/spreadsheet (anchor schedule: columns Mark, Qty, Dia, Force, Capacity, UR) with a units row and one cell conditionally red.
       • A 2D PLOT region (capacity vs. edge distance curve) with the worksheet point marked.
     Show a selected math region with its selection chrome (accent outline, reorder handle, border toggle, **indent ◂▸ and "span columns" controls**) and a hover state on another region revealing a small "+ insert below" affordance, a **column-split control for the row**, and a kebab. Show a subtle **column gutter** between the side-by-side regions and a dashed **indent guide** on an indented sub-step.
   - RIGHT PANEL (collapsible, ~280px): a context "Inspector" for the selected region. For the selected math region show: Result format (decimals stepper, sig figs, notation = Auto/Sci/Eng, radix = Dec/Bin/Oct/Hex), Units (target unit field), Display toggles (Name / Formula / Substituted / Result — the show-steps controls, as switches), Conditional format (a rule: "if result > 1 → red"), Region border toggle, Tag/label field. Use small labelled controls, grouped with hairline dividers.
4) STATUS BAR (28px): left = calc status + "12 regions, 0 errors"; center = cursor position / current page "Page 1 of 3"; right = units system selector (SI ▾), zoom slider (default 100%) with %, and a "fit width" button.

FLOATING: a small draggable math keypad/operator palette pinned bottom-center (collapsed pill that expands) for Greek letters, operators, fractions, integrals, matrices.

Make it feel dense, calm, and trustworthy. The rendered math must look like a textbook (real fractions/subscripts), edit-mode formulas in monospace. Deliver this as the hero screen.
```

**States / notes:** Also worth separate variants later — (a) **Manual calc mode** with stale regions dimmed and a "Recalculate to here ▾" affordance; (b) **Column layouts** — a page using a 2-column row (equation + note) and a 3-column row, with one full-width spanning region (a plot) and an indented sub-step, plus the column-split and indent controls visible; (c) **Present mode** (chrome hidden, clean paginated read view).

### 4.4 Template gallery
**Purpose:** Browse/preview/start from reusable calculation templates.

```
Design the Quanta Template Gallery (light theme). Left global nav rail (as elsewhere). Main: a top bar with title "Templates", a search field, and filter chips (Discipline: Structural · Civil · Mechanical · Geotech; Standard: Eurocode · AISC · AS/NZS · BS; Type: Member check · Connection · Loading · Conversion). Below, a responsive grid of template cards (3–4 per row): each card shows a realistic rendered thumbnail of the template's first page, a title ("EN 1993 bolt group — eccentric shear"), a short one-liner, discipline + standard chips, an author/source byline ("Quanta · verified" or a community avatar), a usage count, and a hover "Use template" primary button + "Preview" secondary. Include a right-hand "Featured"/category sidebar OR top category tabs. Add a "Your templates" tab (templates the user saved). Provide a Preview drawer/panel state: clicking Preview slides in a panel showing scrollable pages of the template read-only, with metadata and a sticky "Use template" button. Keep the engineering-ledger look; thumbnails should clearly show math notation.
```

### 4.5 File browser (projects & folders)
**Purpose:** Manage worksheets, folders, projects; find and organize.

```
Design the Quanta file browser / "Worksheets" page (light theme, desktop). Left global nav rail. Main:
- Top bar: breadcrumb (Workspace / Projects / "Zoo lifeline retrofit"), a view toggle (list / grid), a "New" split-button (worksheet / folder / from template), and a search field with filters (owner, modified, calc status, tag).
- A two-pane layout: left a collapsible folder/project TREE (projects → folders → worksheets, with counts), right a content area.
- Content as a dense DATA TABLE: columns = a small type/preview icon, Name, Tags (chips), Owner (avatar), Calc status chip, Size, Modified, and a kebab actions menu (Open, Rename, Move, Duplicate, Share, Version history, Export, Move to trash). Support multi-select with a checkbox column and a contextual action bar that appears when rows are selected (Move, Tag, Export, Delete).
- Show a few realistic rows mixing folders and worksheets ("Column anchors — grid A", "Lifeline span — bay 3", "Guardrail point-load", a folder "Calc check log").
Provide a grid/card variant too (thumbnails with rendered first-page previews). Include an empty-folder state with an invitation to create or import.
```

### 4.6 Function & units reference library
**Purpose:** Browsable reference of built-in functions, units, and constants (also reachable as an insert modal — see 7.5/7.6).

```
Design the Quanta Reference Library page (light theme). Purpose: browse built-in functions, units, and physical constants. Layout: left a category sidebar with three top groups — FUNCTIONS (sub: Math & trig, Statistics, Solving (find/odesolve/pdesolve/minimize), Matrix & vector, Lookup & data (Vlookup/Interp), Programming, String, Engineering), UNITS (sub: Length, Force, Pressure/Stress, Mass, Time, Temperature, Electrical, …), CONSTANTS (NIST/CODATA physical constants). Center: a searchable list/table of items in the selected category; each function row shows the signature in monospace (e.g., "Vlookup(value, table, col, [match])"), a one-line description, and a category tag. Right: a detail panel for the selected item — full signature, description, parameter table (name / type / description), units behavior, a small live worked EXAMPLE rendered in math notation with a result, related functions, and an "Insert into worksheet" primary button. Make the example look real (e.g., interp() used on a wind-pressure table). Include a search-results state and a "no results" empty state.
```

### 4.7 Settings / Preferences (full page)
**Purpose:** Full-page settings (complements the quick Preferences modal in 7.x).

```
Design the Quanta Settings page (light theme). Left settings nav (sections): Account, Appearance, Editor, Calculation, Units & formatting, Templates & defaults, Sharing & permissions, Integrations, Workspace (admin), Billing. Right: the active section's content as labelled form groups with hairline dividers and inline help text. Mock the "Calculation" and "Units & formatting" sections specifically:
- Calculation: default calc mode (Auto / Manual radio), multithreading toggle, default solving algorithm dropdowns (for find/odesolve/integrals), convergence tolerance (CTOL/TOL fields), "recalculate on open" toggle.
- Units & formatting: default unit system (SI / USCS / CGS / Custom — with a "Manage custom systems" link), default result decimals (stepper), significant figures, notation default (Auto/Scientific/Engineering), radix default (Dec/Bin/Oct/Hex), thresholds for exponential/complex/zero results, and a live PREVIEW chip showing how a sample result (e.g., 52800 N) renders under current settings.
Use save-on-change with a small "Saved" toast pattern, plus a sticky "Save changes" bar variant for forms that need explicit save. Keep it calm and dense.
```

### 4.8 Shared-with-me / collaboration
**Purpose:** See worksheets others shared; manage access.

```
Design the Quanta "Shared" page (light theme). Left global nav rail with "Shared" active. Main: tabs "Shared with me" / "Shared by me". A dense table: columns = preview icon, Name, Shared by (avatar+name) or Shared with (avatar stack), Your role chip (Owner / Editor / Commenter / Viewer), Calc status, Last activity, kebab. Show realistic rows ("Anchor schedule — Block B", shared by a colleague, role Editor). Include a right-side activity feed panel (optional) listing recent share/comment/edit events. Provide a "Manage access" inline action that opens the Share dialog (see 7.x). Empty state: "Nothing shared with you yet."
```

### 4.9 Version history (full view)
**Purpose:** Review, compare, and restore prior versions of a worksheet.

```
Design the Quanta Version History view for a worksheet (light theme). Layout: left a timeline list of versions (newest first), each entry = timestamp, author avatar, an optional named label ("Issued for review — Rev B"), and a small change summary ("3 regions changed, 1 added"). Center/right: a read-only rendered preview of the selected version's pages with changed regions subtly highlighted (added = green left-rule, changed = amber, removed = red strikethrough ghost). Top bar: a "Compare" toggle to show a side-by-side diff of two selected versions (left old, right new) with synced scroll, and actions "Restore this version" (primary) and "Name this version". Include a diff legend. Keep math notation legible in both panes.
```

### 4.10 Print / export preview
**Purpose:** WYSIWYG paginated preview before exporting to PDF/Word/HTML or printing.

```
Design the Quanta Print/Export Preview (light theme, modal-over-app or full screen). Center: a paginated WYSIWYG preview of the worksheet as it will print — clean A4 pages with header/footer, page numbers, the rendered math, tables, and plots, no editor chrome. Left or right: an export options panel — Format (PDF / Word .docx / HTML / Excel .xlsx / Print), Page size (A4/Letter), Orientation, Margins, "Include region borders" toggle, "Show calc steps" toggle (expand show-steps for the export), "Include inputs summary" toggle, header/footer fields, watermark field, and a "Page range" input. Footer actions: "Export" (primary) and "Cancel". Show the first 1–2 pages of a realistic anchor-check worksheet in the preview. Make it look like a deliverable an engineer would stamp and send.
```

### 4.11 Workspace / team admin (multi-tenant)
**Purpose:** Admin manages members, roles, projects, and org settings (you build multi-tenant SaaS — include this).

```
Design the Quanta Workspace Admin page (light theme). Left settings/admin nav: Members, Roles & permissions, Projects, Templates, Branding, Security (SSO/2FA), Audit log, Billing & seats. Mock the "Members" and "Roles & permissions" sections:
- Members: a table — avatar+name, email, Role dropdown (Owner / Admin / Engineer / Reviewer / Viewer / Billing), Projects access (count + "manage"), Status (Active/Invited), Last active, kebab (Edit, Suspend, Remove). A top "Invite members" primary button opening an invite row/modal (emails + role + project assignment). Show a seat-usage indicator ("18 of 25 seats used").
- Roles & permissions: a permissions MATRIX — rows = capabilities (Create worksheets, Edit shared, Approve/sign, Manage templates, Manage members, Export, View billing), columns = roles, cells = check/partial/blank toggles. Include an "Add custom role" action.
Keep it enterprise-credible and dense. Add an Audit-log table variant (timestamp, actor, action, target, IP).
```

### 4.12 Empty-states catalog
**Purpose:** One sheet of consistent empty states (so they're designed deliberately, not as afterthoughts).

```
Design a single board of Quanta empty states, consistent style (light theme), each a centered illustration-light card with a one-line headline, a supporting sentence in the app's voice, and one primary action:
1) No worksheets yet → "Create your first worksheet" 
2) Empty folder → "This folder is empty. Add a worksheet or import a file."
3) No search results → "No matches for 'X'. Check spelling or clear filters."
4) Nothing shared with you → "Nothing shared yet. Worksheets others share will appear here."
5) No version history → "No earlier versions yet. We'll save versions as you work."
6) AI assistant idle → "Ask Quanta to draft, check, or explain a calculation."
7) Offline / connection lost → "You're offline. Changes are saved locally and will sync when you reconnect."
8) Calc error summary empty → "No errors. All regions are current."
Use thin-line spot icons, restrained color, and the engineering-ledger aesthetic. No clip-art mascots.
```

---

## 5. Editor zones (components inside the editor)

> These let you iterate on the editor piece by piece. Each can be mocked on a neutral backdrop or in context.

### 5.1 Top app bar
```
Design the Quanta editor APP BAR in isolation (light theme, full width, 40px tall, plus a zoomed detail). Left: app menu (≡), editable worksheet title with a small file-type/lock icon, and an autosave status that cycles through three states to show ("Saving…" with spinner, "Saved", "*Unsaved"). Center: calc controls — a segmented Auto | Manual toggle and a "Recalculate" button (⟳) that is disabled when Auto is selected, plus a calc-status chip with three variants ("All current" green, "Needs recalculate" amber, "1 error" red). Right: "▷ Present", "Share" (Blueprint), a comments bubble with a count badge, an AI sparkle button, and a 28px user avatar. Show tooltips on the icon buttons. Provide the three autosave states and three calc-status chips as a small variant strip.
```

### 5.2 Ribbon (full ribbon — primary chrome, all tabs)
```
Design the Quanta editor RIBBON in detail (light theme, full width, two rows). Render each tab's contents as separate frames so I can see them all:
- HOME: Clipboard (cut/copy/paste) | Region (Math, Text, Table, Image, Area, Control) | Math format (Result format, Units display, Decimals +/−, Show steps) | Text styles (dropdown) | Find.
- INSERT: Math region, Text, Table/Spreadsheet, Plot (2D/Polar/Contour/3D/Chart dropdown), Solve block, Image, Sketch, Control (dropdown), Include worksheet, Symbol Σ, Link/Tag.
- MATH: Operators palette entry, Result format, Units, Assignment vs evaluation (:= and =), Vectorize, Labels/identifiers.
- OPERATORS: fraction, exponent, root, summation Σ, product ∏, integral ∫, derivative d/dx, partial ∂, limit, absolute, factorial, range variable, subscript/superscript.
- FUNCTIONS: category dropdowns (Math, Stats, Solving, Matrix, Lookup, Programming, Engineering) + "Insert function…".
- MATRICES: insert matrix (rows×cols picker), transpose, inverse, determinant, identity, augment/stack, indexing.
- PLOT: insert plot types, plus contextual Traces / Axes / Chart groups (note these appear when a plot is selected).
- FORMAT: text styles, font/size/weight (greyed in math), color picker (custom), alignment, **indent / outdent**, **row columns (1 / 2 / 3) + "span all columns"**, region border toggle, conditional formatting.
- DOCUMENT: page setup, **default columns (page / section)**, headers/footers, margins, gridlines toggle, page-body/header/footer frame toggles, table of contents, go to page.
- CALCULATE: Auto/Manual, Recalculate, Recalculate to here, units system, multithreading, solving algorithm options.
- REVIEW: comments, track changes/redefinition warnings toggle, compare versions, spell check, protect/lock area.
Group dividers with small captions under each group, thin-line icons, active-tab underline in Blueprint. The full ribbon is the **primary chrome**. Also show the **collapsed-ribbon** state (tabs only, content hidden via the chevron, reclaiming vertical space) and, as its companion, a single slim **quick-access strip** of the few most-used icon tools (insert math, recalculate, result format, columns) with an overflow ⋯ — this is a *secondary* space-saving state, not an alternative to the ribbon.
```

### 5.3 Left panel — outline / variables / files
```
Design the Quanta editor LEFT PANEL (light theme, ~240px, three tabs). 
- OUTLINE: a table of contents auto-built from text-region headings and tagged regions, indented by level, each row clickable with the page number on the right; show the current section highlighted. Include a small "+ heading" affordance.
- VARIABLES: a live, searchable list of every defined name with its current value and unit (e.g., F_t = 12.0 kN, A_s = 157 mm², N_Rd = 52.8 kN, UR = 0.23), grouped by area/section; clicking one scrolls to its definition; show a tiny "used 3×" reference count and an error icon on any undefined/conflicting name.
- FILES: the project/folder tree with the current worksheet highlighted.
Provide the three tabs as separate frames. Hairline rows, dense, monospace for values, math-styled subscripts in names.
```

### 5.4 Canvas (page-based worksheet surface)
```
Design the Quanta CANVAS surface in isolation (light theme): a stack of A4 pages on warm paper #FCFCFA floating over a faint blueprint dot-grid, with page margins as a hairline frame, an optional header band ("Project · By · Date · Rev — Page X of Y") and footer, and visible page breaks. The layout is **hybrid flow** — a column-flow grid, NOT free placement. Demonstrate it across frames:
(a) SINGLE-COLUMN row: full-width text + math stacked in reading order, like a document.
(b) MULTI-COLUMN row: a 2-column row (math region left, text note right) and a 3-column row, with a faint **column gutter** between cells; reading/recalc order is left-to-right within the row.
(c) SPANNING region: a full-width region (a plot or a wide table) that spans all columns inside an otherwise multi-column page.
(d) INDENTATION: a region indented one and two steps within its column (sub-steps of a derivation), with a dashed **indent guide**.
(e) CONTROLS & affordances: the inter-row "+ insert" line; a **row column-split control** (1 / 2 / 3 + drag-to-resize the split ratio); per-region **indent / outdent ◂▸** and **"span columns"** toggles; snapping to columns and indent stops (a dashed accent guide as a region snaps).
Populate every frame with realistic regions. Show a selected region vs unselected. Make clear that side-by-side is achieved by **columns/spanning**, not by dragging regions anywhere.
```

### 5.5 Right panel — inspector / properties
```
Design the Quanta editor RIGHT PANEL "Inspector" (light theme, ~280px), context-sensitive to the selected region. Produce four frames, one per selection type:
1) MATH region selected: Result format group (decimals stepper, sig figs, notation Auto/Sci/Eng segmented, radix Dec/Bin/Oct/Hex), Units (target-unit text field with autocomplete), Display group as four switches — Name / Formula / Substituted / Result (the show-steps controls), Conditional format (rule builder: "if [result] [>] [1] then [red text]" with add-rule), Region border toggle, Tag field, Comment field.
2) TABLE/SPREADSHEET selected: rows/cols steppers, per-column units row toggle, header style, conditional formatting rules, banded rows toggle, alignment.
3) PLOT selected: plot type, Traces list (add/remove, color, marker, line style), Axes (min/max/log/labels/units), legend, gridlines, title.
4) TEXT region selected: text style dropdown, font/size/weight/color, list/indent, alignment.
Use small labelled controls grouped with hairline dividers and section eyebrows. Calm and dense.
```

### 5.6 Status bar
```
Design the Quanta editor STATUS BAR (light theme, full width, 28px). Left: calc-status chip + a summary "12 regions · 0 errors" (also show a "2 errors" red variant). Center: cursor/region position and "Page 1 of 3" with prev/next chevrons. Right: units-system selector (SI ▾ with menu SI / USCS / CGS / Custom…), a zoom slider with % readout (50–200%, default 100%) and +/− steppers (5% steps), and a "fit width" icon button. Provide the normal and error variants.
```

### 5.7 Floating math keypad / operator palette
```
Design the Quanta floating MATH KEYPAD / operator palette (light theme), draggable, with a collapsed and expanded state. Collapsed: a small pill button (√x) bottom-center of the canvas. Expanded: a compact floating panel with tabbed sections — Operators (fraction, exponent x², root √, |abs|, !, := assignment, = evaluate, range m..n), Calculus (Σ, ∏, ∫, d/dx, ∂, lim), Greek (α β γ δ … with upper/lower toggle), Matrix (insert m×n, transpose, inverse, det), Relational (= ≠ < ≤ > ≥), and Symbols (·, ×, ±, °, ∞). Buttons are thin-line glyphs in a tight grid with hover tooltips showing the keyboard shortcut. Include a pin/unpin and a close control. Math glyphs must render in the math font, crisp.
```

### 5.8 Command palette (⌘K)
```
Design the Quanta COMMAND PALETTE (light theme), a centered modal overlay triggered by ⌘K/Ctrl-K. A search field at top ("Type a command or search…"), then grouped results: Actions (Insert math region, Insert plot, Recalculate, Export to PDF, Toggle calc mode), Navigate (Go to page…, Jump to variable F_t, Outline section), Functions & units (Insert Vlookup, Insert kN), Recent worksheets. Each row has an icon, a label, an optional secondary hint (keyboard shortcut on the right in monospace). Show a hover/selected row in accent tint. Keep it fast, minimal, keyboard-first. Include an empty/typed state showing fuzzy matches for "anch" → "Open: Roof anchor point — pull-out check".
```

### 5.9 AI assistant panel
```
Design the Quanta AI ASSISTANT panel (light theme), a right-docked panel (~360px) opened from the sparkle button. Header "Quanta AI" with a close and a "new chat" control. Body: a conversation thread with the assistant and user turns. Show realistic content for an engineering calc context: user asks "Add a check for anchor edge-distance per the manufacturer's table"; assistant replies with a short plan and a card preview of the math regions it will insert (rendered notation: e_min, e_actual, check UR_edge), with "Insert into worksheet" (primary) and "Discard" actions on the card. Include quick-action chips at the top of an empty state: "Draft a calculation", "Check this worksheet for errors", "Explain a result", "Convert units", "Summarize for review". Composer at bottom with a text field, an attach (reference a region/file) button, and a send button. Make it feel like a precise engineering copilot, not a chatty toy. Note inline citations/links back to the regions it references.
```

---

## 6. Core region / block components

> The atomic content units. **6.1 is the product's signature — give it the most care.**

### 6.1 Math region — all states (THE signature component)
```
Design the Quanta MATH REGION component across all of its states, as a labelled board (light theme). This is the heart of the product: a BlockPad-style "type a spreadsheet formula, see textbook math" region with Mathcad-style results and units. Render these states as separate framed examples, each with a caption:

1) EMPTY / PLACEHOLDER: a thin insertion region with a blinking caret and ghost hint "Type = to start a calculation" (in muted text).
2) EDITING (formula view): the user is typing the raw formula in MONOSPACE, e.g.  N_Rd: phi*A_s*f_ub  — with an inline autocomplete dropdown suggesting names/functions (A_s, A_g, Atan2, …) and a live unit hint. Show the caret and a subtle accent region outline.
3) EVALUATED (committed, the magic): the same expression rendered as TEXTBOOK MATH NOTATION in the math font — proper layout, subscripts, the assignment N_Rd := φ·A_s·f_ub, an "=" and the RESULT highlighted in result-green with its unit: "= 52.8 kN". 
4) NAMED-VALUE INPUT: a simple definition rendered as math: F_t := 12 kN  (name on left, value+unit on right), the canonical input pattern.
5) SHOW-STEPS EXPANDED: the same capacity region expanded to three rendered lines — the symbolic formula, then the formula with VALUES SUBSTITUTED ( = 0.75 · 157 mm² · 700 MPa ), then the result ( = 52.8 kN ). Include the small toggle control (Name / Formula / Substituted / Result) shown active.
6) CONDITIONAL-FORMATTED RESULT: a utilization region UR := F_t / N_Rd = 0.23 displayed green with an "OK" tag; and a second copy showing the FAIL variant in red ( = 1.12, "FAIL") to show the rule firing.
7) ERROR — unit mismatch: a region with a red underline on the offending part and an inline error badge; on hover a small popover "Units don't match: left is kN, right is mm. Check the expression." 
8) ERROR — undefined variable: "f_ub is not defined above or to the left." with a "Define it" quick action.
9) RANGE / VECTOR result: a region producing a small vertical vector or a range (e.g., i := 1..5) rendered as math with the result as a small bracketed column.
10) SELECTED chrome: a region with the selection outline (Blueprint), a drag/move handle, a border-toggle pip, and a kebab menu.
11) VISUAL (WYSIWYG) EDIT mode: the SAME region edited visually rather than as text — a half-typed equation where a fraction stacks visually and an empty placeholder box awaits the next term, caret inside the numerator, with an "Aa | √x" toggle on the region to switch between text-formula and visual editing (both yield identical results).
12) SYMBOLIC RESULT: an expression evaluated symbolically via a labeled arrow operator (e.g. "solve, s →") producing a closed-form result or a vector of roots — show one resolving to a value (zeros := s+4 → −4) and one to a real+complex vector (→ [−1, −1+2i, −1−2i]); include a small keyword chip (simplify / solve / factor / expand) with a "hide keyword" toggle.

Make the contrast between EDIT (monospace formula OR visual editor) and EVALUATED (math notation, numeric or symbolic) unmistakable — that transformation is the product's signature.
```

### 6.2 Text region
```
Design the Quanta TEXT REGION component (light theme): a rich-text block used for narrative, headings, and notes between calculations. Show: a heading example styled by a "Heading 2" text style, a body paragraph with inline bold/italic and an inline math snippet embedded mid-sentence ("…the applied force F_t governs…"), a bulleted note, and subscript/superscript usage. Include the inline formatting toolbar that appears on text selection (bold, italic, underline, sub, super, link, text-style dropdown, color). Show selected and editing states. Text uses the UI/serif body face; embedded math uses the math font.
```

### 6.3 Table / spreadsheet region
```
Design the Quanta TABLE / SPREADSHEET region (light theme) — a native mini-spreadsheet with units intelligence. Show a realistic anchor schedule: header row (Mark, Qty, Dia [mm], Force [kN], Capacity [kN], UR), an optional UNITS row beneath headers, ~6 data rows, with formula-driven cells (Capacity computed, UR = Force/Capacity), one cell conditionally formatted red (UR > 1). Show: the selected-cell state with the formula visible in monospace in a formula bar above the grid (=B2/E2 style or named refs), column/row headers (A,B,C / 1,2,3) that appear in edit mode, a selected range highlight, a Vlookup example in a cell pulling from a reference table, and column resize handles. Include the spreadsheet's mini-toolbar (insert/delete row/col, sum, sort, conditional format, units per column). Cells in monospace; the conditionally formatted cell clearly red. Also show the read/presentation appearance (clean banded table, no grid headers).
```

### 6.4 Plot region
```
Design the Quanta PLOT REGION component (light theme) across its variants, as a board: (1) 2D XY line plot — capacity vs. edge distance, axis labels with units (kN, mm), gridlines, the worksheet's operating point marked with a labelled dot, a legend; (2) Polar plot; (3) Contour plot (a stress field); (4) 3D surface plot; (5) Bar/column "Chart component". For the selected XY plot, show the contextual editing affordances: draggable axis-range handles, a hover tooltip reading a data point ("e = 80 mm, N_Rd = 41 kN"), and a trace legend with color swatches. Plots should look precise and technical (thin axes, restrained color, the Blueprint accent for the primary trace, semantic colors for limit lines). Include an empty plot placeholder state ("Select an x and y expression to plot").
```

### 6.5 Solve block
```
Design the Quanta SOLVE BLOCK region (light theme): a bordered, labelled block for constrained/iterative solving (Mathcad-style find/minimize/odesolve). Structure top-to-bottom: a "Solve block" header chip; a "Guess values" sub-area with math definitions; a "Constraints" sub-area listing equations/inequalities in math notation (e.g., relations using = and ≤); and a "Solver" line invoking find()/minimize()/odesolve() with a result vector rendered as math. Include a right-click affordance note for "Choose solving algorithm ▾" on the solver line (a small dropdown showing algorithm options). Show the block selected, and an error variant ("No solution found — check constraints or guess values."). The block border should read as a grouped container distinct from loose regions.
```

### 6.6 Image / sketch region
```
Design the Quanta IMAGE / SKETCH region (light theme): two frames. (1) IMAGE: an inserted figure (a simple anchor/bracket detail) with a caption ("Fig. 1 — Tie-back anchor detail"), selection handles for resize, and an alt-text field affordance. (2) SKETCH: a lightweight built-in vector sketch canvas with a thin-line drawing toolbar (line, rectangle, circle, arrow, dimension, text label, freehand) — show a small dimensioned sketch of a bracket with a force arrow and an "F_t" label, in a clean technical-drawing style (hairline strokes, the Blueprint accent for dimensions). Include the sketch editing toolbar and a selected state.
```

### 6.7 Input controls (7 types)
```
Design the Quanta INPUT CONTROLS as a labelled board (light theme) — interactive controls embedded in worksheets to drive calculations (Mathcad advanced controls + BlockPad dropdowns). Show each in its in-worksheet appearance plus a brief "wired to a variable" caption:
1) DROPDOWN / COMBO-BOX: "Anchor material:" with options (Carbon steel 8.8 / SS304 / SS316) — selecting one sets f_ub. Show open and closed states.
2) SLIDER: "Edge distance e" with min/max labels, current value readout (and an inverted-direction variant), driving a result live.
3) RADIO GROUP: "Load case:" (Static / Dynamic / Fall-arrest) with one preselected by default.
4) CHECKBOX: "Include corrosion allowance".
5) TOGGLE/BUTTON: a "Run check" button control.
6) TEXT BOX: a free numeric/text input bound to a named value.
7) LIST BOX: a multi-select list of load combinations.
Each control: 4px radius, hairline border, accent focus. Also show the linkage idea — a small annotation arrow from a dropdown to the variable it sets ("→ sets f_ub = 700 MPa"). Keep them looking like part of a precise document, not a web form.
```

### 6.8 Collapsible area / section
```
Design the Quanta COLLAPSIBLE AREA component (light theme): a worksheet section that can collapse/expand and optionally be locked/password-protected (Mathcad "areas"). Show: an EXPANDED area with a header bar ("▾ Design inputs", a lock icon, a kebab) containing several math regions, and a hairline boundary; a COLLAPSED state ("▸ Design inputs — 4 regions hidden"); a LOCKED/PROTECTED state with a small lock badge and, on click, a "Enter password to edit" mini-prompt; and a "hidden when printing" indicator variant. Also show the BlockPad-style conditional visibility note: a section labelled "Shown because: Load case = Fall-arrest" to illustrate result/dropdown-driven hide/show. Header bar in chrome surface, content over paper.
```

### 6.9 Include / reference region
```
Design the Quanta INCLUDE / REFERENCE region (light theme): a region that pulls in another worksheet (shared inputs, standard material library, company defaults) — Mathcad "include worksheet". Show it as a compact bordered card: an include icon, the referenced file name ("std/SS316-fasteners.qta"), a status chip ("Linked · current" / "Source updated — refresh"), the count of names it brings in ("imports 12 values"), and actions (Open source, Refresh, Unlink). Also show an "internal reference/link" inline variant — a tagged link inside text that jumps to a region elsewhere ("see §3 Capacity"). Keep it clearly distinct from a normal math region.
```

### 6.10 Region chrome (selection, move, border, context menu)
```
Design the Quanta REGION CHROME system (light theme) as a detail board, showing the shared affordances that wrap any region: (1) UNSELECTED resting state (no border, or a faint optional border if toggled on); (2) HOVER state (a light accent tint + a **reorder drag-dot** on the left + a kebab on the right + an "insert below +" line under it + a small **row column-split control**); (3) SELECTED state (a 1px Blueprint outline, edge resize handles where resizable, a **reorder handle**, a border-toggle pip, and **indent ◂▸ + "span columns" controls**); (4) MULTI-SELECT (two regions with a dashed marquee and a floating action bar: **put in 2 columns**, align, group, border, delete); (5) the right-click CONTEXT MENU (Cut, Copy, Paste, Duplicate, Insert region above/below, **Indent / Outdent**, **Columns: 1 / 2 / 3**, **Span all columns**, Result format…, Show steps, Add to conditional format, Border on/off, Tag…, Comment, Disable region, Delete). Dragging **reorders within the flow** — regions don't free-float; show the column gutter and dashed indent/snap guides during a drag. Keep handles small and precise.
```

### 6.11 Inline tokens & autocomplete
```
Design the Quanta inline TOKENS & AUTOCOMPLETE detail (light theme): how variables, units, and functions appear and are entered inside a formula. Show: (1) a VARIABLE token with a subscript rendered in math (F_t, A_s) and, on hover, a tiny popover showing its current value, unit, and definition location ("F_t = 12.0 kN · defined §1"); (2) a UNIT token (kN, MPa, mm²) styled subtly distinct from variables; (3) the AUTOCOMPLETE dropdown that appears while typing a formula — a compact list mixing matched variables (with value+unit), functions (with signature), and units, each with a small type icon and a category tag, the top item highlighted; (4) a FUNCTION-signature inline hint showing parameter help as you type ("Vlookup(value, table, col, [match])" with the current argument bolded). Monospace in edit context, math font for committed tokens.
```

### 6.12 Inline error / warning badges
```
Design the Quanta inline ERROR & WARNING badge system (light theme) as a board: (1) ERROR badge on a region (red dot/underline) with hover popover giving a precise, fixable message ("Units don't match: kN vs mm.") and a quick-fix action; (2) WARNING badge (amber) for redefinition ("F_t is redefined here; first defined in §1 — turn off this warning for variables?") with a toggle; (3) STALE/needs-recalc badge in Manual mode (a dimmed region with a small ⟳ "recalculate" pip); (4) a worksheet-level ERROR SUMMARY popover (opened from the status bar "2 errors") listing each error with its page/section and a "jump to" link. Messages are specific and never apologetic. Keep badges small and non-intrusive but findable.
```

---

## 7. Modals & dialogs

> Each is a standard centered modal on a dimmed scrim with the Quanta look (8px radius, single soft shadow), unless noted as a drawer/panel.

### 7.1 New worksheet / from template
```
Design the Quanta "New worksheet" modal (light theme). Two-pane: left a short list (Blank worksheet, From template, Import — .xlsx / Mathcad .mcdx / .csv). Right pane changes with selection: "Blank" shows options (units system SI/USCS/CGS, page size A4/Letter, layout Flow/Free-placement, a starting template-name field, project/folder dropdown); "From template" shows a searchable template grid (thumbnails) with category filters; "Import" shows a dropzone + file picker and a note about what converts. Footer: "Create" (primary) / "Cancel". Show the "Blank" pane active.
```

### 7.2 Open
```
Design the Quanta "Open worksheet" modal (light theme): a file picker scoped to the workspace — left a folder/project tree, right a list/grid of worksheets with preview thumbnail, name, modified, owner, calc status; a search field and recent-files shortcut at top. Footer: "Open" (primary, disabled until selection) / "Cancel". Include a recent-files quick row.
```

### 7.3 Save / Save As
```
Design the Quanta "Save as" modal (light theme): a worksheet-name field, a destination project/folder picker (tree or dropdown + "New folder"), a file-type note (.qta), optional tags input, and an "also save as template" checkbox. Footer: "Save" (primary) / "Cancel". Also show a tiny inline "Saved ✓" confirmation pattern used for plain Save.
```

### 7.4 Export
```
Design the Quanta "Export" modal (light theme): Format selector as a row of segmented options with icons (PDF · Word · HTML · Excel · Print). Below, format-specific options: page size, orientation, margins, "include region borders", "expand calc steps for export", "include inputs summary", header/footer text fields, watermark, page range. A right-side mini live preview thumbnail of page 1 updating with options. Footer: "Export" (primary) / "Cancel". (Full-screen preview lives at page 4.10; this is the quick modal.)
```

### 7.5 Insert function
```
Design the Quanta "Insert function" modal (light theme): left a category tree (Math & trig, Statistics, Solving, Matrix & vector, Lookup & data, Programming, String, Engineering), center a searchable list of functions (signature in monospace + one-line description), right a detail pane (full signature, parameter table, units behavior, a small rendered worked example with a result, related functions). Footer: "Insert" (primary, inserts at caret) / "Cancel". Search field with live filtering at top; show "Vlookup" selected with its example.
```

### 7.6 Insert unit
```
Design the Quanta "Insert unit" modal (light theme): left a dimension list (Length, Area, Force, Pressure/Stress, Mass, Energy, Power, Temperature, Angle, Electrical, …), center a searchable grid of units in that dimension (kN, N, kgf, lbf…) with symbol + full name + SI equivalence, right a small panel showing the unit's definition and a conversion example. A search box that matches symbol or name. Footer: "Insert" / "Cancel". Show "Force" → kN selected.
```

### 7.7 Symbol / operator palette (modal form)
```
Design the Quanta "Insert symbol" modal/popover (light theme): tabbed grids — Greek (lower/upper toggle), Operators, Calculus, Relational, Arrows, Misc (·, ×, ±, °, ‰, ∞, ∠). Each glyph in a tight grid button rendered in the math font, with hover tooltip giving its name and keyboard shortcut. A search field ("type 'alpha' or '∑'"). Footer: "Insert" / "Close". (This complements the floating keypad 5.7 — same content, modal form.)
```

### 7.8 Result format
```
Design the Quanta "Result format" dialog (light theme), scoped to a selected result (with an "apply to whole worksheet" option). Controls: Decimal places (stepper), Significant figures (stepper, with "use sig figs" toggle), Notation (Auto / Decimal / Scientific / Engineering segmented), Radix (Decimal / Binary / Octal / Hex segmented), Show trailing zeros (toggle), Thousands separator (toggle), Thresholds (exponential threshold, complex-result tolerance, zero-result threshold fields), Unit display (target unit field + "show unit" toggle). A live PREVIEW row at the bottom rendering a sample value (52800 N) under current settings (e.g., "52.8 kN"). Footer: "Apply" (primary) / "Apply to worksheet" / "Cancel".
```

### 7.9 Worksheet settings
```
Design the Quanta "Worksheet settings" dialog (light theme), tabbed: Calculation (mode Auto/Manual, multithreading, default solving algorithms, TOL/CTOL), Units (unit system SI/USCS/CGS/Custom + manage-custom link, default display unit behavior), Formatting (default decimals, sig figs, notation, radix, thresholds — with preview), Page (size, orientation, margins, gridlines, header/footer frames), Layout (**default columns for the page/section: 1 / 2 / 3 + split ratio**, indent step size, show column gutter toggle, snap to columns/indent stops). Left tab list, right content with labelled groups. Footer: "Save" / "Cancel". Show the Calculation tab.
```

### 7.10 Custom unit system
```
Design the Quanta "Custom unit systems" dialog (light theme, Mathcad Prime 11 feature): a left list of unit systems (SI, USCS, CGS, + user systems with a "New system" button), right an editor for the selected custom system — a table mapping each base/derived dimension (Length, Mass, Time, Force, Pressure, Temperature, …) to a chosen default display unit (dropdowns), a system name field, and "set as worksheet default" toggle. Footer: "Save" / "Duplicate" / "Delete" / "Cancel". Show a custom "Site units (kN-m-mm)" system being edited.
```

### 7.11 Headers & footers
```
Design the Quanta "Headers & footers" dialog (light theme): three-zone editors (left / center / right) for both header and footer, each accepting text and insertable FIELDS via chips (Page number, Page X of Y, Date — system/world, Worksheet name, Project, Author, File path, Logo image). A "different first page" toggle, a "show frame/border" toggle, and font controls. A live mini-preview of the page header/footer band. Footer: "Apply" / "Cancel".
```

### 7.12 Page setup
```
Design the Quanta "Page setup" dialog (light theme): page size (A4/Letter/Legal/custom W×H), orientation (portrait/landscape), margins (top/right/bottom/left steppers with a visual margin diagram), gridlines toggle + spacing, page-body/header/footer frame toggles, and a small page-preview diagram reflecting choices. Footer: "Apply" / "Cancel".
```

### 7.13 Insert plot wizard
```
Design the Quanta "Insert plot" dialog (light theme): choose plot type (2D XY / Polar / Contour / 3D surface / Bar chart) as a row of thumbnail options; then a config form for the chosen type — X expression, Y expression(s) (add multiple traces), range (auto or min/max), axis labels/units, title, legend toggle, gridlines, log-scale toggles. A live preview pane on the right. Footer: "Insert" / "Cancel". Show 2D XY selected with a capacity-vs-edge-distance preview.
```

### 7.14 Insert table / spreadsheet
```
Design the Quanta "Insert table" dialog (light theme): a small grid-size picker (hover to choose rows × columns, like office apps) plus numeric rows/cols steppers, a toggle "with header row", a toggle "with units row", a toggle "spreadsheet mode (formulas & references)" vs "static table", banded-rows option, and a "from data…" option (paste or pick a CSV). Mini preview. Footer: "Insert" / "Cancel".
```

### 7.15 Insert image
```
Design the Quanta "Insert image" dialog (light theme): a dropzone ("Drop an image or browse") + file picker, recent images strip, an alt-text field, a caption field, and size/placement options (inline vs floating, width). Note that clicking "Insert image" in the ribbon may open the OS file browser directly (Mathcad Prime 11 behavior) — show this as the default with the dialog as the fuller option. Footer: "Insert" / "Cancel".
```

### 7.16 Insert control + script editor
```
Design TWO related Quanta dialogs (light theme):
(A) "Insert control": choose a control type (Dropdown/Combo, Slider, Radio group, Checkbox, Button, Text box, List box) as labelled thumbnail options, then a quick config (the variable name it binds to, and type-specific fields — e.g., for Dropdown: a small editable options table mapping each label to the value(s)/variable(s) it sets; for Slider: min/max/step/default + invert toggle + show min/max labels). 
(B) "Control script" editor: a code panel (monospace) for advanced control behavior with a language selector (Python / VBScript / JScript — per Mathcad Prime 10/11), event tabs (On change / On start / On click), a small reference of available state properties (e.g., SetSelectedButton), a "Run scripts on recalculate" toggle, and Save/Cancel. Show realistic example code wiring a dropdown to set material properties.
```

### 7.17 Solve-block config
```
Design the Quanta "Solve block" insert/config dialog (light theme): choose solver type (find — system of equations / minimize / maximize / minerr / odesolve / pdesolve / numol), a brief description of each, then fields to scaffold the block (guess variables, number of constraints, output variable name) and a "Choose algorithm" dropdown with the available numerical methods for that solver + tolerance overrides. Footer: "Insert solve block" / "Cancel".
```

### 7.18 Conditional formatting
```
Design the Quanta "Conditional formatting" dialog (light theme): a rule list (add/remove/reorder) where each rule = a condition builder ("[result/cell value] [operator: > ≥ = ≠ < ≤ between] [value/expression]") and a style picker (text color, fill, bold, a tag/label like "OK"/"FAIL", an icon). Show two example rules ("> 1.0 → red, label FAIL"; "≤ 1.0 → green, label OK"). A live preview chip showing a sample value styled by the rules. Scope selector: this region / this column / whole worksheet. Footer: "Apply" / "Cancel".
```

### 7.19 Text-style editor
```
Design the Quanta "Text styles" dialog (light theme): left a list of styles (Title, Heading 1–3, Body, Caption, Calc summary, Note) with the active one highlighted and "New style"/"Duplicate"/"Delete"; right the style editor (font family, size, weight, color, line spacing, space before/after, list/indent) with a live preview line. A "save styles to default template" action so styles persist across new worksheets (Mathcad behavior). Footer: "Save" / "Cancel".
```

### 7.20 Tag & internal link
```
Design TWO small Quanta dialogs (light theme): (A) "Add tag" — assign a tag/anchor name to the selected region (text field, note that it enables linking and TOC), Save/Cancel. (B) "Insert internal link" — pick a target from a searchable list of existing tags/headings (since the user must reference by name), set the link text, Insert/Cancel. Show the link target list with a few tagged regions ("§2 Capacity", "Anchor schedule", "Fig. 1").
```

### 7.21 Find & replace
```
Design the Quanta "Find & replace" dialog (light theme), a compact docked bar (top-right of canvas) or small modal: Find field + Replace field, match count ("3 of 12"), prev/next, options (match case, whole word, in math / in text / in tables scopes), and "Replace" / "Replace all" buttons. Show results highlighted in the canvas behind it.
```

### 7.22 Go to page
```
Design the Quanta "Go to page" mini-dialog (light theme): a small centered prompt with a page-number field ("Go to page __ of 12"), prev/next, and "Go"/"Cancel". Keep it tiny and keyboard-first.
```

### 7.23 Share
```
Design the Quanta "Share worksheet" dialog (light theme): top = an email/name invite field with a role dropdown (Editor / Commenter / Viewer) and "Invite"; a list of current people with avatars and per-person role dropdowns + remove; a divider; "General access" section (Restricted / Anyone in workspace / Anyone with link) with a role for link access and a "Copy link" button; a footer note about who can recalculate/sign. Include a "Manage in admin" link. Primary "Done". Calm, trustworthy, enterprise-credible.
```

### 7.24 Comments / review panel
```
Design the Quanta "Comments" panel (light theme), right-docked drawer: a list of comment threads, each anchored to a region (small reference chip "on N_Rd region §2"), with author avatar, timestamp, text, replies, resolve checkbox, and @mention support. A filter (Open / Resolved / @you). A composer at the bottom. Show how a commented region looks in the canvas (a small comment marker/highlight). Include a "track changes / redefinition warnings" toggle reference for review mode. Make it suited to engineering checking workflows ("Checker:" / "Confirmed.").
```

### 7.25 Keyboard shortcuts
```
Design the Quanta "Keyboard shortcuts" reference modal (light theme), reflecting the **Mathcad-style keymap**: a searchable, dense multi-column reference with keys as monospace keycap chips, grouped — **Math entry** (`:`→`:=`, `=` evaluate, `/` stacked fraction, `^` superscript, `_` subscript, backslash → √, `.` literal name subscript F.t→F_t, `[` index subscript, `|` absolute value, **Space = expand selection** up the expression); **Operators & Greek** (Ctrl+G converts the preceding letters to Greek, e.g. p→π; insert sum, product, integral, derivative, partial, limit, range, matrix Ctrl+M); **Selection & navigation** (Space expand, Tab/arrows between placeholders, Backspace remove); **Regions** (type to start a math region, Space on an empty new region → text, Ctrl+Enter new region); **Calculation** (F9 recalculate, Shift+F9 recalc-to-here, Auto/Manual); **App** (⌘/Ctrl + S save, Z undo, Shift+Z redo, F find, K command palette, P export, `/` opens this reference). Top search field filters; two-/three-column dense layout; a small caption noting the keymap matches the current scheme (set in Preferences). Close button.
```

### 7.26 App preferences (modal)
```
Design the Quanta "Preferences" modal (light theme), tabbed (a lighter cousin of the full Settings page 4.7): General (language, startup behavior, recent-files count), Appearance (Light / Dark / System theme picker with swatches, accent, UI density Comfortable/Compact, math font choice, gridline visibility), Editor (autosave interval, **default page columns (1 / 2 / 3)**, **indent step size**, **keymap (Mathcad / Default)**, autocomplete on/off, show region borders by default), Calculation (default mode, multithreading), Defaults (default units system + formatting with preview). Left tabs, right content. Footer: "Done". Show Appearance tab with a clear Light/Dark toggle preview.
```

### 7.27 Account / profile (modal)
```
Design the Quanta "Account" modal (light theme): profile (avatar upload, name, title/role, email), password & security (change password, 2FA toggle, active sessions list), workspace memberships, notification preferences (email/in-app toggles for comments, shares, mentions), and a "Sign out" action. Left mini-nav, right content. Footer: "Save changes".
```

### 7.28 Confirmation dialogs (grouped)
```
Design a set of Quanta CONFIRMATION dialogs (light theme), consistent small-modal style, each with a clear title, a one-line consequence, and two buttons (a safe default + a clearly-styled action):
1) Unsaved changes on close → "Save changes to 'Roof anchor point'?" → [Save] [Don't save] [Cancel].
2) Delete worksheet → "Move 'Lifeline span — bay 3' to trash?" → [Move to trash] (destructive red) [Cancel].
3) Overwrite on import/save → "A worksheet named X already exists. Replace it?" → [Replace] [Keep both] [Cancel].
4) Restore version → "Restore Rev B from 12 May? Current state is saved as a new version." → [Restore] [Cancel].
5) Remove collaborator / revoke access → "Remove Sarah's access to this worksheet?" → [Remove] (destructive) [Cancel].
Destructive actions in error-red; never bury the consequence.
```

### 7.29 Calc-error detail
```
Design the Quanta "Calculation errors" detail dialog/popover (light theme), opened from the status-bar error count: a list of every error and warning in the worksheet, each row = a severity icon (error red / warning amber), a precise message ("Units don't match: kN vs mm — §2 Capacity"), the page/section, and a "Jump to" link that scrolls to the region. A filter (Errors / Warnings / All) and a count summary. Make messages specific and fixable; this is the engineer's debugging surface.
```

### 7.30 AI assistant (modal mode)
```
Design the Quanta AI assistant in MODAL/centered mode (light theme) — for users who prefer a focused overlay over the docked panel (5.9). Same capabilities: a prompt field with quick-action chips (Draft a calculation, Check for errors, Explain a result, Convert units, Summarize for review), a results area showing the assistant's plan and a previewed set of math regions to insert (rendered notation) with "Insert into worksheet" / "Discard", and the ability to reference the current worksheet or a specific region. Include a small disclaimer line that AI output should be checked by the engineer. Keyboard-first, calm, precise.
```

### 7.31 Save as template
```
Design the Quanta "Save as template" dialog (light theme): template name, description, discipline + standard category pickers (chips), a thumbnail auto-generated from page 1 (with a "change" option), visibility (Just me / Workspace / Submit to library), a "mark inputs" helper note (which regions are meant to be edited as inputs), and tags. Footer: "Save template" / "Cancel".
```

### 7.32 Onboarding tour
```
Design the Quanta first-run ONBOARDING (light theme): a sequence of 3–4 coach-mark/spotlight overlays on the editor, each a small card with a title, one sentence, a "Next"/"Got it" button, and step dots. Steps: (1) "Type = anywhere to start a calculation" pointing at the canvas; (2) "Watch it become readable math" pointing at a rendered region; (3) "Units are tracked and checked" pointing at a unit token; (4) "Recalculate updates everything" pointing at the calc controls. Plus an initial welcome modal ("Welcome to Quanta — calculations that read like a textbook") with "Take the tour" / "Skip". Restrained spotlight (dimmed surround, one bright target), no confetti.
```

---

## 8. Cross-cutting components

```
Design a Quanta cross-cutting UI board (light theme), consistent style:
1) TOASTS: success ("Exported to PDF"), info ("Recalculating…" with spinner), warning ("Source worksheet updated — refresh include?"), error ("Couldn't save — you're offline. Saved locally."). Bottom-center or bottom-right, hairline border, small icon, optional action link, auto-dismiss.
2) RECALCULATION INDICATOR: a slim top progress bar + the status chip switching to "Recalculating…", and per-region shimmer on regions being updated (Manual mode).
3) CONTEXT MENUS: the canvas right-click menu and a region right-click menu (as in 6.10), consistent item styling with icons + shortcut hints + dividers.
4) TOOLTIPS: a standard tooltip and a richer "value tooltip" (variable hover showing value/unit/definition).
5) LOADING / SKELETONS: a worksheet-open skeleton (page frame + shimmer region blocks) and a dashboard card skeleton.
6) BADGES & CHIPS library: calc-status chips (current/needs-recalc/error), role chips, discipline/standard chips, "verified template" badge — one consistent chip system.
Keep everything in the engineering-ledger aesthetic; precise, quiet, legible.
```

---

## 9. Suggested mockup sequence & working tips

**Order to build in Claude Design** (highest leverage first):
1. **6.1 Math region (all states)** — defines the product's soul; get the edit→notation transformation right before anything else.
2. **4.3 Worksheet Editor** — the shell that hosts everything.
3. **5.2 Ribbon**, **5.5 Inspector**, **5.4 Canvas**, **5.6 Status bar** — refine the editor zones.
4. **6.3 Table/spreadsheet**, **6.4 Plot**, **6.7 Input controls** — the next most important regions.
5. **4.2 Dashboard**, **4.4 Templates**, **4.5 File browser** — the "around the editor" surfaces.
6. **7.5 Insert function**, **7.8 Result format**, **7.9 Worksheet settings**, **7.23 Share** — the most-used dialogs.
7. Everything else, then **8** cross-cutting polish and **4.12** empty states.

**Tips for better Claude Design output:**
- Keep the **Master Design System** message at the top of the project so each new prompt inherits it. If results drift, re-paste a short reminder ("Use the Quanta design system: Geist Sans for UI, Geist Mono for formulas/code, a textbook math font for rendered equations, warm paper canvas, Blueprint #1F5FBF accent, hairline borders, dense desktop layout").
- Ask for **one screen per prompt** for fidelity; ask for **multi-frame boards** only for component-state catalogs (like 6.1) where seeing states together helps.
- Always tell it to use **real engineering content** (your anchor/lifeline/guardrail examples) — it stops the mockups from looking generic.
- After a first pass, iterate with targeted asks ("make the rendered result green and add the unit", "increase density, reduce padding to 8/12", "show the error popover open").
- The canvas is **hybrid flow** (decided): build the editor around reading-order rows with optional 1–N columns, spanning regions, and indentation — *not* free placement. When prompting the editor/canvas, always ask for at least one **multi-column row** and one **spanning region** so the layout model is visible.

---

*Decisions locked for v1:* (1) **canvas = hybrid flow** (reading-order rows, 1–N columns, spanning regions, indentation — no free placement); (2) **chrome = full ribbon** (the collapsed-ribbon + quick-access strip is only a secondary space-saving state). Every prompt above is written to this direction. *Worth settling next:* the **default number of columns** new worksheets open with (1 is the safe default; offer a 2-column "equation + note" template for those who want it), and whether **column count is set per-row or per-section**.
