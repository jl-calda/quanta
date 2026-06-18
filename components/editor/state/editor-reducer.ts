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
  type CondRule,
  type DisplayFlags,
  type Region,
  type RegionType,
  type ResultFormat,
  type Row,
  type WorksheetContent,
} from "@/lib/worksheet/content";
import { findRegion } from "@/lib/worksheet/flatten";

export type CalcMode = "auto" | "manual";
export type CalcStatus = "current" | "stale" | "error";
export type SaveState = "saved" | "saving" | "unsaved" | "error";
export type UnitsSystem = "si" | "uscs" | "cgs" | "custom";
export type LeftTab = "outline" | "variables" | "files";
/** The auxiliary right-edge drawer opened from the app bar (mutually exclusive). */
export type RightPanel = "none" | "comments" | "ai";

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
}

export interface EditorState {
  content: WorksheetContent;
  results: Map<string, RegionResult>;
  selectedId: string | null;
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
  border?: boolean;
  tag?: string;
  heading?: 1 | 2 | 3;
  eyebrow?: string;
  title?: string;
  collapsed?: boolean;
  disabled?: boolean;
}

export type EditorAction =
  | { type: "SELECT"; id: string | null }
  | { type: "BEGIN_EDIT"; id: string }
  | { type: "END_EDIT" }
  | { type: "EDIT_SOURCE"; id: string; source: string }
  | { type: "EDIT_TEXT"; id: string; text: string }
  | { type: "SET_REGION_PROP"; id: string; patch: RegionPatch }
  | {
      type: "INSERT_REGION";
      regionType: RegionType;
      anchorId: string | null;
      where: "above" | "below";
    }
  | { type: "INSERT_INTO_CELL"; rowId: string; cellIndex: number; regionType: RegionType }
  | {
      type: "INSERT_REGION_WITH_SOURCE";
      source: string;
      anchorId: string | null;
      where: "above" | "below";
    }
  | { type: "DELETE_REGION"; id: string }
  | { type: "DUPLICATE_REGION"; id: string }
  | { type: "MOVE_REGION"; id: string; dir: "up" | "down" }
  | { type: "MOVE_TO"; id: string; targetId: string; position: "before" | "after" }
  | { type: "INDENT"; id: string; delta: 1 | -1 }
  | { type: "SET_COLUMNS"; rowId: string; columns: 1 | 2 | 3 }
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
  | { type: "SET_RIBBON_TAB"; tab: string }
  | { type: "TOGGLE_RIBBON" }
  | { type: "OPEN_REFERENCE"; kind: RefGroup }
  | { type: "CLOSE_REFERENCE" }
  | { type: "OPEN_EXPORT" }
  | { type: "CLOSE_EXPORT" }
  | { type: "TOGGLE_RIGHT_PANEL"; panel: Exclude<RightPanel, "none"> }
  | { type: "CLOSE_RIGHT_PANEL" };

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
      return { ...state, selectedId: action.id, editingId: null };
    case "BEGIN_EDIT":
      return { ...state, selectedId: action.id, editingId: action.id };
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
        editingId: region.id,
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
        editingId: editable ? region.id : null,
      });
    }
    case "DELETE_REGION": {
      const content = mutate(state.content, (next) => {
        const loc = locate(next, action.id);
        if (loc) loc.container.splice(loc.index, 1);
        pruneEmptyRows(next);
      });
      const clearSel = state.selectedId === action.id;
      return touched(state, content, {
        selectedId: clearSel ? null : state.selectedId,
        editingId: state.editingId === action.id ? null : state.editingId,
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
        selectedId: newRegionId.current || state.selectedId,
      });
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
      return touched(state, content, { selectedId: action.id });
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
    },
  };
}
