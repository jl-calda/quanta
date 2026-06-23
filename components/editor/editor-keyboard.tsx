"use client";

import { useEffect } from "react";
import { useEditor } from "./state/editor-provider";
import { selectedRegionsInReadingOrder } from "./state/editor-reducer";
import { findRegion } from "@/lib/worksheet/flatten";
import { parseRegions, serializeRegions } from "@/lib/worksheet/clipboard";

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

      // ---- Undo / redo. Canvas-only (we already returned for fields) so a math /
      // text field keeps its own native character-level undo while editing; the
      // document-structure undo applies when not editing a region. ----
      if (canEdit && mod && lower === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }
      if (canEdit && ((mod && e.shiftKey && lower === "z") || (mod && lower === "y"))) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      // ---- Region navigation — reading order, reaching every visible region. Arrow
      // up/down step the primary; Home/End jump to first/last; Shift extends the
      // range. Enter opens the inline-editable types; everything else configures via
      // the inspector on selection. (We're past the field guard, so these never fight
      // a field's own arrows.) ----
      if (key === "ArrowDown" || key === "ArrowUp") {
        e.preventDefault();
        dispatch({ type: "SELECT_STEP", dir: key === "ArrowDown" ? "next" : "prev", extend: e.shiftKey });
        return;
      }
      if (key === "Home" || key === "End") {
        e.preventDefault();
        dispatch({ type: "SELECT_EDGE", edge: key === "Home" ? "first" : "last", extend: e.shiftKey });
        return;
      }
      if (key === "Enter" && canEdit && state.selectedId) {
        const region = findRegion(state.content, state.selectedId);
        if (region && (region.type === "math" || region.type === "text")) {
          e.preventDefault();
          dispatch({ type: "BEGIN_EDIT", id: state.selectedId });
        }
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
      // ---- Region clipboard (canvas-only; inside a field copy/paste is the
      // browser's / MathLive's job). The reducer keeps an in-session clipboard;
      // we additionally mirror to the system clipboard so paste works across
      // worksheet tabs, and prefer a valid Quanta payload from it on paste. ----
      if (mod && lower === "c" && canEdit && !state.editingId && hasSelection) {
        e.preventDefault();
        const regions = selectedRegionsInReadingOrder(state);
        dispatch({ type: "COPY_SELECTED" });
        if (regions.length) void navigator.clipboard?.writeText(serializeRegions(regions)).catch(() => {});
        return;
      }
      if (mod && lower === "x" && canEdit && !state.editingId && hasSelection) {
        e.preventDefault();
        const regions = selectedRegionsInReadingOrder(state);
        dispatch({ type: "CUT_SELECTED" });
        if (regions.length) void navigator.clipboard?.writeText(serializeRegions(regions)).catch(() => {});
        return;
      }
      if (mod && lower === "v" && canEdit && !state.editingId) {
        e.preventDefault();
        const read = navigator.clipboard?.readText?.();
        if (read) {
          read
            .then((text) => {
              const regions = parseRegions(text);
              if (regions && regions.length) dispatch({ type: "PASTE_REGIONS", regions });
              else dispatch({ type: "PASTE" });
            })
            .catch(() => dispatch({ type: "PASTE" }));
        } else {
          dispatch({ type: "PASTE" });
        }
        return;
      }
      if (mod && lower === "g" && canEdit && !state.editingId && state.selectedIds.length > 1) {
        e.preventDefault();
        dispatch({ type: "GROUP_SELECTED" });
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
  }, [state, canEdit, recalculate, recalculateToHere, setMode, dispatch]);

  return null;
}
