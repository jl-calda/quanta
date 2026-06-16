# Quanta — Master Feature List & Coverage Matrix

> **Purpose.** Consolidates every feature from the four source docs you provided — the **Mathcad Prime datasheet**, the **Prime 9–12 version-comparison chart**, the **Prime 7→11 release blog**, and the **BlockPad feature list** — into one master checklist, maps each to where it lives in the **Mockup Brief** (design) and **Functional Build Brief** (build), and flags gaps with ready-to-paste prompt fragments.
>
> **Legend:** `✓` already in the briefs · `◑` partly covered (note) · `✚` gap → see the matching gap-fill prompt in Part C.
>
> **Source tags:** **M** = Mathcad · **B** = BlockPad · **M/B** = both.

---

## Part A — The one architectural change you need: a symbolic engine

Your datasheets repeatedly call for **symbolic** math, not just numeric: *"Evaluate and solve expressions both numerically and symbolically," "Display symbolic solutions to systems of equations,"* the **Gradient Operator**, **symbolic ODE solving**, **integral transforms** (Fourier/Laplace/Z), and the whole keyword apparatus (`simplify`, `solve`, `factor`, `expand`, `series`, `assume`, `float`, `fully`, `standard`, `decomp`). My Functional Brief §2 used **mathjs**, which is great for parsing, units, matrices, and numeric eval — but it **cannot** do Mathcad-grade symbolic algebra.

**The fix (one decision that unlocks ~15 features): add a Python-in-the-browser layer via Pyodide.**

```
Quanta's calc engine is a LAYERED engine:
1) UNITS + FAST NUMERIC + PARSING + TeX:  mathjs  (math.parse, units, matrices, node.toTex()).
2) SYMBOLIC (CAS):  SymPy, run in the browser via Pyodide (Python compiled to WASM).
   Covers: symbolic solve, simplify, factor, expand, collect, symbolic differentiate/integrate,
   limits, series (incl. Big-O), symbolic ODE solving (dsolve), integral transforms
   (fourier/laplace/ztrans + inverses), gradient, assumptions (assume), and decomposition.
3) HEAVY NUMERIC:  NumPy / SciPy (also via Pyodide).
   Covers: linear & nonlinear system solving, optimization (minimize/maximize/minerr),
   ODE/PDE solving (odesolve/pdesolve/numol), curve fitting & smoothing (genfit/polyfit),
   probability & statistics, signal & image processing (FFT), design of experiments, root-finding.
4) PYTHON SCRIPTING: the SAME Pyodide runtime powers "advanced scripted controls" and
   "script modules" — so Python integration, the symbolic engine, and the numeric library
   are ONE dependency, not three.
5) VISUAL + TEXT INPUT:  MathLive (WYSIWYG math field) AND a plain-text formula field — users
   choose per region (see Part C, G2). KaTeX renders committed results.

Run Pyodide in a Web Worker so symbolic/heavy calls never block typing; keep mathjs on the main
thread for instant numeric + units recompute. Cache the Pyodide instance; lazy-load it on first
symbolic/Python use so simple worksheets stay light.
```

This single layering knocks out: symbolic algebra, symbolic ODE/transforms, gradient operator, optimization, ODE/PDE numeric solving, curve fitting/smoothing, statistics, signal/image processing, DOE, **and** Python controls/script modules. **Replace the LIBRARIES block in Functional Brief §2 with this** (patched copy below).

---

## Part B — Coverage matrix (every feature, where it lives)

### B1 · Core document & interaction
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Word processing / rich text | M/B | ✓ | Mockup 6.2, Func 6.2 |
| WYSIWYG document editing | M | ✓ | Mockup 4.3 / canvas 5.4 |
| Notebooks / multi-section docs | B | ◑ | The page-stack document model (Mockup §2) IS this; just label sheets/sections |
| Blocks / regions model | M/B | ✓ | Mockup §2, 6.10; Func §2 doc model |
| Multi-document (tabs) UI | M | ◑ → ✚ | Add open-worksheet tab bar — G8 |
| Automatic calculations / recalc | M/B | ✓ | Func §2 pipeline |
| Auto & manual calc modes | M | ✓ | Mockup 5.1, Func §2 |
| Math layout (textbook notation) | M/B | ✓ | Mockup 6.1 |

