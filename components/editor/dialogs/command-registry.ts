/**
 * Command palette registry (Func §5.8) — the catalog of actions the ⌘K palette
 * runs. Built from the editor's own command surface plus the canonical
 * `/lib/keymap` symbol table (so symbol inserts come from the SAME list as the
 * operator palette and Insert-symbol dialog — no second table).
 */
import { ALL_SYMBOLS, type SymbolEntry } from "@/lib/keymap";
import type { RefGroup } from "@/lib/calc/reference";
import type { RegionType } from "@/lib/worksheet/content";
import type { EditorDialogKind } from "../state/editor-reducer";

export interface Command {
  id: string;
  label: string;
  /** Right-aligned hint (category or shortcut). */
  hint?: string;
  /** Extra search terms. */
  keywords?: string;
  run: () => void;
}

export interface CommandContext {
  canEdit: boolean;
  selectedId: string | null;
  open: (kind: EditorDialogKind) => void;
  openReference: (kind: RefGroup) => void;
  insertRegion: (type: RegionType) => void;
  insertSymbol: (sym: SymbolEntry) => void;
  recalculate: () => void;
  recalculateToHere: (id: string) => void;
  setMode: (mode: "auto" | "manual") => void;
  openExport: () => void;
}

export function buildCommands(ctx: CommandContext): Command[] {
  const commands: Command[] = [];
  const edit = (cmd: Command): Command => ({ ...cmd, run: ctx.canEdit ? cmd.run : () => {} });

  // Insert regions + reference (function/unit/constant insertion routes through
  // the Reference overlay — no duplicate picker).
  commands.push(
    edit({ id: "insert.math", label: "Insert math region", hint: "Insert", run: () => ctx.insertRegion("math") }),
    edit({ id: "insert.text", label: "Insert text region", hint: "Insert", run: () => ctx.insertRegion("text") }),
    edit({ id: "insert.table", label: "Insert table", hint: "Insert", run: () => ctx.insertRegion("table") }),
    edit({ id: "insert.plot", label: "Insert plot", hint: "Insert", run: () => ctx.insertRegion("plot") }),
    edit({ id: "insert.solve", label: "Insert solve block", hint: "Insert", run: () => ctx.insertRegion("solve") }),
    edit({ id: "insert.program", label: "Insert program", hint: "Insert", run: () => ctx.insertRegion("program") }),
    edit({ id: "insert.symbolDialog", label: "Insert symbol…", hint: "Insert", run: () => ctx.open("insertSymbol") }),
    { id: "ref.functions", label: "Insert function…", hint: "Reference", run: () => ctx.openReference("FUNCTIONS") },
    { id: "ref.units", label: "Insert unit…", hint: "Reference", run: () => ctx.openReference("UNITS") },
    { id: "ref.constants", label: "Insert constant…", hint: "Reference", run: () => ctx.openReference("CONSTANTS") },
  );

  // Formatting dialogs.
  commands.push(
    edit({ id: "fmt.result", label: "Result format…", hint: "Format", run: () => ctx.open("resultFormat") }),
    edit({ id: "fmt.conditional", label: "Conditional formatting…", hint: "Format", run: () => ctx.open("conditionalFormat") }),
    edit({ id: "fmt.page", label: "Page setup…", hint: "Format", run: () => ctx.open("pageSetup") }),
    edit({ id: "fmt.headers", label: "Headers & footers…", hint: "Format", run: () => ctx.open("headersFooters") }),
    edit({ id: "fmt.textStyles", label: "Text styles…", hint: "Format", run: () => ctx.open("textStyles") }),
  );

  // Utility + worksheet.
  commands.push(
    { id: "util.find", label: "Find & replace…", hint: "Edit", keywords: "search", run: () => ctx.open("findReplace") },
    { id: "util.goto", label: "Go to page…", hint: "Navigate", run: () => ctx.open("goToPage") },
    { id: "util.shortcuts", label: "Keyboard shortcuts", hint: "Help", run: () => ctx.open("shortcuts") },
    { id: "calc.recalc", label: "Recalculate worksheet", hint: "Calc", keywords: "f9", run: ctx.recalculate },
    edit({ id: "calc.auto", label: "Set calc mode: Auto", hint: "Calc", run: () => ctx.setMode("auto") }),
    edit({ id: "calc.manual", label: "Set calc mode: Manual", hint: "Calc", run: () => ctx.setMode("manual") }),
    { id: "export.open", label: "Print / export…", hint: "Worksheet", run: ctx.openExport },
  );
  if (ctx.selectedId) {
    const id = ctx.selectedId;
    commands.push({ id: "calc.recalcHere", label: "Recalculate to here", hint: "Calc", run: () => ctx.recalculateToHere(id) });
  }

  // Symbol inserts — straight from the canonical /lib/keymap catalog.
  for (const sym of ALL_SYMBOLS) {
    commands.push(
      edit({
        id: `sym.${sym.id}`,
        label: `Insert ${sym.glyph}  ${sym.label}`,
        hint: sym.group,
        keywords: `${sym.id} symbol ${sym.group}`,
        run: () => ctx.insertSymbol(sym),
      }),
    );
  }

  return commands;
}

/** Substring fuzzy match over label + hint + keywords. */
export function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  const terms = q.split(/\s+/);
  return commands.filter((c) => {
    const hay = `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}
