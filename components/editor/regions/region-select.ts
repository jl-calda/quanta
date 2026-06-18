import type { Dispatch } from "react";
import type { EditorAction } from "../state/editor-reducer";

/** The mouse-event surface this helper needs (so it stays testable + decoupled). */
interface ModifierClick {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  stopPropagation: () => void;
}

/**
 * Resolve a modifier- (or group-collapsing) selection click on a region. Returns
 * `true` when it consumed the click — the caller must then skip its plain-click
 * behaviour (begin-edit / select). The three click interceptors that
 * `stopPropagation` (region-item, committed math, text) all call this first so
 * multi-select works uniformly across region types:
 *
 * - Cmd/Ctrl-click → toggle this region in the multi-selection.
 * - Shift-click   → extend a reading-order range from the current primary.
 * - Plain click while a group is already selected → collapse to this region
 *   (a second plain click then opens it), instead of silently editing one of N.
 */
export function applyModifierSelect(
  e: ModifierClick,
  id: string,
  dispatch: Dispatch<EditorAction>,
  multiActive: boolean,
): boolean {
  if (e.metaKey || e.ctrlKey) {
    e.stopPropagation();
    dispatch({ type: "TOGGLE_SELECT", id });
    return true;
  }
  if (e.shiftKey) {
    e.stopPropagation();
    dispatch({ type: "SELECT_TO", id });
    return true;
  }
  if (multiActive) {
    e.stopPropagation();
    dispatch({ type: "SELECT", id });
    return true;
  }
  return false;
}