### B2 · Math input & operators
| Feature | Src | Status | Where / note |
|---|---|---|---|
| **Natural Mathcad-style 2D entry (PRIMARY, MathLive)** | M/B | ✓ | The core input model — Mockup 6.1, Func §2, G2 |
| Plain-text formula input (type `=`) | B | ✓ | Secondary fast-entry mode |
| Unit-aware entry (number + unit attaches units) | M/B | ✓ | First-class, like Mathcad — Func §2, G3 |
| Math→text region toggle (spacebar) | M | ✓ | Mockup §2 |
| Fractions, radicals, subscripts/superscripts | M/B | ✓ | Mockup 6.1 |
| Operators: Σ, ∏, ∫, d/dx, **∂ (partial)**, **∇ (gradient)**, limit, abs, factorial, range | M | ◑ | In keypad/ribbon (5.2/5.7); ensure engine supports each numerically **and** symbolically — G1 |
| **LaTeX variable names** | B | ✚ | Allow LaTeX identifiers — G3 |

### B3 · Numeric engine & data types
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Algebra / arithmetic | M/B | ✓ | Func §2 (mathjs) |
| Scalars, vectors, matrices / arrays | M/B | ✓ | Func §2 |
| **Complex numbers** | M/B | ◑ → ✚ | Make explicit — G3 |
| **Date & time math** | B | ✚ | Add datetime type/functions — G3 |
| Range variables / `vec()` / `IsRange()` | M | ◑ | Ranges in §2; add vec()/IsRange() to function set — G4 |
| Significant figures / decimals / **fractions display** | M/B | ◑ | Sig figs/decimals ✓ (7.8); add fraction display — G3 |
| Binary / octal / hex results | M | ✓ | Mockup 7.8 (radix) |
| Result threshold formatting (exp/complex/zero) | M | ✓ | Mockup 7.8, Func §2 |
| Multithreading / performance | M | ✓ | Func §2 (worker) |

### B4 · Symbolic engine (CAS)
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Symbolic evaluate / solve | M | ✚ | **G1 (Pyodide+SymPy)** |
| simplify / factor / expand / collect / rewrite | M | ✚ | G1 |
| Symbolic differentiate / integrate / limit / series (+Big-O) | M | ✚ | G1 |
| Symbolic ODE solving | M | ✚ | G1 |
| Integral transforms (fourier/laplace/ztrans + inverses) | M | ✚ | G1 |
| Gradient operator (symbolic + numeric) | M | ✚ | G1 |
| Keywords: assume, float, fully, standard, decomp; **hide symbolic keywords** | M | ✚ | G1 + G11 |
| Display symbolic solution inline (e.g. `zeros := … → −4`) | M | ✚ | render symbolic arrow result — G1/G2 |

### B5 · Units & dimensions
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Unit tracking / conversion / checking | M/B | ✓ | Func §2 |
| Units across calcs, functions, solve blocks, tables, matrices, plots | M | ✓ | Func §2 / components |
| SI / USCS / CGS systems | M | ✓ | Mockup 7.9 |
| **Custom unit systems** | M | ✓ | Mockup 7.10 |
| **User-defined custom units** | M/B | ✚ | Add single-unit definitions — G3 |
| **Feet & inches / composite units** | B | ✚ | Add feet-inch composite display — G3 |
| Hundreds of predefined units | M | ✓ | Mockup 4.6 / 7.6 catalog |

