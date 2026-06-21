"use client";

import { useEffect } from "react";
import { useEditor } from "./state/editor-provider";

/**
 * Worksheet-level keyboard shortcuts (renders nothing). These are the `app`-scoped
 * bindings from `/lib/keymap` — the SAME set the shortcuts reference lists — wired
 * to dispatchable editor actions. Modifiers are platform-aware (⌘ on macOS, Ctrl
 * elsewhere) via `metaKey || ctrlKey`.
 *
 * Accessibility: nothing here traps focus, and every shortcut is also reachable
 * from the ribbon / menus (recalc, insert region, find, command palette, export).
 * Math-entry keys (`/`, `^`, `_`, Space, …) are owned by the field, not here.
 *
 * Global accelerators fire everywhere (including inside a field); the remaining
 * canvas moves only fire when focus is not in an input/field.
 */
export function EditorKeyboard() {
  const { state, dispatch, canEdit, recalculate, recalculateToHere, setMode } = useEditor();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key;
      const lower = key.toLowerCase();

      // ---- Calculation (work everywhere) ----
      if (key === "F9") {
        e.preventDefault();
        if (e.shiftKey && state.selectedId) recalculateToHere(state.selectedId);
        else recalculate();
        return;
      }
      if (mod && e.shiftKey && lower === "a") {
        e.preventDefault();
        setMode(state.calcMode === "auto" ? "manual" : "auto");
        return;
      }

      // ---- App accelerators (work everywhere, including inside a field) ----
      if (mod && lower === "k") {
        e.preventDefault();
        dispatch({ type: "OPEN_DIALOG", dialog: { kind: "commandPalette" } });
        return;
      }
      if (mod && lower === "f") {
        e.preventDefault();
        dispatch({ type: "OPEN_DIALOG", dialog: { kind: "findReplace" } });
        return;
      }
      if (mod && lower === "p") {
        e.preventDefault();
        dispatch({ type: "OPEN_EXPORT" });
        return;
      }
      if (mod && lower === "s") {
        // Block the browser's save dialog — the worksheet autosaves continuously.
        e.preventDefault();
        return;
      }
      if (mod && key === "Enter" && canEdit) {
        e.preventDefault();
        if (state.editingId) dispatch({ type: "END_EDIT" });
        dispatch({ type: "INSERT_REGION", regionType: "math", anchorId: state.selectedId, where: "below" });
        return;
      }

      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (inField) return;

      // ---- Canvas-only moves (focus not in a field) ----
      // `/` opens the keyboard-shortcuts reference (inside a field `/` is a fraction).
      if (key === "/") {
        e.preventDefault();
        dispatch({ type: "OPEN_DIALOG", dialog: { kind: "shortcuts" } });
        return;
      }

      const hasSelection = state.selectedIds.length > 0;

      if (key === "Escape" && hasSelection) {
        e.preventDefault();
        dispatch({ type: "SELECT", id: null });
        return;
      }
      if ((key === "Delete" || key === "Backspace") && canEdit && !state.editingId && hasSelection) {
        e.preventDefault();
        dispatch({ type: "DELETE_SELECTED" });
        return;
      }
      if (mod && lower === "a" && canEdit && !state.editingId) {
        e.preventDefault();
        dispatch({ type: "SELECT_ALL" });
        return;
      }
      if (key === "=" && canEdit && !state.editingId) {
        e.preventDefault();
        dispatch({ type: "INSERT_REGION", regionType: "math", anchorId: state.selectedId, where: "below" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selectedId, state.selectedIds.length, state.editingId, state.calcMode, canEdit, recalculate, recalculateToHere, setMode, dispatch]);

  return null;
}
