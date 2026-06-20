/**
 * Editor reducer — the pure document + UI state machine behind the worksheet
 * editor. It owns the content tree and the chrome state; the calc engine lives
 * beside it (in the provider, behind a ref) and is reconciled from `content`.
 * Every structural op preserves the `cells.length === columns` invariant and
 * never drops a region. Kept pure and exhaustively tested.
 */
import type { RegionResult, SheetResult } from "@/lib/calc";
import type { RefGroup } from "@/lib/calc/reference";
import {
  emptyCell,
  newId,
  newRegion,
  singleColumnRow,
  type Cell,
  type CellAlign,
  type CondRule,
  type ControlKind,
  type ControlOption,
  type ControlValueType,
  type DisplayFlags,
  type OdeConfig,
  type PlotAxis,
  type PlotGrid,
  type PlotKind,
  type PlotTrace,
  type PlotZ,
  type Region,
  type RegionType,
  type ResultFormat,
  type Row,
  type SolveAlgorithm,
  type SolveGuess,
  type SurfaceOptions,
  type SymbolicCache,
  type WorksheetContent,
} from "@/lib/worksheet/content";
import { colToLetter } from "@/lib/calc";
import { findRegion, readingOrderIds } from "@/lib/worksheet/flatten";

export type CalcMode = "auto" | "manual";
export type CalcStatus = "current" | "stale" | "error";
export type SaveState = "saved" | "saving" | "unsaved" | "error";
export type UnitsSystem = "si" | "uscs" | "cgs" | "custom";
export type LeftTab = "outline" | "variables" | "files";
/** The auxiliary right-edge drawer opened from the app bar (mutually exclusive). */
export type RightPanel = "none" | "comments" | "ai";

/** Every centrally-hosted editor dialog (rendered by `<DialogHost />`). */
export type EditorDialogKind =
  | "insertSymbol"
  | "resultFormat"
  | "conditionalFormat"
  | "pageSetup"
  | "headersFooters"
  | "textStyles"
  | "findReplace"
  | "goToPage"
  | "shortcuts"
  | "commandPalette"
  | "worksheetSettings";

/** The open dialog + its optional target region (result/conditional format). */
export interface EditorDialog {
  kind: EditorDialogKind;
  regionId?: string | null;
}

export interface EditorUiState {
  leftOpen: boolean;
  leftTab: LeftTab;
  rightOpen: boolean;
  ribbonTab: string;
  ribbonCollapsed: boolean;
  /** Whether the Reference library overlay is open. */
  referenceOpen: boolean;
  /** Which group the Reference library opened to (Functions / Units / …). */
  referenceKind: RefGroup;
  /** Whether the Print / export preview overlay is open. */
  exportOpen: boolean;
  /** Which app-bar drawer is docked on the right (comments / AI / none). */
  rightPanel: RightPanel;
  /** Whether the floating Quanta math keypad is showing (summonable from a field). */
  keypadOpen: boolean;
  /** The centrally-hosted dialog that is open, or null. */
  activeDialog: EditorDialog | null;
}

export interface EditorState {
  content: WorksheetContent;
  results: Map<string, RegionResult>;
  /** The primary/active selection — drives the inspector, ribbon, comment anchor. */
  selectedId: string | null;
  /**
   * The full multi-selection set (cmd/shift-click). Always contains `selectedId`
   * when it is non-null; an empty array means nothing is selected. Group ops
   * (delete/indent/duplicate) act on this set; everything else reads `selectedId`.
   */
  selectedIds: string[];
  editingId: string | null;
  calcMode: CalcMode;
  calcStatus: CalcStatus;
  errorCount: number;
  saveState: SaveState;
  unitsSystem: UnitsSystem;
  zoom: number;
  ui: EditorUiState;
}

