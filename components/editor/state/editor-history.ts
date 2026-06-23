/**
 * Undo/redo for the worksheet editor — a higher-order reducer that wraps the pure
 * {@link editorReducer} without touching it (or `EditorState`). It keeps past /
 * future stacks of lightweight document snapshots and intercepts UNDO / REDO; every
 * other action is delegated to the inner reducer and a snapshot is pushed only when
 * the document tree actually changed.
 *
 * Design notes:
 * - **Snapshots are document-only** (`content` + selection). The inner reducer's
 *   `mutate()` returns a fresh, immutable `content` on every edit, so a snapshot can
 *   reference `present.content` directly — no extra clone. Results / UI / calc mode
 *   are derived or ephemeral and are restored from the live `present`, not the snap.
 * - **Content-neutral actions** (select, results, stale, save-state, all UI) keep the
 *   same `content` reference, so they update `present` but never push history.
 * - **Worker-written caches** (`SET_REGION_PROP` carrying only `cache`/`solution`,
 *   dispatched by the SymPy / SciPy producer hooks) change `content` but are derived,
 *   not user edits: they update `present` without creating an undo step and, crucially,
 *   without clearing the redo stack.
 * - **Coalescing** folds a burst of same-target edits (typing, a slider or split-ratio
 *   drag) into one undo step. The key is identity-based (no clock), so the wrapper
 *   stays pure and deterministically testable. The recalc/autosave background trio
 *   (`SET_RESULTS` / `MARK_STALE` / `SET_SAVE_STATE`) preserves the coalescing key so
 *   a drag's interleaved recompute doesn't split it; any other content-neutral action
 *   (a fresh selection, entering/leaving edit) ends the run.
 */
import {
  editorReducer,
  initEditorState,
  type CalcMode,
  type EditorAction,
  type EditorState,
  type UnitsSystem,
} from "./editor-reducer";
import type { WorksheetContent } from "@/lib/worksheet/content";

/** A document-only restore point: the tree plus where the selection was. */
export interface Snapshot {
  content: WorksheetContent;
  selectedId: string | null;
  selectedIds: string[];
}

export interface HistoryState {
  present: EditorState;
  /** Restore points before the present, oldest → newest (top = most recent). */
  past: Snapshot[];
  /** Undone states available to redo, oldest → newest (top = next redo). */
  future: Snapshot[];
  /** Coalescing key of the last content-changing step, or null. */
  lastKey: string | null;
}

/** The dispatchable surface: every editor action, plus the two history controls. */
export type HistoryAction = EditorAction | { type: "UNDO" } | { type: "REDO" };

/** Cap on retained undo steps (older steps drop off the bottom). */
const HISTORY_LIMIT = 100;

/** Patch keys written only by the worker producer hooks (never by user UI). */
const WORKER_PATCH_KEYS = new Set(["cache", "solution"]);

/**
 * True when an action is a worker-written cache/solution patch — a derived content
 * change that must not become an undo step or clear the redo stack. A *mixed* patch
 * (a worker key alongside a user key) is deliberately NOT excluded, so a real edit is
 * never silently dropped from history.
 */
function isWorkerPatch(action: EditorAction): boolean {
  if (action.type !== "SET_REGION_PROP") return false;
  const keys = Object.keys(action.patch);
  return keys.length > 0 && keys.every((k) => WORKER_PATCH_KEYS.has(k));
}

/**
 * A stable key for actions whose rapid repetition should collapse into one undo
 * step (continuous typing, slider/split drags), or null for one-shot/structural ops
 * that each deserve their own step.
 */
