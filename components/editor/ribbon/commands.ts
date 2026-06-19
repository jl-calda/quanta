"use client";

import { findRegion, findRowOf } from "@/lib/worksheet/flatten";
import type { MathRegion, PlotKind, PlotRegion, RegionType } from "@/lib/worksheet/content";
import { useEditor } from "../state/editor-provider";
import type { CalcMode, EditorDialogKind, UnitsSystem } from "../state/editor-reducer";
import { useComments } from "../comments/comments-provider";
import {
  insertIntoActiveField,
  matrixLatex,
  matrixSource,
  MATRIX_TEMPLATES,
  OPERATOR_TEMPLATES,
  type MatrixOpKey,
  type OperatorKey,
} from "../math-entry";

/**
 * Selection state the ribbon reflects — controls read this to render the right
 * active/value/enabled state for the current selection (Func §5.2: "controls
 * reflect the current selection").
 */
export interface RibbonSelection {
  hasSelection: boolean;
  regionType: RegionType | null;
  isMath: boolean;
  isPlot: boolean;
  /** The selected plot's legend is shown (drives the contextual Legend toggle). */
  plotLegend: boolean;
  /** A math region is open for editing (its field is the natural-entry target). */
  isEditingMath: boolean;
  decimals: number;
  showSteps: boolean;
  border: boolean;
  columns: 1 | 2 | 3;
  /** Selection is a top-level cell region, so "span all columns" applies. */
  canSpan: boolean;
  calcMode: CalcMode;
  unitsSystem: UnitsSystem;
  /** The comments drawer is the active right panel. */
  commentsOpen: boolean;
  canEdit: boolean;
  canComment: boolean;
}

/**
 * The ribbon's typed command surface — every control fires one of these. They
 * map onto the editor reducer, the provider's calc helpers, or the shared
 * math-entry bridge; targets are derived from the current selection and mutating
 * commands are gated on role.
 */
export interface RibbonCommands {
  insertRegion: (type: RegionType) => void;
  /** Insert a plot of a specific kind (Polar / Contour / 3D ribbon buttons). */
  insertPlot: (kind: PlotKind) => void;
  /** Add a trace to the selected plot (contextual Plot tab). */
  addPlotTrace: () => void;
  /** Toggle the selected plot's legend (contextual Plot tab). */
  togglePlotLegend: () => void;
  insertOp: (key: OperatorKey) => void;
  insertMatrixOp: (key: MatrixOpKey) => void;
  insertMatrix: (rows: number, cols: number) => void;
  setDecimals: (n: number) => void;
  toggleShowSteps: () => void;
  toggleBorder: () => void;
  setUnitsSystem: (system: UnitsSystem) => void;
  indent: (delta: 1 | -1) => void;
  setColumns: (columns: 1 | 2 | 3) => void;
  toggleSpan: () => void;
  setMode: (mode: CalcMode) => void;
  recalculate: () => void;
  recalculateToHere: () => void;
  openFunctions: () => void;
  openUnits: () => void;
  openConstants: () => void;
  /** Open a centrally-hosted editor dialog (formatting / insert symbol / utility). */
  openDialog: (kind: EditorDialogKind) => void;
  openComments: () => void;
  toggleComments: () => void;
  newComment: () => void;
  setTab: (tab: string) => void;
}

/** Evaluation glyphs aren't standalone formulas — start an empty region instead. */
const FRAGMENT_KEYS = new Set<OperatorKey>(["assign", "evaluate", "global"]);

/**
 * `useRibbonCommands` — the ribbon's command dispatcher + reflected selection.
 * Centralizing it here keeps the tab components declarative (they call `cmd.*`
 * and read `sel.*`) and keeps the typed-command contract in one tested place.
 */