/** Inspector-editable region properties (Object.assigned onto the region). */
export interface RegionPatch {
  unit?: string;
  format?: ResultFormat;
  conditional?: CondRule[];
  display?: Partial<DisplayFlags>;
  /** Worker-computed symbolic result, written by the symbolic producer. */
  cache?: SymbolicCache;
  border?: boolean;
  tag?: string;
  heading?: 1 | 2 | 3;
  eyebrow?: string;
  title?: string;
  collapsed?: boolean;
  disabled?: boolean;
  /** Table named range (the chip + worksheet export). */
  name?: string;
  /** Plot/control scalar fields (structured axis/trace edits use dedicated actions). */
  kind?: PlotKind | ControlKind;
  xVar?: string;
  yVar?: string;
  xData?: string;
  samples?: number;
  legend?: boolean;
  frame?: boolean;
  z?: PlotZ;
  grid?: PlotGrid;
  surface?: SurfaceOptions;
  /** Input-control fields (Mockup §6.7). `kind`/`unit`/`label` shared above. */
  bind?: string;
  label?: string;
  value?: string | number | boolean;
  valueType?: ControlValueType;
  min?: number;
  max?: number;
  step?: number;
  invert?: boolean;
  options?: ControlOption[];
  /** Solve-block fields (Functional Brief §6.5) — whole-array commits, like plot `z`. */
  algorithm?: SolveAlgorithm;
  guesses?: SolveGuess[];
  constraints?: string[];
  objective?: string;
  ctol?: number;
  scaling?: number;
  maxIter?: number;
  onNonConverge?: "error" | "last";
  ode?: OdeConfig;
}

/** Inspector-editable table-column properties (Object.assigned onto the column). */
export interface TableColumnPatch {
  label?: string;
  unit?: string;
  align?: CellAlign;
  format?: ResultFormat;
  conditional?: CondRule[];
}

export type EditorAction =
  | { type: "SELECT"; id: string | null }
  | { type: "TOGGLE_SELECT"; id: string }
  | { type: "SELECT_TO"; id: string }
  | { type: "SELECT_ALL" }
  | { type: "BEGIN_EDIT"; id: string }
  | { type: "END_EDIT" }
  | { type: "EDIT_SOURCE"; id: string; source: string }
  | { type: "EDIT_TEXT"; id: string; text: string }
  | { type: "SET_REGION_PROP"; id: string; patch: RegionPatch }
  | { type: "REPLACE_CONTENT"; content: WorksheetContent }
  | { type: "EDIT_TABLE_CELL"; id: string; r: number; c: number; source: string }
  | { type: "ADD_TABLE_ROW"; id: string }
  | { type: "DELETE_TABLE_ROW"; id: string; r: number }
  | { type: "ADD_TABLE_COLUMN"; id: string }
  | { type: "DELETE_TABLE_COLUMN"; id: string; key: string }
  | { type: "SET_TABLE_COLUMN"; id: string; key: string; patch: TableColumnPatch }
  | { type: "SET_PLOT_AXIS"; id: string; axis: "x" | "y"; patch: Partial<PlotAxis> }
  | { type: "ADD_PLOT_TRACE"; id: string }
  | { type: "DELETE_PLOT_TRACE"; id: string; traceId: string }
  | { type: "SET_PLOT_TRACE"; id: string; traceId: string; patch: Partial<PlotTrace> }
  | { type: "TOGGLE_PLOT_TRACE"; id: string; traceId: string }
  | {
      type: "INSERT_REGION";
      regionType: RegionType;
      anchorId: string | null;
      where: "above" | "below";
    }
  | { type: "INSERT_INTO_CELL"; rowId: string; cellIndex: number; regionType: RegionType }
  | { type: "MOVE_TO_CELL"; id: string; rowId: string; cellIndex: number }
  | {
      type: "INSERT_REGION_WITH_SOURCE";
      source: string;
      anchorId: string | null;
      where: "above" | "below";
    }
  | { type: "INSERT_HEADING"; anchorId: string | null; where: "above" | "below" }
  | { type: "INSERT_PLOT"; kind: PlotKind; anchorId: string | null; where: "above" | "below" }
  | { type: "DELETE_REGION"; id: string }
  | { type: "DELETE_SELECTED" }
  | { type: "DUPLICATE_REGION"; id: string }
  | { type: "DUPLICATE_SELECTED" }
  | { type: "MOVE_REGION"; id: string; dir: "up" | "down" }
  | { type: "MOVE_TO"; id: string; targetId: string; position: "before" | "after" }
  | { type: "INDENT"; id: string; delta: 1 | -1 }
  | { type: "INDENT_SELECTED"; delta: 1 | -1 }
  | { type: "SET_COLUMNS"; rowId: string; columns: 1 | 2 | 3 }
  | { type: "SET_SPLIT"; rowId: string; split: number[] }
  | { type: "TOGGLE_SPAN"; id: string }
  | { type: "TOGGLE_AREA"; id: string }
  | { type: "SET_RESULTS"; sheet: SheetResult }
  | { type: "MARK_STALE" }
  | { type: "SET_CALC_MODE"; mode: CalcMode }
  | { type: "SET_SAVE_STATE"; state: SaveState }
  | { type: "SET_UNITS"; system: UnitsSystem }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "TOGGLE_LEFT" }
  | { type: "SET_LEFT_TAB"; tab: LeftTab }
  | { type: "TOGGLE_RIGHT" }
  | { type: "TOGGLE_KEYPAD" }
  | { type: "SET_KEYPAD"; open: boolean }
  | { type: "SET_RIBBON_TAB"; tab: string }
  | { type: "TOGGLE_RIBBON" }
  | { type: "OPEN_REFERENCE"; kind: RefGroup }
  | { type: "CLOSE_REFERENCE" }
  | { type: "OPEN_EXPORT" }
  | { type: "CLOSE_EXPORT" }
  | { type: "TOGGLE_RIGHT_PANEL"; panel: Exclude<RightPanel, "none"> }
  | { type: "CLOSE_RIGHT_PANEL" }
  | { type: "OPEN_DIALOG"; dialog: EditorDialog }
  | { type: "CLOSE_DIALOG" };

