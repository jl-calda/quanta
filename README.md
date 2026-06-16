# Quanta

A multi-tenant web app for engineering calculations — a hybrid of **PTC Mathcad Prime** and **BlockPad**. Engineers write live, natural math that renders as textbook notation, **tracks units**, and **recalculates like a spreadsheet**. Output is precise enough to hand to a client or a checker.

**Stack:** Next.js (App Router) + TypeScript + Tailwind + Supabase. Math via `mathjs` + `MathLive` (natural Mathcad-style entry) + `KaTeX` + **Pyodide** (SymPy / NumPy / SciPy).

## This repo right now
The **M0 scaffold is in place**: a Next.js (App Router) + TypeScript + Tailwind v4 app with Supabase wired via `@supabase/ssr`, the `_ds` design tokens ported into a global CSS + Tailwind theme, Geist Sans/Mono + STIX Two Text loaded via `next/font`, Pyodide lazy-loaded in a Web Worker, a pure calc-engine seed (`lib/calc`), the Mathcad keymap (`lib/keymap`), and a Compact-default Comfortable/Compact density toggle. Subsequent milestones (M1+) build the schema/RLS, the live-math editor, and the per-screen pages on top. See `DECISIONS.md` for the locked choices.

Local dev: copy `.env.example` to `.env.local`, fill in the Supabase keys, then `npm install` and `npm run dev`. Verify with `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

## Layout
- `app/`, `lib/`, `components/` — the application (App Router routes, the calc engine + keymap + Supabase/preferences libs, and UI components).
- `CLAUDE.md` — project memory (stack, design system, engineering standards). Auto-loaded by Claude Code every session. **Always keep.**
- `DECISIONS.md` — running log of non-obvious decisions.
- `quanta-build-tracker.html` — **your build driver**: one row per page/component, each with a checkbox + its paste-ready prompt (DESIGN mockup + FEATURE requirement). Open in a browser.
- `docs/` — the specs the prompts reference:
  - `quanta-functional-build-brief.md` — how it's built (schema, RLS, engine, per-screen)
  - `quanta-feature-coverage-matrix.md` — every feature + gap prompts
  - `quanta-claude-design-brief.md` — design intent per screen
- `mathcad-like/` — the **Claude Design export** (the visual source of truth): `project/*.html` screens, `project/*-app.jsx`, `project/_ds/` tokens + components, `density.css/js`, `math-region.html`, `keyboard-shortcuts.html`, plus `README.md` and `chats/`.
- `.gitignore`

## Build it (manual — screen by screen)
1. Open this repo in Claude Code.
2. Open `quanta-build-tracker.html` in a browser. Work top to bottom: **Foundations → Pages → Editor zones → Components → Modals → Catalogues.**
3. For each row: copy its prompt → paste into Claude Code → review → commit → tick the box.
4. Leave auto-accept off to review each change, or press **Shift+Tab** for *"auto-accept edits on"* to let a single row's prompt run unattended.

Precedence when specs disagree: **features** → coverage matrix · **build approach** → functional brief · **visual look** → the `mathcad-like/` export.

> **Optional — hands-off mode.** If you'd rather let Claude Code build end-to-end instead of per-screen, add `docs/quanta-autonomous-build-prompt.md` (the run-to-completion prompt) and `.claude/commands/continue.md` (the `/continue` resume command): paste the autonomous prompt once, then type `/continue` whenever it pauses. **Not needed for manual mode.**