### B6 · Functions library
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Math & trig, logic, `If()`, logical functions | M/B | ✓ | Mockup 4.6 |
| **Statistics / probability** | M/B | ◑ → ✚ | Expand 4.6 categories — G4 |
| **Curve fitting & smoothing** (genfit/polyfit/interp/smooth) | M/B | ✚ | G4 (SciPy) |
| **Data analysis** | M | ✚ | G4 |
| **Signal & image processing** (FFT, filters) | M | ✚ | G4 (SciPy) |
| **Design of Experiments** | M | ✚ | G4 |
| **Text / string functions** | M/B | ✚ | G4 |
| **Lookup functions** (Vlookup/Hlookup/Index/Match/Interp) | M/B | ✓ | Mockup/Func 6.3 |
| Logarithmic & elliptic integral functions | M | ◑ | Part of SymPy/SciPy catalog — G4 |
| **Custom (user-defined) functions** | M/B | ✚ | Make explicit — G4 |
| **File I/O read/write functions** (txt/xlsx/csv/image) | M | ✚ | G6 |

### B7 · Solving & optimization
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Solve blocks (find/minerr) | M | ✓ | Mockup 6.5/7.17, Func 6.5 |
| Linear & nonlinear systems | M | ✓ | Func 6.5 (SciPy) |
| Constrained optimization (minimize/maximize) | M | ✓ | Func 6.5 |
| ODE / PDE solvers (odesolve/pdesolve/numol) | M | ✓ | Func 6.5 |
| Choice of solving algorithm (right-click menu) | M | ✓ | Mockup 6.5/7.17 |
| Solve-block scaling + CTOL | M | ◑ | Add CTOL/scaling options to 7.17 — G5 |
| **Goal seek** (solve single var to target) | B | ✚ | Add lightweight goal-seek — G5 |
| Symbolic solving inside solve block | M | ✚ | G1 |

### B8 · Programming
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Inline programs / natural-math logic | M/B | ✓ | Func §2 |
| Loops (for, while) | M/B | ✓ | Func §2 |
| Conditionals (if / else if / else) | M/B | ✓ | Func §2 |
| **Error catching (try / on error)** | M/B | ✚ | Add to programming spec — G10 |
| **Script modules** (reusable code) | B | ✚ | G10 |
| Python / VBScript / JScript scripting | M | ◑ | Python via Pyodide (G1); controls 7.16 |

### B9 · Tables & spreadsheets
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Native spreadsheets / embedded tables | M/B | ✓ | Mockup/Func 6.3 |
| Formula cells, A1 + named refs | M/B | ✓ | Func 6.3 |
| Per-column units | M | ✓ | 6.3 |
| Lookup functions in tables | M/B | ✓ | 6.3 |
| **Named table regions** | B | ✚ | Add named ranges/regions — G9 |
| **Sort & filter** | B | ✚ | G9 |
| **Array formulas** | B | ✚ | G9 |
| Excel component (bidirectional) | M | ✚ | G6 |

### B10 · Plotting & graphing
| Feature | Src | Status | Where / note |
|---|---|---|---|
| XY plots (line/scatter) | M/B | ✓ | Mockup/Func 6.4 |
| XY: **column, bar, stem, waterfall, error, box** | M | ◑ → ✚ | Add these subtypes — G4-plots note in G9 |
| 3D plots | M | ✓ | 6.4 |
| Polar plots | M | ✓ | 6.4 |
| Contour plots | M | ✓ | 6.4 |
| Plot by formula / plot functions | B | ✓ | Func 6.4 (bind to expression) |
| 2D plot titles/axis/gridlines/legend live edit | M | ◑ | Inspector 5.5; ensure title/legend/gridline editing |

### B11 · Controls & inputs
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Combo-box / dropdown (sets variable sets) | M/B | ✓ | Mockup/Func 6.7 |
| Sliders (+ invert, show min/max) | M | ✓ | 6.7 (note invert/min-max) |
| Radio (default-selected), checkbox, button, text box, list box | M | ✓ | 6.7 |
| Scripted control behavior (Python/VBScript/JScript) | M | ✓ | Mockup 7.16 |
| **Copy/paste multiple values into combo-box** | M | ✚ | Minor — G11 |

### B12 · Formatting & display
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Full text & math formatting control | M | ✓ | 5.5 / 7.19 |
| Result format (decimals/sigfig/notation/radix) | M | ✓ | 7.8 |
| Conditional formatting | M/B | ✓ | 7.18 |
| **Style rules** (named/auto rules) | B | ◑ | Text styles 7.19 + conditional 7.18 cover most; add a "style rules" note — G9 |
| Custom color picker | M | ✓ | 5.2 Format |
| Show region borders | M | ✓ | Mockup §2 / 6.10 |
| **Worksheet background color** | M | ✚ | Minor — G8 |