export function useRibbonCommands(): { cmd: RibbonCommands; sel: RibbonSelection } {
  const { state, dispatch, canEdit, recalculate, recalculateToHere, setMode } = useEditor();
  const { canComment } = useComments();

  const selected = state.selectedId ? findRegion(state.content, state.selectedId) : undefined;
  const selectedMath: MathRegion | undefined =
    selected?.type === "math" ? selected : undefined;
  const selectedPlot: PlotRegion | undefined =
    selected?.type === "plot" ? selected : undefined;
  const editing = state.editingId ? findRegion(state.content, state.editingId) : undefined;
  const row = state.selectedId ? findRowOf(state.content, state.selectedId) : null;
  const isTopLevel =
    !!row && row.cells.some((c) => c.regions.some((r) => r.id === state.selectedId));

  const sel: RibbonSelection = {
    hasSelection: !!selected,
    regionType: selected?.type ?? null,
    isMath: !!selectedMath,
    isPlot: !!selectedPlot,
    plotLegend: selectedPlot?.legend ?? false,
    isEditingMath: editing?.type === "math",
    decimals: selectedMath?.format?.decimals ?? 2,
    showSteps: selectedMath?.display?.substituted ?? false,
    border: selected?.border ?? false,
    columns: row?.columns ?? 1,
    canSpan: canEdit && isTopLevel,
    calcMode: state.calcMode,
    unitsSystem: state.unitsSystem,
    commentsOpen: state.ui.rightPanel === "comments",
    canEdit,
    canComment,
  };

  const insertRegion = (type: RegionType) => {
    if (!canEdit) return;
    dispatch({ type: "INSERT_REGION", regionType: type, anchorId: state.selectedId, where: "below" });
  };

  const insertPlot = (kind: PlotKind) => {
    if (!canEdit) return;
    dispatch({ type: "INSERT_PLOT", kind, anchorId: state.selectedId, where: "below" });
  };

  const addPlotTrace = () => {
    if (!canEdit || !selectedPlot) return;
    dispatch({ type: "ADD_PLOT_TRACE", id: selectedPlot.id });
  };

  const togglePlotLegend = () => {
    if (!canEdit || !selectedPlot) return;
    dispatch({ type: "SET_REGION_PROP", id: selectedPlot.id, patch: { legend: !selectedPlot.legend } });
  };

  const insertOp = (key: OperatorKey) => {
    if (!canEdit) return;
    const tpl = OPERATOR_TEMPLATES[key];
    if (insertIntoActiveField({ latex: tpl.latex, text: tpl.source })) return;
    // Nothing focused: open a fresh region. Seed it for structural operators;
    // evaluation glyphs alone aren't a formula, so just start an empty region.
    if (FRAGMENT_KEYS.has(key)) {
      dispatch({ type: "INSERT_REGION", regionType: "math", anchorId: state.selectedId, where: "below" });
    } else {
      dispatch({ type: "INSERT_REGION_WITH_SOURCE", source: tpl.source, anchorId: state.selectedId, where: "below" });
    }
  };

  const insertMatrixOp = (key: MatrixOpKey) => {
    if (!canEdit) return;
    const tpl = MATRIX_TEMPLATES[key];
    if (insertIntoActiveField({ latex: tpl.latex, text: tpl.source })) return;
    dispatch({ type: "INSERT_REGION_WITH_SOURCE", source: tpl.source, anchorId: state.selectedId, where: "below" });
  };

  const insertMatrix = (rows: number, cols: number) => {
    if (!canEdit) return;
    if (insertIntoActiveField({ latex: matrixLatex(rows, cols), text: matrixSource(rows, cols) })) return;
    dispatch({ type: "INSERT_REGION_WITH_SOURCE", source: matrixSource(rows, cols), anchorId: state.selectedId, where: "below" });
  };

  const setDecimals = (n: number) => {
    if (!canEdit || !selectedMath) return;
    const decimals = Math.max(0, Math.min(6, n));
    dispatch({ type: "SET_REGION_PROP", id: selectedMath.id, patch: { format: { ...selectedMath.format, decimals } } });
  };

  const toggleShowSteps = () => {
    if (!canEdit || !selectedMath) return;
    const cur = selectedMath.display?.substituted ?? false;
    dispatch({ type: "SET_REGION_PROP", id: selectedMath.id, patch: { display: { ...selectedMath.display, substituted: !cur } } });
  };

  const toggleBorder = () => {
    if (!canEdit || !selected) return;
    dispatch({ type: "SET_REGION_PROP", id: selected.id, patch: { border: !(selected.border ?? false) } });
  };

  const setUnitsSystem = (system: UnitsSystem) => dispatch({ type: "SET_UNITS", system });

  const indent = (delta: 1 | -1) => {
    if (!canEdit || !state.selectedId) return;
    // A multi-selection indents as a group; a lone selection indents itself.
    if (state.selectedIds.length > 1) dispatch({ type: "INDENT_SELECTED", delta });
    else dispatch({ type: "INDENT", id: state.selectedId, delta });
  };

  const setColumns = (columns: 1 | 2 | 3) => {
    if (!canEdit || !row) return;
    dispatch({ type: "SET_COLUMNS", rowId: row.id, columns });
  };

  const toggleSpan = () => {
    if (!canEdit || !state.selectedId) return;
    dispatch({ type: "TOGGLE_SPAN", id: state.selectedId });
  };

  const recalcToHere = () => {
    if (state.selectedId) recalculateToHere(state.selectedId);
    else recalculate();
  };

  const openReference = (kind: "FUNCTIONS" | "UNITS" | "CONSTANTS") =>
    dispatch({ type: "OPEN_REFERENCE", kind });

  const openDialog = (kind: EditorDialogKind) =>
    dispatch({ type: "OPEN_DIALOG", dialog: { kind, regionId: state.selectedId } });

  const openComments = () => {
    if (state.ui.rightPanel !== "comments") dispatch({ type: "TOGGLE_RIGHT_PANEL", panel: "comments" });
  };

  const cmd: RibbonCommands = {
    insertRegion,
    insertPlot,
    addPlotTrace,
    togglePlotLegend,
    insertOp,
    insertMatrixOp,
    insertMatrix,
    setDecimals,
    toggleShowSteps,
    toggleBorder,
    setUnitsSystem,
    indent,
    setColumns,
    toggleSpan,
    setMode,
    recalculate,
    recalculateToHere: recalcToHere,
    openFunctions: () => openReference("FUNCTIONS"),
    openUnits: () => openReference("UNITS"),
    openConstants: () => openReference("CONSTANTS"),
    openDialog,
    openComments,
    toggleComments: () => dispatch({ type: "TOGGLE_RIGHT_PANEL", panel: "comments" }),
    newComment: () => {
      if (canComment) openComments();
    },
    setTab: (tab: string) => dispatch({ type: "SET_RIBBON_TAB", tab }),
  };

  return { cmd, sel };
}
