"use client";

import { useEffect } from "react";
import { useEditor } from "./state/editor-provider";

/**
 * Worksheet-level keyboard shortcuts (renders nothing). F9 recalculates from
 * anywhere; on the canvas (not inside a field): `=` opens a new math region (the
 * Mathcad move), Delete/Backspace removes the selection, Escape clears it, and
 * ⌘/Ctrl+A selects every region. Editing commit/cancel (Enter/Esc) lives in the
 * region editors; the ⌘K command palette is a later follow-up.
 */
export function EditorKeyboard() {
  const { state, dispatch, canEdit, recalculate } = useEditor();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F9") {
        e.preventDefault();
        recalculate();
        return;
      }
      // Global launchers — work everywhere, including inside a field.
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        dispatch({ type: "OPEN_DIALOG", dialog: { kind: "commandPalette" } });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        dispatch({ type: "OPEN_DIALOG", dialog: { kind: "findReplace" } });
        return;
      }
      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (inField) return;

      const hasSelection = state.selectedIds.length > 0;

      if (e.key === "Escape" && hasSelection) {
        e.preventDefault();
        dispatch({ type: "SELECT", id: null });
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && canEdit && !state.editingId && hasSelection) {
        e.preventDefault();
        dispatch({ type: "DELETE_SELECTED" });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A") && canEdit && !state.editingId) {
        e.preventDefault();
        dispatch({ type: "SELECT_ALL" });
        return;
      }
      if (e.key === "=" && canEdit && !state.editingId) {
        e.preventDefault();
        dispatch({ type: "INSERT_REGION", regionType: "math", anchorId: state.selectedId, where: "below" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selectedId, state.selectedIds.length, state.editingId, canEdit, recalculate, dispatch]);

  return null;
}
