"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { CalcEngine, SI_SYSTEM, type PlotResult, type TableResult } from "@/lib/calc";
import { buildEngineInputs, settleTables } from "@/lib/worksheet/flatten";
import type { WorksheetContent } from "@/lib/worksheet/content";
import {
  renameWorksheet as renameAction,
  saveWorksheetVersion,
  setCalcMode as setCalcModeAction,
} from "@/server/actions/worksheet";
import {
  editorReducer,
  initEditorState,
  type CalcMode,
  type EditorAction,
  type EditorState,
  type UnitsSystem,
} from "./editor-reducer";
import { useAutosave } from "./use-autosave";

export interface EditorContextValue {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  canEdit: boolean;
  worksheetId: string;
  /** Recompute the whole sheet now and publish results (Manual "Recalculate"). */
  recalculate: () => void;
  /** Recompute up to a region in reading order; later regions stay stale. */
  recalculateToHere: (id: string) => void;
  /** Toggle Auto/Manual: persists, and (→Auto) recomputes to clear stale. */
  setMode: (mode: CalcMode) => void;
  /** Persist the app-bar title rename. */
  rename: (title: string) => void;
  /** Snapshot the current content as a worksheet version. */
  saveVersion: (label?: string) => Promise<void>;
  /** Per-table evaluation results (the scope-bridge output), keyed by region id. */
  tableResults: Map<string, TableResult>;
  /** Per-plot sampled series (read-only scope consumers), keyed by region id. */
  plotResults: Map<string, PlotResult>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within <EditorProvider>");
  return ctx;
}

export interface EditorProviderProps {
  worksheetId: string;
  initialContent: WorksheetContent;
  initialCalcMode: CalcMode;
  initialUnits: UnitsSystem;
  canEdit: boolean;
  children: ReactNode;
}

export function EditorProvider({
  worksheetId,
  initialContent,
  initialCalcMode,
  initialUnits,
  canEdit,
  children,
}: EditorProviderProps) {
  const [state, dispatch] = useReducer(
    editorReducer,
    { content: initialContent, calcMode: initialCalcMode, unitsSystem: initialUnits },
    initEditorState,
  );

  // The calc engine lives beside the reducer (a pure, synchronous core). We keep
  // it in a ref and reconcile it from `content`. Engine evaluation always uses
  // SI display this pass; USCS/CGS are display-only selections (see plan).
  const engineRef = useRef<CalcEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new CalcEngine(buildEngineInputs(initialContent), {
      unitSystem: SI_SYSTEM,
      mode: initialCalcMode,
    });
  }

  const [tableResults, setTableResults] = useState<Map<string, TableResult>>(() => new Map());
  const [plotResults, setPlotResults] = useState<Map<string, PlotResult>>(() => new Map());

  // Run the engine + tables to a settled fixpoint (the scope-bridge); `settleTables`
  // is pure and unit-tested in `lib/worksheet/flatten`. Plots sample the settled
  // scope in the same pass, so they stay reactive on every recalc.
  const reconcile = (content: WorksheetContent) => settleTables(content, engineRef.current!);

  const publishReconcile = (content: WorksheetContent) => {
    const { sheet, tables, plots } = reconcile(content);
    setTableResults(tables);
    setPlotResults(plots);
    dispatch({ type: "SET_RESULTS", sheet });
  };

  // Compute once on mount; thereafter reconcile on every content change.
  const mounted = useRef(false);
  const modeRef = useRef(state.calcMode);
  modeRef.current = state.calcMode;

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      publishReconcile(state.content);
      return;
    }
    if (modeRef.current === "auto") {
      publishReconcile(state.content);
    } else {
      // Manual: leave results untouched; the view shows the edit as stale
      // until the user recalculates.
      dispatch({ type: "MARK_STALE" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.content]);

  const recalculate = () => publishReconcile(state.content);

  const recalculateToHere = (id: string) => {
    const { sheet: fresh, tables, plots } = reconcile(state.content);
    setTableResults(tables);
    setPlotResults(plots);
    const cut = fresh.regions.findIndex((r) => r.id === id);
    if (cut === -1) {
      dispatch({ type: "SET_RESULTS", sheet: fresh });
      return;
    }
    // Commit results up to `id`; keep later regions at their previous (stale) value.
    const regions = fresh.regions.map((r, i) =>
      i <= cut ? r : state.results.get(r.id) ?? { ...r, status: "stale" as const },
    );
    const errorCount = regions.filter((r) => r.status === "error").length;
    const hasStale = regions.some((r) => r.status === "stale");
    dispatch({
      type: "SET_RESULTS",
      sheet: {
        regions,
        errorCount,
        status: errorCount > 0 ? "error" : hasStale ? "stale" : "current",
      },
    });
  };

  const setMode = (mode: CalcMode) => {
    dispatch({ type: "SET_CALC_MODE", mode });
    if (mode === "auto") recalculate();
    if (canEdit) void setCalcModeAction({ id: worksheetId, mode });
  };

  const rename = (title: string) => {
    if (canEdit) void renameAction({ id: worksheetId, title });
  };

  const saveVersion = async (label?: string) => {
    await saveWorksheetVersion({ id: worksheetId, content: state.content, label });
  };

  useAutosave({
    worksheetId,
    canEdit,
    saveState: state.saveState,
    snapshot: {
      content: state.content,
      calcStatus: state.calcStatus,
      errorCount: state.errorCount,
    },
    dispatch,
  });

  const value = useMemo<EditorContextValue>(
    () => ({
      state,
      dispatch,
      canEdit,
      worksheetId,
      recalculate,
      recalculateToHere,
      setMode,
      rename,
      saveVersion,
      tableResults,
      plotResults,
    }),
    // `state`, `tableResults`, and `plotResults` are the changing dependencies
    // consumers read; the callbacks close over them and are recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, canEdit, worksheetId, tableResults, plotResults],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
