"use client";

import { useEffect } from "react";
import { useEditor } from "./state/editor-provider";

/**
 * Worksheet-level keyboard shortcuts (renders nothing). F9 recalculates from
 * anywhere; `=` on the canvas (not inside a field) opens a new math region —
 * the Mathcad move. Editing commit/cancel (Enter/Esc) lives in the region
 * editors; the ⌘K command palette is a later follow-up.
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
      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (inField) return;
      if (e.key === "=" && canEdit && !state.editingId) {
        e.preventDefault();
        dispatch({ type: "INSERT_REGION", regionType: "math", anchorId: state.selectedId, where: "below" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selectedId, state.editingId, canEdit, recalculate, dispatch]);

  return null;
}