/* ------------------------------------------------------------------ *
 * Tree locators (operate on a structuredClone, mutating in place)
 * ------------------------------------------------------------------ */

interface Loc {
  /** The array directly holding the region (a cell's or an area's). */
  container: Region[];
  index: number;
  row: Row;
  /** The owning cell when the region is top-level; null inside an area. */
  cell: Cell | null;
}

function locate(content: WorksheetContent, id: string): Loc | null {
  for (const row of content.rows) {
    for (const cell of row.cells) {
      const found = locateIn(cell.regions, id, row, cell);
      if (found) return found;
    }
  }
  return null;
}

function locateIn(
  container: Region[],
  id: string,
  row: Row,
  cell: Cell | null,
): Loc | null {
  for (let i = 0; i < container.length; i += 1) {
    const region = container[i];
    if (region.id === id) return { container, index: i, row, cell };
    if (region.type === "area") {
      const inner = locateIn(region.regions, id, row, null);
      if (inner) return inner;
    }
  }
  return null;
}

/** Assign fresh ids to a region (and its area children) — used when duplicating. */
function reidRegion(region: Region): Region {
  region.id = newId();
  if (region.type === "area") region.regions = region.regions.map(reidRegion);
  return region;
}

/** Drop rows whose every cell is empty (after a delete), so no blank gaps linger. */
function pruneEmptyRows(content: WorksheetContent): void {
  content.rows = content.rows.filter((row) =>
    row.cells.some((cell) => cell.regions.length > 0),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Smallest fraction a single column may shrink to when dragging the split. */
const MIN_COL_FRACTION = 0.14;

/**
 * Normalize a column-split into exactly `length` positive ratios that sum to 1,
 * with no column thinner than `MIN_COL_FRACTION`. Drag handlers can hand us raw
 * pointer fractions; this keeps every cell usable and the grid well-formed.
 */
function clampSplit(split: number[]): number[] {
  const clamped = split.map((v) => Math.max(MIN_COL_FRACTION, Number.isFinite(v) ? v : 0));
  const sum = clamped.reduce((a, b) => a + b, 0) || 1;
  return clamped.map((v) => v / sum);
}

/** The selection patch for a single primary id (or a cleared selection). */
function selectOne(id: string | null): Pick<EditorState, "selectedId" | "selectedIds"> {
  return { selectedId: id, selectedIds: id ? [id] : [] };
}

/**
 * After a structural delete, drop any selected ids that no longer exist (e.g. an
 * area's children when the area was removed) and repair the primary so it stays a
 * member of the set — keeping the inspector/ribbon in sync with what's visible.
 */
function reconcileSelection(
  content: WorksheetContent,
  selectedId: string | null,
  selectedIds: string[],
): Pick<EditorState, "selectedId" | "selectedIds"> {
  const alive = new Set(readingOrderIds(content));
  const ids = selectedIds.filter((id) => alive.has(id));
  const primary =
    selectedId && alive.has(selectedId) ? selectedId : ids[ids.length - 1] ?? null;
  return { selectedId: primary, selectedIds: ids };
}

/** Clone the tree, run a mutator over it, return the new tree. */
function mutate(
  content: WorksheetContent,
  fn: (next: WorksheetContent) => void,
): WorksheetContent {
  const next: WorksheetContent = structuredClone(content);
  fn(next);
  return next;
}

/* ------------------------------------------------------------------ *
 * Result bookkeeping
 * ------------------------------------------------------------------ */

function applyResults(state: EditorState, sheet: SheetResult): EditorState {
  const results = new Map<string, RegionResult>();
  for (const r of sheet.regions) results.set(r.id, r);
  return {
    ...state,
    results,
    calcStatus: sheet.status,
    errorCount: sheet.errorCount,
  };
}

function markStale(state: EditorState): EditorState {
  const results = new Map(state.results);
  for (const [id, r] of results) {
    if (r.status === "current") results.set(id, { ...r, status: "stale" });
  }
  return {
    ...state,
    results,
    calcStatus: state.errorCount > 0 ? "error" : "stale",
  };
}

/* ------------------------------------------------------------------ *
 * Reducer
 * ------------------------------------------------------------------ */

/** Mark the document dirty whenever content changes (drives autosave). */
function touched(
  state: EditorState,
  content: WorksheetContent,
  extra: Partial<EditorState> = {},
): EditorState {
  return { ...state, content, saveState: "unsaved", ...extra };
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    /* ---- selection / editing ---- */
    case "SELECT":
      return { ...state, ...selectOne(action.id), editingId: null };
    case "TOGGLE_SELECT": {
      // Cmd/Ctrl-click: add to or remove from the multi-selection. Removing the
      // primary promotes the last remaining id (in click order) to primary.
      if (state.selectedIds.includes(action.id)) {
        const selectedIds = state.selectedIds.filter((id) => id !== action.id);
        const selectedId =
          state.selectedId === action.id
            ? selectedIds[selectedIds.length - 1] ?? null
            : state.selectedId;
        return { ...state, selectedId, selectedIds, editingId: null };
      }
      return {
        ...state,
        selectedId: action.id,
        selectedIds: [...state.selectedIds, action.id],
        editingId: null,
      };
    }
    case "SELECT_TO": {
      // Shift-click: select the contiguous reading-order range from the current
      // primary (the anchor) to the clicked id. Falls back to a single select
      // when there's no anchor or an id isn't found.
      const order = readingOrderIds(state.content);
      const a = state.selectedId ? order.indexOf(state.selectedId) : -1;
      const b = order.indexOf(action.id);
      if (a === -1 || b === -1) {
        return { ...state, ...selectOne(action.id), editingId: null };
      }
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      return {
        ...state,
        selectedId: action.id,
        selectedIds: order.slice(lo, hi + 1),
        editingId: null,
      };
    }
    case "SELECT_ALL": {
      const order = readingOrderIds(state.content);
      if (order.length === 0) return state;
      return {
        ...state,
        selectedId: order[order.length - 1],
        selectedIds: order,
        editingId: null,
      };
    }
    case "BEGIN_EDIT":
      // Editing is inherently single-target — collapse any multi-selection.
      return { ...state, selectedId: action.id, selectedIds: [action.id], editingId: action.id };
    case "END_EDIT":
      return { ...state, editingId: null };

    /* ---- content edits ---- */
    case "EDIT_SOURCE": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (region && region.type === "math") region.source = action.source;
      });
      return touched(state, content);
    }
    case "EDIT_TEXT": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (region && region.type === "text") region.text = action.text;
      });
      return touched(state, content);
    }
    case "SET_REGION_PROP": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region) return;
        // The patch is keyed to the region's own props; assign the defined keys.
        const target = region as Record<string, unknown>;
        for (const [key, value] of Object.entries(action.patch)) {
          if (value !== undefined) target[key] = value;
        }
      });
      return touched(state, content);
    }
    case "REPLACE_CONTENT": {
      // Apply a wholesale new tree (formatting at worksheet scope, replace-all).
      // Selection is reconciled so any ids that vanished are dropped.
      return touched(state, action.content, {
        ...reconcileSelection(action.content, state.selectedId, state.selectedIds),
      });
    }

    /* ---- table edits ---- */
    case "EDIT_TABLE_CELL": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region || region.type !== "table") return;
        const width = Math.max(region.columns.length, 1);
        while (region.rows.length <= action.r) region.rows.push(Array(width).fill(""));
        const row = region.rows[action.r];
        while (row.length <= action.c) row.push("");
        row[action.c] = action.source;
      });
      return touched(state, content);
    }
    case "ADD_TABLE_ROW": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region || region.type !== "table") return;
        region.rows.push(Array(Math.max(region.columns.length, 1)).fill(""));
      });
      return touched(state, content);
    }
    case "DELETE_TABLE_ROW": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region || region.type !== "table") return;
        if (action.r >= 0 && action.r < region.rows.length) region.rows.splice(action.r, 1);
      });
      return touched(state, content);
    }
    case "ADD_TABLE_COLUMN": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region || region.type !== "table") return;
        region.columns.push({ key: newId(), label: `Column ${colToLetter(region.columns.length)}` });
        for (const row of region.rows) row.push("");
      });
      return touched(state, content);
    }
    case "DELETE_TABLE_COLUMN": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region || region.type !== "table") return;
        const ci = region.columns.findIndex((col) => col.key === action.key);
        if (ci === -1) return;
        region.columns.splice(ci, 1);
        for (const row of region.rows) if (ci < row.length) row.splice(ci, 1);
      });
      return touched(state, content);
    }
    case "SET_TABLE_COLUMN": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region || region.type !== "table") return;
        const column = region.columns.find((col) => col.key === action.key);
        if (!column) return;
        const target = column as Record<string, unknown>;
        for (const [key, value] of Object.entries(action.patch)) {
          if (value !== undefined) target[key] = value;
        }
      });
      return touched(state, content);
    }

    /* ---- plot edits ---- */
    case "SET_PLOT_AXIS": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region || region.type !== "plot") return;
        // Spread the patch (which may carry `min: undefined` to clear a pin to auto).
        region[action.axis] = { ...region[action.axis], ...action.patch };
      });
      return touched(state, content);
    }
    case "ADD_PLOT_TRACE": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region || region.type !== "plot") return;
        region.traces.push({ id: newId(), expr: "", style: "line" });
      });
      return touched(state, content);
    }
    case "DELETE_PLOT_TRACE": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region || region.type !== "plot") return;
        region.traces = region.traces.filter((t) => t.id !== action.traceId);
      });
      return touched(state, content);
    }
    case "SET_PLOT_TRACE": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region || region.type !== "plot") return;
        const trace = region.traces.find((t) => t.id === action.traceId);
        if (trace) Object.assign(trace, action.patch);
      });
      return touched(state, content);
    }
    case "TOGGLE_PLOT_TRACE": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (!region || region.type !== "plot") return;
        const trace = region.traces.find((t) => t.id === action.traceId);
        if (trace) trace.hidden = !trace.hidden;
      });
      return touched(state, content);
    }

    /* ---- structural ops ---- */
    case "INSERT_REGION": {
      const region = newRegion(action.regionType);
      const content = mutate(state.content, (next) => {
        if (!action.anchorId) {
          next.rows.push(singleColumnRow([region]));
          return;
        }
        const loc = locate(next, action.anchorId);
        if (!loc) {
          next.rows.push(singleColumnRow([region]));
          return;
        }
        const at = loc.index + (action.where === "below" ? 1 : 0);
        loc.container.splice(at, 0, region);
      });
      const editable = region.type === "math" || region.type === "text";
      return touched(state, content, {
        selectedId: region.id,
        selectedIds: [region.id],
        editingId: editable ? region.id : null,
      });
    }
    case "INSERT_REGION_WITH_SOURCE": {
      // Like INSERT_REGION (math) but the source is set in the same mutation, so
      // the new region's id is returned synchronously in `selectedId` — no need
      // to chain an EDIT_SOURCE on an id we don't yet have. Used by the
      // Reference library's "Insert into worksheet".
      const region = newRegion("math");
      if (region.type === "math") region.source = action.source;
      const content = mutate(state.content, (next) => {
        if (!action.anchorId) {
          next.rows.push(singleColumnRow([region]));
          return;
        }
        const loc = locate(next, action.anchorId);
        if (!loc) {
          next.rows.push(singleColumnRow([region]));
          return;
        }
        const at = loc.index + (action.where === "below" ? 1 : 0);
        loc.container.splice(at, 0, region);
      });
      return touched(state, content, {
        selectedId: region.id,
        selectedIds: [region.id],
        editingId: region.id,
      });
    }
    case "INSERT_HEADING": {
      // A heading is a text region with `heading` set in the same mutation, so
      // the "+ heading" button can be a single dispatch and open it for editing
      // immediately (the new id isn't returned to the caller otherwise).
      const region = newRegion("text");
      if (region.type === "text") region.heading = 1;
      const content = mutate(state.content, (next) => {
        if (!action.anchorId) {
          next.rows.push(singleColumnRow([region]));
          return;
        }
        const loc = locate(next, action.anchorId);
        if (!loc) {
          next.rows.push(singleColumnRow([region]));
          return;
        }
        const at = loc.index + (action.where === "below" ? 1 : 0);
        loc.container.splice(at, 0, region);
      });
      return touched(state, content, {
        selectedId: region.id,
        selectedIds: [region.id],
        editingId: region.id,
      });
    }
    case "INSERT_PLOT": {
      // Like INSERT_REGION but with the chart kind set in the same mutation, so a
      // Polar / Contour / 3D ribbon button is a single dispatch (the new id isn't
      // returned to the caller otherwise).
      const region = newRegion("plot");
      if (region.type === "plot") region.kind = action.kind;
      const content = mutate(state.content, (next) => {
        if (!action.anchorId) {
          next.rows.push(singleColumnRow([region]));
          return;
        }
        const loc = locate(next, action.anchorId);
        if (!loc) {
          next.rows.push(singleColumnRow([region]));
          return;
        }
        const at = loc.index + (action.where === "below" ? 1 : 0);
        loc.container.splice(at, 0, region);
      });
      return touched(state, content, {
        selectedId: region.id,
        selectedIds: [region.id],
        editingId: null,
      });
    }
    case "INSERT_INTO_CELL": {
      const region = newRegion(action.regionType);
      const content = mutate(state.content, (next) => {
        const row = next.rows.find((r) => r.id === action.rowId);
        const cell = row?.cells[action.cellIndex];
        if (cell) cell.regions.push(region);
      });
      const editable = region.type === "math" || region.type === "text";
      return touched(state, content, {
        selectedId: region.id,
        selectedIds: [region.id],
        editingId: editable ? region.id : null,
      });
    }
    case "MOVE_TO_CELL": {
      // Drag a region into a (top-level) cell, appending it — the structural
      // move that drops a region into an empty column. Mirrors MOVE_TO's
      // splice-out → relocate → prune so reading order recomputes cleanly.
      // Precondition-check on the original tree so genuine no-ops stay clean.
      const destCell = state.content.rows.find((r) => r.id === action.rowId)
        ?.cells[action.cellIndex];
      const source = locate(state.content, action.id);
      if (!destCell || !source || source.cell === destCell) return state;
      const content = mutate(state.content, (next) => {
        const cell = next.rows.find((r) => r.id === action.rowId)!.cells[action.cellIndex];
        const src = locate(next, action.id)!;
        const [moved] = src.container.splice(src.index, 1);
        cell.regions.push(moved);
        pruneEmptyRows(next);
      });
      return touched(state, content, { selectedId: action.id, selectedIds: [action.id] });
    }
    case "DELETE_REGION": {
      const content = mutate(state.content, (next) => {
        const loc = locate(next, action.id);
        if (loc) loc.container.splice(loc.index, 1);
        pruneEmptyRows(next);
      });
      return touched(state, content, {
        ...reconcileSelection(content, state.selectedId, state.selectedIds),
        editingId: state.editingId === action.id ? null : state.editingId,
      });
    }
    case "DELETE_SELECTED": {
      if (state.selectedIds.length === 0) return state;
      const ids = state.selectedIds;
      const content = mutate(state.content, (next) => {
        // Re-locate per id (indices shift as we splice); descendants of a deleted
        // area go with it, then reconcileSelection drops their ids below.
        for (const id of ids) {
          const loc = locate(next, id);
          if (loc) loc.container.splice(loc.index, 1);
        }
        pruneEmptyRows(next);
      });
      return touched(state, content, {
        selectedId: null,
        selectedIds: [],
        editingId: state.editingId && ids.includes(state.editingId) ? null : state.editingId,
      });
    }
    case "DUPLICATE_REGION": {
      const newRegionId = { current: "" };
      const content = mutate(state.content, (next) => {
        const loc = locate(next, action.id);
        if (!loc) return;
        const copy = reidRegion(structuredClone(loc.container[loc.index]));
        newRegionId.current = copy.id;
        loc.container.splice(loc.index + 1, 0, copy);
      });
      return touched(state, content, {
        ...selectOne(newRegionId.current || state.selectedId),
      });
    }
    case "DUPLICATE_SELECTED": {
      if (state.selectedIds.length === 0) return state;
      const newIds: string[] = [];
      const content = mutate(state.content, (next) => {
        for (const id of state.selectedIds) {
          const loc = locate(next, id);
          if (!loc) continue;
          const copy = reidRegion(structuredClone(loc.container[loc.index]));
          newIds.push(copy.id);
          loc.container.splice(loc.index + 1, 0, copy);
        }
      });
      if (newIds.length === 0) return state;
      return touched(state, content, { selectedId: newIds[newIds.length - 1], selectedIds: newIds });
    }
    case "MOVE_REGION": {
      const content = mutate(state.content, (next) => {
        const loc = locate(next, action.id);
        if (!loc) return;
        const j = loc.index + (action.dir === "up" ? -1 : 1);
        if (j < 0 || j >= loc.container.length) return;
        const tmp = loc.container[loc.index];
        loc.container[loc.index] = loc.container[j];
        loc.container[j] = tmp;
      });
      return touched(state, content);
    }
    case "MOVE_TO": {
      if (action.id === action.targetId) return state;
      const content = mutate(state.content, (next) => {
        const src = locate(next, action.id);
        if (!src) return;
        const [moved] = src.container.splice(src.index, 1);
        const tgt = locate(next, action.targetId);
        if (!tgt) {
          // Target vanished (shouldn't happen) — put it back where it was.
          src.container.splice(src.index, 0, moved);
          return;
        }
        const at = tgt.index + (action.position === "after" ? 1 : 0);
        tgt.container.splice(at, 0, moved);
        pruneEmptyRows(next);
      });
      return touched(state, content);
    }
    case "INDENT": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (region) region.indent = clamp(region.indent + action.delta, 0, 8);
      });
      return touched(state, content);
    }
    case "INDENT_SELECTED": {
      if (state.selectedIds.length === 0) return state;
      const ids = new Set(state.selectedIds);
      const content = mutate(state.content, (next) => {
        for (const id of ids) {
          const region = findRegion(next, id);
          if (region) region.indent = clamp(region.indent + action.delta, 0, 8);
        }
      });
      return touched(state, content);
    }
    case "SET_COLUMNS": {
      const content = mutate(state.content, (next) => {
        const row = next.rows.find((r) => r.id === action.rowId);
        if (!row) return;
        const columns = action.columns;
        if (columns > row.columns) {
          while (row.cells.length < columns) row.cells.push(emptyCell());
        } else if (columns < row.columns) {
          // Merge all regions into the first cell, then pad — never lose content.
          const merged = row.cells.flatMap((c) => c.regions);
          row.cells = [{ regions: merged }];
          while (row.cells.length < columns) row.cells.push(emptyCell());
        }
        row.columns = columns;
        row.split = undefined;
      });
      return touched(state, content);
    }
    case "SET_SPLIT": {
      const target = state.content.rows.find((r) => r.id === action.rowId);
      // Single-column rows have no split; a mismatched length is ignored.
      if (!target || target.columns < 2 || action.split.length !== target.columns) {
        return state;
      }
      const content = mutate(state.content, (next) => {
        const row = next.rows.find((r) => r.id === action.rowId)!;
        row.split = clampSplit(action.split);
      });
      return touched(state, content);
    }
    case "TOGGLE_SPAN": {
      const content = mutate(state.content, (next) => {
        const loc = locate(next, action.id);
        if (!loc || !loc.cell) return; // areas: span not supported this pass
        const alreadySpans =
          loc.row.columns === 1 && loc.container.length === 1;
        if (alreadySpans) return;
        const rowIndex = next.rows.indexOf(loc.row);
        const [region] = loc.container.splice(loc.index, 1);
        next.rows.splice(rowIndex + 1, 0, singleColumnRow([region]));
        pruneEmptyRows(next);
      });
      return touched(state, content, { ...selectOne(action.id) });
    }
    case "TOGGLE_AREA": {
      const content = mutate(state.content, (next) => {
        const region = findRegion(next, action.id);
        if (region && region.type === "area") region.collapsed = !region.collapsed;
      });
      return touched(state, content);
    }

    /* ---- engine + status ---- */
    case "SET_RESULTS":
      return applyResults(state, action.sheet);
    case "MARK_STALE":
      return markStale(state);
    case "SET_CALC_MODE":
      return { ...state, calcMode: action.mode };
    case "SET_SAVE_STATE":
      return { ...state, saveState: action.state };
    case "SET_UNITS":
      return { ...state, unitsSystem: action.system };
    case "SET_ZOOM":
      return { ...state, zoom: clamp(action.zoom, 0.5, 2) };

    /* ---- ui chrome ---- */
    case "TOGGLE_LEFT":
      return { ...state, ui: { ...state.ui, leftOpen: !state.ui.leftOpen } };
    case "SET_LEFT_TAB":
      return { ...state, ui: { ...state.ui, leftTab: action.tab, leftOpen: true } };
    case "TOGGLE_RIGHT":
      return { ...state, ui: { ...state.ui, rightOpen: !state.ui.rightOpen } };
    case "TOGGLE_KEYPAD":
      return { ...state, ui: { ...state.ui, keypadOpen: !state.ui.keypadOpen } };
    case "SET_KEYPAD":
      return { ...state, ui: { ...state.ui, keypadOpen: action.open } };
    case "SET_RIBBON_TAB":
      return { ...state, ui: { ...state.ui, ribbonTab: action.tab } };
    case "TOGGLE_RIBBON":
      return {
        ...state,
        ui: { ...state.ui, ribbonCollapsed: !state.ui.ribbonCollapsed },
      };
    case "OPEN_REFERENCE":
      return {
        ...state,
        ui: { ...state.ui, referenceOpen: true, referenceKind: action.kind },
      };
    case "CLOSE_REFERENCE":
      return { ...state, ui: { ...state.ui, referenceOpen: false } };
    case "OPEN_EXPORT":
      return { ...state, ui: { ...state.ui, exportOpen: true } };
    case "CLOSE_EXPORT":
      return { ...state, ui: { ...state.ui, exportOpen: false } };
    case "TOGGLE_RIGHT_PANEL":
      return {
        ...state,
        ui: {
          ...state.ui,
          // Re-clicking the active drawer's button closes it; otherwise switch.
          rightPanel: state.ui.rightPanel === action.panel ? "none" : action.panel,
        },
      };
    case "CLOSE_RIGHT_PANEL":
      return { ...state, ui: { ...state.ui, rightPanel: "none" } };
    case "OPEN_DIALOG":
      return { ...state, ui: { ...state.ui, activeDialog: action.dialog } };
    case "CLOSE_DIALOG":
      return { ...state, ui: { ...state.ui, activeDialog: null } };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ *
 * Initial state
 * ------------------------------------------------------------------ */

export function initEditorState(args: {
  content: WorksheetContent;
  calcMode: CalcMode;
  unitsSystem: UnitsSystem;
}): EditorState {
  return {
    content: args.content,
    results: new Map(),
    selectedId: null,
    selectedIds: [],
    editingId: null,
    calcMode: args.calcMode,
    calcStatus: "current",
    errorCount: 0,
    saveState: "saved",
    unitsSystem: args.unitsSystem,
    zoom: 1,
    ui: {
      leftOpen: true,
      leftTab: "outline",
      rightOpen: true,
      ribbonTab: "Home",
      ribbonCollapsed: false,
      referenceOpen: false,
      referenceKind: "FUNCTIONS",
      exportOpen: false,
      rightPanel: "none",
      keypadOpen: false,
      activeDialog: null,
    },
  };
}
