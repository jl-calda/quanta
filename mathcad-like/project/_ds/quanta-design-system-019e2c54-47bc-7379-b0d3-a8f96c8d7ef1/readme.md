# Quanta — Design System

**Quanta** is a web-based engineering calculation app — a live-math document where practicing engineers (structural, civil, mechanical) write calculations that render as clean textbook notation, track units, and recalculate like a spreadsheet. Output is precise and trustworthy enough to hand to a client or a checker.

This design system is the single source of truth for every Quanta surface: the editor, dialogs, marketing, and any internal tooling. Use it unless explicitly told otherwise.

> **Sources.** This system was authored from a written design brief (no external codebase or Figma was provided). If you have access to the production Quanta repository or Figma later, reconcile token values and component props against it and update this file.

---

## Design direction — "Precision instrument / engineering ledger"

Calm, dense, and authoritative. Quanta should feel like a precise drafting tool — not a consumer SaaS toy, not a generic dashboard. No rounded "bubbly" cards, no oversized hero numbers, no playful gradients. The memorable signature is the **live-math moment**: a typed, spreadsheet-style formula transforms into crisp textbook math notation with a highlighted result and unit. A faint blueprint dot-grid sits under every worksheet.

---

## Content fundamentals

**Casing.** Sentence case everywhere — UI labels, buttons, titles, menu items. The only uppercase is the *eyebrow*: 11–12px tracked labels used for section headers, and short status tags ("OK", "PASS", "FAIL").

**Voice.** Active voice, plain verbs. Buttons name the outcome, never the mechanism:
- ✓ "Recalculate", "Insert plot", "Share worksheet", "Add region"
- ✗ "Submit", "OK", "Done", "Go"

**Person.** Address the engineer directly and sparingly ("you"); the app refers to itself implicitly, not as "I". Most UI text is imperative ("Insert a plot to visualise the result") rather than first- or second-person prose.

**Errors** explain *what's wrong and how to fix it*, in the app's voice — specific, never apologetic, never vague:
- "Units don't match: left side is kN, right side is mm. Check the expression."
- "‘w’ is redefined on line 14. The later value wins below this point."
- ✗ "Something went wrong." / "Oops!" / "Invalid input."

**Empty states** are an invitation to act, with exactly one primary action. "No regions yet. Add your first calculation to get started." + **Add region**.

**Numbers & units.** Results carry their unit, always. Prefer SI with engineering conventions (kN, kN·m, MPa, mm). Show utilization as a ratio to two decimals (0.85), not a percentage, unless the domain expects %.

**No emoji.** Never. Status is carried by color + a line icon + a word, not a pictograph. The tone is a calibrated instrument, not a chat app.

**Vibe.** Quiet confidence. Read like a well-kept engineering ledger: terse labels, exact numbers, generous rules and whitespace, zero marketing fluff inside the tool.

---

## Visual foundations

**Color.** Light theme is default. Warm near-white **paper** (`#FCFCFA`) for worksheets; cooler **chrome** (`#F4F5F7`) for ribbons, panels, and bars; near-black **ink** (`#15181D`) for text and math. The one brand accent is **Blueprint** (`#1F5FBF`) — primary actions, links, selection, and the active-region outline — backed by a pale **tint** (`#E8F0FC`) for selected fills and hover. Three semantic hues carry meaning and nothing else: **pass** green (`#1E8E5A`), **warning** amber (`#C6890B`), **error** red (`#C2392B`), each with a soft tint for backgrounds. Dark theme (`[data-theme="dark"]`) lifts the canvas to `#14171C` and raises every hue ~15% in lightness. Imagery, when present, is cool and technical — blueprints, line drawings, CAD — never warm lifestyle photography.

**Type.** Three families, each with a strict job:
- **Geist Sans** — all UI, labels, body. Build hierarchy with weight + size, never a separate display face. Tight, technical, sentence case.
- **STIX Two Text** — rendered math notation. This is the product's voice; spend the typographic boldness here. Equations must read like a textbook (true stacked fractions, radicals, integral signs, subscripts), never like code.
- **Geist Mono** — formula editing, code/scripts, and table cells. When a math region is *edited* it shows the raw spreadsheet formula in mono; when *committed* it renders as STIX notation above.

Scale: 11 / 12 / 13 / 14 / 16 / 20 / 28. Body 13–14. Never below 24px on the math; 11px floor on UI.

**Spacing.** 4 / 8 / 12 / 16 / 24 / 32. Dense but breathable — desktop-class density with multiple panels visible at once (optimize for ≥1440px editors).

**Shape.** Radii are precise, not pill: 4px (inputs, buttons, regions), 6px (panels, cards), 8px (modals). The switch knob is the one exception (full radius for affordance).