### B13 · Document structure & navigation
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Pages / page body frame | M | ✓ | Mockup §2, 7.12 |
| Columns + indent (your hybrid-flow) | — | ✓ | Mockup §2, 5.4 |
| **Tab stops** | B | ✚ | G8 |
| **Explicit page breaks** | B | ✚ | G8 (add insert-page-break) |
| Headers & footers (+ page-number formats, **world/system date**) | M | ✓ / ◑ | 7.11; add world/system date fields — G11 |
| Show frame (header/footer/body) | M | ✓ | 7.12 |
| Major gridlines toggle | M | ✓ | 7.12 / status bar |
| Table of contents | M/B | ✓ | 5.2 Document / 5.3 outline |
| **Outline numbering** | B | ✚ | Auto-numbered headings — G8 |
| Internal links | M/B | ✓ | 7.20 |
| **Link to a section of another worksheet** | M | ✚ | Cross-worksheet section link — G8 |
| Go-to page + **current-page tooltip** | M | ✓ / ✚ | 7.22; add page tooltip — G8 |

### B14 · Text & static content
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Text styles | M | ✓ | 7.19 |
| Subscript/superscript in text | M | ◑ | Note in 6.2 |
| **Static equations** (non-calculating, for docs) | B | ✚ | G5 |
| **Capture values** (snapshot live → static) | B | ✚ | G5 |
| Comments | M/B | ✓ | 7.24 |

### B15 · Media & sketching
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Images | M/B | ✓ | 6.6 |
| Simplified insert image (opens file browser) | M | ✓ | 7.15 |
| **Dynamic images** (swap by calc/condition) | B | ✚ | G6 |
| Sketching (vector) | M/B | ✓ | 6.6 |
| **Link sketches to calculations** (dims ↔ variables) | B | ✚ | G7 |
| **Embed PDFs** | B | ✚ | G6 |
| OLE / embed external app content | M | ✚ | G6 (web equivalent = embed) |

### B16 · Data exchange & files
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Save / export to PDF | M/B | ✓ | 4.10 |
| Save legacy as HTML | M | ✓ | 4.10 (HTML export) |
| Export Word / Excel | — | ✓ | 4.10 |
| **Import Mathcad (.mcdx/.xmcd)** | M/B | ✓ | 7.1 (note best-effort) |
| **Import SMath files** | B | ✚ | Add SMath import — G6 |
| **Excel component (bidirectional live)** | M | ✚ | G6 |
| **External data read/write (txt/xlsx/csv/image)** | M | ✚ | G6 (file functions) |
| Mathcad-style **API** for integrations | M | ◑ | Product decision: expose a Quanta API later — note |

### B17 · Content protection
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Collapsible, lockable areas | M | ✓ | 6.8 |
| Password protection (areas) | M | ✓ | 6.8 (note: soft, not security) |
| Lock to prevent viewing / hide proprietary | M | ✓ | 6.8 |
| **Hidden sections** (conditional visibility) | B | ✓ | 6.8 visibleWhen |
| Convert legacy password-protected areas | M | ◑ | Part of Mathcad import — G6 |

### B18 · Reuse & libraries
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Templates / reusable calcs | M/B | ✓ | 4.4 |
| **Custom libraries** (shared reusable content) | B | ✚ | G10 |
| External references / includes | M/B | ✓ | 6.9 |
| Open file from include region | M | ✓ | 6.9 (Open source) |

### B19 · Collaboration, review, productivity (UX)
| Feature | Src | Status | Where / note |
|---|---|---|---|
| Comments / review | M/B | ✓ | 7.24 |
| Redefinition warnings (per-identifier toggle) | M | ✓ | 6.12 |
| Find & replace (+ **identifier with subscript**) | M | ✓ / ✚ | 7.21; add subscript-identifier mode — G11 |
| **Functions to analyze functions** | M | ✚ | Minor (v12) — G11 |
| Zoom (Ctrl+wheel, 5% steps, view-page zoom) | M | ✓ | Status bar 5.6 |
| Worksheet tabs: close/context-menu/drag/unsaved-asterisk | M | ◑ → ✚ | With multi-doc tabs — G8 |
| Contextual learning / tutorials | M | ◑ | Onboarding 7.32; could add a help/learn panel |