function coalesceKey(action: EditorAction): string | null {
  switch (action.type) {
    case "EDIT_SOURCE":
      return `EDIT_SOURCE:${action.id}`;
    case "EDIT_TEXT":
      return `EDIT_TEXT:${action.id}`;
    case "EDIT_TABLE_CELL":
      return `EDIT_TABLE_CELL:${action.id}:${action.r}:${action.c}`;
    case "SET_REGION_PROP":
      return `SET_REGION_PROP:${action.id}`;
    case "SET_PLOT_AXIS":
      return `SET_PLOT_AXIS:${action.id}:${action.axis}`;
    case "SET_SPLIT":
      return `SET_SPLIT:${action.rowId}`;
    default:
      return null;
  }
}

/**
 * Content-neutral actions that must preserve the coalescing run: the background
 * recompute + autosave trio that fires automatically between a drag's ticks. Every
 * other content-neutral action (a new selection, begin/end edit, a UI toggle) is a
 * user boundary that ends the run so two separate edit sessions don't merge.
 */
function preservesCoalesce(action: EditorAction): boolean {
  return (
    action.type === "SET_RESULTS" ||
    action.type === "MARK_STALE" ||
    action.type === "SET_SAVE_STATE"
  );
}

function snapshotOf(state: EditorState): Snapshot {
  return { content: state.content, selectedId: state.selectedId, selectedIds: state.selectedIds };
}

/**
 * Apply a snapshot over the live present: swap in the document + selection, leave
 * edit mode (never re-mount a field onto a swapped tree), and mark the doc unsaved so
 * autosave persists the restored tree. Results refresh from the new content via the
 * provider's recalc effect.
 */
function restore(present: EditorState, snap: Snapshot): EditorState {
  return {
    ...present,
    content: snap.content,
    selectedId: snap.selectedId,
    selectedIds: snap.selectedIds,
    editingId: null,
    saveState: "unsaved",
  };
}

/** Wrap a base editor reducer with undo/redo history tracking. */
export function withHistory(
  base: (state: EditorState, action: EditorAction) => EditorState,
): (h: HistoryState, action: HistoryAction) => HistoryState {
  return (h, action) => {
    if (action.type === "UNDO") {
      if (h.past.length === 0) return h;
      const snap = h.past[h.past.length - 1];
      return {
        present: restore(h.present, snap),
        past: h.past.slice(0, -1),
        future: [...h.future, snapshotOf(h.present)],
        lastKey: null,
      };
    }
    if (action.type === "REDO") {
      if (h.future.length === 0) return h;
      const snap = h.future[h.future.length - 1];
      return {
        present: restore(h.present, snap),
        past: [...h.past, snapshotOf(h.present)],
        future: h.future.slice(0, -1),
        lastKey: null,
      };
    }

    const next = base(h.present, action);
    if (next === h.present) return h; // inner no-op — nothing to record

    // Content unchanged (selection / results / save-state / UI): update present and
    // keep the coalescing run alive only for the background recompute+autosave trio.
    if (next.content === h.present.content) {
      return preservesCoalesce(action)
        ? { ...h, present: next }
        : { ...h, present: next, lastKey: null };
    }

    // Worker-written cache/solution: a derived change, not an undo step — and it must
    // not clear the redo stack or disturb an in-progress coalescing run.
    if (isWorkerPatch(action)) return { ...h, present: next };

    const key = coalesceKey(action);
    if (key && key === h.lastKey) {
      // Fold this edit into the current step; a new edit always voids redo.
      return { present: next, past: h.past, future: [], lastKey: key };
    }
    return {
      present: next,
      past: [...h.past, snapshotOf(h.present)].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: key,
    };
  };
}

/** The wrapped reducer (module-scope so its identity is stable across renders). */
export const editorHistoryReducer = withHistory(editorReducer);

export function initHistory(args: {
  content: WorksheetContent;
  calcMode: CalcMode;
  unitsSystem: UnitsSystem;
}): HistoryState {
  return { present: initEditorState(args), past: [], future: [], lastKey: null };
}

/** Whether an undo / redo is currently available (for any UI affordance). */
export function canUndo(h: HistoryState): boolean {
  return h.past.length > 0;
}
export function canRedo(h: HistoryState): boolean {
  return h.future.length > 0;
}