**Borders & elevation.** 1px hairline rules (`#E2E5EA`) do the structural work — divide ribbons, frame panels, separate regions. Shadows are restrained: none on chrome, `--shadow-sm` for raised surfaces, `--shadow-popover` for menus/tooltips, and a single soft `--shadow-modal` for dialogs. No glow, no layered drop-shadow stacks.

**Backgrounds.** The blueprint **dot-grid** (`.q-grid`, a 16px radial-dot pattern in `#D8DEE7`) under worksheet canvases is the signature texture. No gradients, no photographic hero backgrounds, no noise.

**Motion.** Calm and precise. Fast (90ms) for hovers, base (150ms) for state changes, slow (240ms) for the edit→commit math transform. Ease-out curves; no bounce on content, no infinite decorative loops. All motion respects `prefers-reduced-motion`.

**Interaction states.**
- *Hover* — surfaces wash to `--surface-hover`; primary buttons get a subtle lightening overlay; links underline.
- *Press* — primary actions deepen to `--accent-press` and nudge 0.5px down; no shrink/scale toys.
- *Selected/active* — blueprint-tint fill + 1px blueprint outline (regions), or solid blueprint (toggles, active icon buttons).
- *Focus* — a visible 2px blueprint focus ring with 1px offset on every interactive element. Non-negotiable.

**Cards** are a hairline border + 6px radius on the chrome surface, optionally a header divided by a rule. Flat by default; only "raised" variants take `--shadow-sm`. No colored left-border accent cards, no tinted gradient cards.

**Accessibility floor.** AA contrast throughout, visible keyboard focus rings, reduced-motion honored, and every icon-only control carries a tooltip + accessible label.

---

## Iconography

**Style.** Thin-stroke (1.5px) line icons, geometric and consistent — the Lucide / Phosphor-light family. No filled icons, no duotone, no skeuomorphism. Icons are monochrome and inherit `currentColor` so they pick up ink, muted, accent, or semantic colors from context.

**Source.** Components draw icons as inline 1.5px-stroke SVGs (see `IconButton`, `Select`, `Toast`, `Dialog`). For surfaces that need a broad set, use **Lucide** — either inline SVG paths or the CDN (`https://unpkg.com/lucide-static`). If you substitute another set, match the 1.5px stroke weight and rounded line caps and flag it.
> *Substitution flag:* no production icon font/sprite was supplied with the brief, so the system standardises on **Lucide (light, 1.5px)** as the canonical set. Swap in Quanta's own sprite if/when it exists.

**Emoji.** Never used. **Unicode** math symbols *are* used inside notation (√, π, ·, ≤, ², Σ, ∫) rendered in the STIX Two math face — that is typography, not iconography.

**Logo.** The mark is a rounded-square calc region containing a fraction rule and a green result dot — a calculation cell in miniature. See `assets/quanta-logo.svg` (light) and `assets/quanta-logo-dark.svg`. Keep clear space equal to the mark's corner radius; never recolor the mark outside the blueprint/ink/pass palette.

---

## Index / manifest

**Root**
- `styles.css` — global entry point (consumers link this one file). `@import`s only.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skill front matter for use in Claude Code.

**`tokens/`** — `fonts.css` (Geist Sans, Geist Mono, STIX Two Text via Google Fonts), `colors.css` (+ dark theme), `typography.css`, `spacing.css` (spacing, radii, shadows, motion, `.q-grid`), `base.css` (element defaults + helpers).

**`components/`** — reusable React primitives (namespace `window.QuantaDesignSystem_019e2c`):
- `core/` — **Button**, **IconButton**, **Badge**, **Card**
- `forms/` — **Input**, **Select**, **Checkbox**, **Switch**
- `navigation/` — **Tabs**
- `feedback/` — **Dialog**, **Toast**, **Tooltip**
- `math/` — **MathRegion** (the signature) + notation primitives **Var**, **Sub**, **Sup**, **Frac**, **Sqrt**, **Op**, **Unit**, **Math**

**`guidelines/`** — foundation specimen cards (Colors, Type, Spacing, Brand) shown in the Design System tab.

**`assets/`** — `quanta-mark.svg`, `quanta-logo.svg`, `quanta-logo-dark.svg`.

**`ui_kits/`** — `editor/` — high-fidelity recreation of the Quanta worksheet editor (see its own `README.md`).

---

## Using the system

Consuming HTML links the one stylesheet and the generated bundle:

```html
<link rel="stylesheet" href="styles.css" />
<script src="_ds_bundle.js"></script>
<script type="text/babel">
  const { Button, MathRegion, Sub, Frac, Sup, Op } = window.QuantaDesignSystem_019e2c;
</script>
```

Prefer the semantic CSS variables (`--surface-paper`, `--text-primary`, `--accent`, `--status-error`) over raw palette values so dark theme and future retuning flow through automatically.