### B20 · Beyond the desktop products (your additions — keep)
| Feature | Src | Status | Where / note |
|---|---|---|---|
| AI assist (draft/check/explain) | (B has AI) | ✓ | 5.9 / 7.30 |
| Multi-tenant workspaces, roles, sharing, real-time | — | ✓ | Func §1 |
| Version history | — | ✓ | 4.9 |
| Cloud file browser / projects | — | ✓ | 4.5 |

---

## Part C — Gap-fill prompts (paste into Claude Design or your build agent)

Each fragment is additive to the existing briefs. **(D)** = design prompt (Claude Design) · **(F)** = functional prompt (build).

### G1 · Symbolic (CAS) engine
```
(F) Extend /lib/calc with a SYMBOLIC layer using SymPy via Pyodide (Web Worker). Expose:
solve, simplify, factor, expand, collect, rewrite; diff, integrate (definite/indefinite),
limit, series (with Big-O / "standard" constant of integration); dsolve (symbolic ODE);
fourier/laplace/ztrans + inverses; gradient(scalar, vars); assumptions (assume real/complex/positive);
decomp (decompose large expressions); coeffs. A math region may carry a "symbolic" evaluation
(operator "→") in addition to numeric "=". Render symbolic results in math notation (e.g.
zeros := s+4 → −4; poles := s³+3s²+7s+5 → [−1, −1+2i, −1−2i]). Add a per-keyword "hide symbolic
keywords" display toggle. Symbolic calls run in the worker and fall back gracefully with a clear
message if a result is "undefined"/unsupported.
```
```
(D) Add a SYMBOLIC RESULT state to the math region: an expression with a labeled arrow operator
(e.g. "solve, s →") producing a simplified/closed-form result or a result vector, rendered in the
textbook math font. Show one example resolving to a value (→ −4) and one to a vector of roots
(real + complex). Add a small "keywords" affordance on a symbolic region (simplify / solve / factor /
expand / float / fully) and a toggle to hide the keyword label in the rendered output.
```

### G2 · Natural Mathcad-style math entry (PRIMARY input + unit-aware)
```
(F) The PRIMARY input is natural Mathcad-style 2D math entry via MathLive (mathfield): the engineer
types and notation builds live — '/' → stacked fraction, '^' → superscript, '_' → subscript, a
function or Greek name → the symbol, space exits the current subexpression, ':' → the ':=' assignment.
Configure MathLive's keybindings/macros for this Mathcad-like behavior. A plain-text formula field is
a SECONDARY/optional fast-entry mode (toggle on the region; persist which mode is used). Both
round-trip through the same AST (MathLive ↔ LaTeX ↔ mathjs/SymPy); committing either yields the same
evaluated result. Entry is UNIT-AWARE: typing a number then a unit ('12 kN', '700 MPa', '16 mm',
'5 ft 6 in') attaches the unit; the engine runs dimensional analysis, auto-converts, and flags
mismatches inline; every result carries + displays its unit.
```
```
(D) The math region's default edit state is the NATURAL MATH EDITOR: a region where a half-typed
equation shows a visual stacked fraction with a placeholder box for the next term, the caret inside
the numerator, a unit token (kN/MPa) styled distinctly, and a math input bar / operator palette for
building notation. Show a small "√x | Aa" toggle to drop to the secondary plain-text mode. Keep
rendered math ≥ ~18–20px and results clearly highlighted with their unit.
```

