"use client";

import { useEffect, useRef } from "react";
import { saveWorksheet } from "@/server/actions/worksheet";
import type { CalcStatus, Json } from "@/lib/supabase/types";
import type { WorksheetContent } from "@/lib/worksheet/content";
import type { Dispatch } from "react";
import type { EditorAction, SaveState } from "./editor-reducer";

const DEBOUNCE_MS = 1200;

interface AutosaveSnapshot {
  content: WorksheetContent;
  calcStatus: CalcStatus;
  errorCount: number;
}

/**
 * Debounced autosave. Watches `saveState`: whenever the reducer marks the
 * document `unsaved` (any content edit), it schedules a save ~1.2s later, sets
 * `saving`, then `saved`/`error`. The pending save is flushed on unmount / route
 * change so navigating away never drops the last edit. Last-write-wins.
 *
 * Reads the live content/status from a ref so a save always persists the latest
 * tree, never a stale closure — and never races the post-edit recalc.
 */
export function useAutosave({
  worksheetId,
  canEdit,
  saveState,
  snapshot,
  dispatch,
}: {
  worksheetId: string;
  canEdit: boolean;
  saveState: SaveState;
  snapshot: AutosaveSnapshot;
  dispatch: Dispatch<EditorAction>;
}) {
  const latest = useRef(snapshot);
  latest.current = snapshot;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  /** Unsaved edits exist that a flush still needs to persist. */
  const pending = useRef(false);

  const setSave = (state: SaveState) => dispatch({ type: "SET_SAVE_STATE", state });

  const flush = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSave("saving");
    const { content, calcStatus, errorCount } = latest.current;
    const result = await saveWorksheet({
      id: worksheetId,
      content: content as unknown as Json,
      calcStatus,
      errorCount,
    });
    inFlight.current = false;
    if (result.ok) pending.current = false;
    setSave(result.ok ? "saved" : "error");
  };

  useEffect(() => {
    if (!canEdit || saveState !== "unsaved") return;
    pending.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush();
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // `flush` reads from refs; re-running only on saveState/edit is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState, canEdit, worksheetId]);

  // Flush any pending edit when the editor unmounts (navigation away).
  useEffect(() => {
    return () => {
      if (!canEdit || !pending.current) return;
      if (timer.current) clearTimeout(timer.current);
      // Fire-and-forget: the page is leaving; persist the latest tree.
      void saveWorksheet({
        id: worksheetId,
        content: latest.current.content as unknown as Json,
        calcStatus: latest.current.calcStatus,
        errorCount: latest.current.errorCount,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