### G3 · Data types & units (complex, date/time, custom units, feet-inches, LaTeX names, fractions)
```
(F) Add to the engine: native COMPLEX numbers (a+bi, with complex result threshold formatting);
DATE & TIME values + arithmetic (durations, differences, calendar math) as a first-class quantity
type with its own formats; USER-DEFINED CUSTOM UNITS (define a unit in terms of existing units,
e.g. 1 kip := 1000 lbf) alongside custom unit SYSTEMS; FEET-AND-INCHES composite display
(e.g. 5 ft 6 in) and other composite/mixed units; LaTeX-style variable identifiers (allow names
written/displayed via LaTeX). Add a "fraction" display option to ResultFormat (show a result as a
proper/improper fraction). Surface all of these in the Result Format dialog (7.8) and the units
catalog (7.6).
```
```
(D) Update the Result Format dialog (7.8): add a "Fraction" notation option, a "Complex" display
group (rectangular a+bi vs polar), and a Date/Time format group. Update the Insert Unit dialog (7.6)
with a "Create custom unit" action (define new = expression of existing units) and a "feet & inches"
composite example. Show a worksheet value rendered as 5 ft 6 in and another as a fraction.
```

### G4 · Function library breadth + custom functions
```
(D) Expand the Reference Library (4.6) FUNCTIONS categories to: Math & trig · Statistics & probability ·
Data analysis · Curve fitting & smoothing · Interpolation · Signal & image processing (FFT/filters) ·
Differential equations · Solving & optimization · Linear algebra/matrix · Lookup & data ·
String/text · Date & time · File I/O · Design of experiments · Programming · Engineering. Show a
worked example for one in each major group (e.g. a curve fit, an FFT magnitude plot, an interp on a
wind-pressure table).
```
```
(F) Back the library with NumPy/SciPy (via Pyodide) for stats, curve fitting/smoothing, interpolation,
FFT/signal & image processing, optimization, ODE/PDE, and DOE; mathjs for fast elementary math +
linear algebra; plus string, date/time, and file-I/O functions. Support USER-DEFINED FUNCTIONS
(f(x,y) := …) that enter the dependency graph and are callable like built-ins. Generate the library's
function list from the engine's registry so docs can't drift. Add vec() and IsRange().
```

### G5 · Goal seek, capture values, static equations, solve-block CTOL/scaling
```
(F) Add (a) GOAL SEEK: solve a single input variable so a chosen output hits a target value
(1-D root find via SciPy/Newton), invoked from a result's context menu ("Solve for… to make this = X");
(b) CAPTURE VALUE: snapshot a live computed result into a STATIC value that no longer recalculates
(stores the frozen value + a "captured on" note; re-capture to refresh); (c) STATIC EQUATIONS: a math
region flagged non-calculating, for documentation only. Extend solve blocks (7.17) with objective/
constraint SCALING and CTOL/TOL overrides.
```
```
(D) Add to the math-region context menu (6.10): "Solve for variable → target…" (goal seek),
"Capture value (freeze)", and "Make static (don't calculate)". Show a captured region with a small
"captured" pin badge and a static region with a subtle "static" tag. Add scaling + CTOL fields to the
Solve-block config dialog (7.17).
```

### G6 · Data exchange (Excel component, file read/write, SMath import, embed PDF, dynamic images, OLE)
```
(F) Add: (a) an EXCEL COMPONENT region — an embedded sheet with bidirectional binding (worksheet
variables → input cells, output cells → worksheet variables), backed by SheetJS; (b) FILE READ/WRITE
functions for txt/csv/xlsx and image formats (READ/WRITE/READEXCEL/READIMAGE), reading from uploaded
files in Storage; (c) IMPORT of SMath Studio files (best-effort) in addition to Mathcad .mcdx/.xmcd
(incl. converting legacy password-protected areas); (d) EMBED PDF region (store + render an embedded
PDF); (e) DYNAMIC IMAGE region (image source bound to a variable/condition so it swaps on recalc).
Treat OLE-style external embeds as the embed-PDF/embed-file pattern on web.
```
```
(D) Add component prompts: an EXCEL COMPONENT region (mini embedded grid with input/output cells
visually marked and arrows to bound worksheet variables); an EMBED PDF region (a framed PDF preview
with page controls); a DYNAMIC IMAGE region (an image with a small "bound to: status" chip showing it
changes by condition). Update the Import dialog (7.1) to list Mathcad, SMath, Excel, CSV sources.
```

### G7 · Sketch ↔ calculation linking
```
(F) In the sketch region (6.6), allow a dimension or label to BIND to a worksheet variable, so editing
the variable updates the sketch dimension and vice-versa; store bindings as {shapeId, dimType, varName}.
(D) Update the SKETCH region (6.6) to show a dimension whose value is driven by a variable (e.g. a
bracket width labeled "= b = 120 mm" in the Blueprint accent), with a small link icon indicating the
dimension is bound to the calculation.
```

### G8 · Document structure extras
```
(F) Add: insertable PAGE BREAKS; TAB STOPS in text regions; OUTLINE NUMBERING (auto-numbered headings
feeding the TOC); a CROSS-WORKSHEET SECTION LINK (link to a tagged section in another worksheet, opens
+ scrolls there); a CURRENT-PAGE tooltip while scrolling; a WORKSHEET BACKGROUND COLOR setting; and a
multi-document OPEN-WORKSHEET TAB BAR (close, context menu: calculate/close others/copy path/print/
save-as, drag-reorder, unsaved-asterisk).
(D) Add: a tab bar above the ribbon showing open worksheets (active + others, unsaved asterisk, close
×, overflow); an "insert page break" affordance on the canvas; auto outline numbers on headings in the
outline panel (5.3) and TOC; a worksheet background-color control in Page setup (7.12); a page tooltip
("Page 3 of 12") that appears while scrolling.
```

### G9 · Table extras + style rules + plot subtypes
```
(F) Tables (6.3): add NAMED TABLE REGIONS (name a range, reference it elsewhere), SORT & FILTER on
columns, and ARRAY FORMULAS (a formula producing a spilled range). Add STYLE RULES: reusable named
conditional-style rules applied across regions/tables (beyond per-region conditional formatting).
Plots (6.4): add column, bar, stem, waterfall, error-bar, and box subtypes to the XY plot type list.
(D) Update the table component (6.3) with a sort/filter header affordance and a "name this range"
action; update the plot wizard (7.13) type row to include column/bar/stem/waterfall/error/box; add a
"Style rules" manager (reusable named rules) alongside conditional formatting (7.18).
```

### G10 · Programming extras (error handling, script modules, custom libraries)
```
(F) Programming: add ERROR CATCHING (try / on error) to the inline-program constructs. Add SCRIPT
MODULES: reusable Python (Pyodide) modules a worksheet can import and call. Add CUSTOM LIBRARIES:
workspace-shared collections of reusable regions/functions/units/templates (a libraries table +
include-style importing), distinct from single-worksheet includes.
(D) Add a "Script module" region/editor (code panel, Python, with imported-by indicator) and a
"Libraries" browser (workspace-shared reusable content: functions, units, snippets, templates) with
an "import into worksheet" action.
```

### G11 · Minor Mathcad items
```
(F/D) Add these smaller items where noted: HIDE SYMBOLIC KEYWORDS toggle on symbolic regions (G1);
FUNCTIONS THAT ANALYZE FUNCTIONS (Mathcad v12 — e.g. inspect a function's properties); FIND & REPLACE
of an identifier WITH ITS SUBSCRIPT (7.21 option); COPY/PASTE MULTIPLE VALUES into a combo-box (6.7);
WORLD-DATE and SYSTEM-DATE fields in headers/footers (7.11).
```

---

## Part D — How to apply this

1. **Engine:** replace the **LIBRARIES** block in Functional Brief §2 with Part A's layered engine (patched copy is in the updated file). This is the only *correction*; everything else is *addition*.
2. **Two fundamentals** are patched into the briefs already: the **visual formula editor** (Mockup 6.1) and the **layered engine** (Functional §2).
3. **Remaining gaps (✚):** paste the matching **G-prompt** from Part C alongside the relevant section's existing prompt when you mock or build that piece. They're ordered by impact (G1 symbolic and G2 visual editor first).
4. **Nothing from the four PDFs is dropped** — every line is in the matrix as `✓`, `◑`, or `✚` with a destination.
