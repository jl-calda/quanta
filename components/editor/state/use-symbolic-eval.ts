"use client";

import { useEffect, useRef, useState, type Dispatch } from "react";
import { isSymbolic, normalizeSource, splitDefinition } from "@/lib/calc";
import { getBackend, PyBackendError } from "@/lib/calc/worker/backend";
import { walkRegions } from "@/lib/worksheet/flatten";
import { symbolicCacheHash } from "@/lib/worksheet/symbolic-cache";
import type { WorksheetContent } from "@/lib/worksheet/content";
import type { EditorAction } from "./editor-reducer";

/**
 * Transient (never-persisted) status of a symbolic region's worker compute. The
 * successful result lives in `region.cache` (persisted via autosave); only the
 * in-flight / failed states are held here, in React state, per CLAUDE.md.
 */
export type SymbolicStatus =
  | { state: "computing" }
  | { state: "error"; message: string };

/**
 * The symbolic producer — the editor-side half of the symbolic-evaluate seam.
 *
 * It is the counterpart to the export-read consumer (`applySymbolicCache`): both
 * agree on which regions are symbolic via the shared, pure `isSymbolic`. The pure
 * numeric engine can't evaluate a CAS expression (it has free symbols), so this
 * hook walks the content tree, finds symbolic math regions whose cache is stale
 * or absent, computes each through the async SymPy worker (`getBackend`), and
 * writes the worker result back into `region.cache` (versioned + hash-keyed). The
 * existing autosave then persists it, and the export consumer reads the same
 * cache — so the PDF matches the app on a pure Node path with no Pyodide.
 *
 * Returns the transient status map (computing / error), keyed by region id, for
 * the Math view to render. Compute runs only when `canEdit`: a viewer can't write
 * the cache (RLS), so it reads any existing cache or shows the placeholder, which
 * matches export behaviour exactly.
 */
export function useSymbolicEval({
  content,
  canEdit,
  dispatch,
}: {
  content: WorksheetContent;
  canEdit: boolean;
  dispatch: Dispatch<EditorAction>;
}): Map<string, SymbolicStatus> {
  const [status, setStatus] = useState<Map<string, SymbolicStatus>>(() => new Map());
  // Guards against firing a second compute for a region+source already in flight
  // (content changes for unrelated edits would otherwise re-dispatch the call).
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!canEdit) return;

    // Collect the regions needing a fresh compute, synchronously, off the tree.
    const pending: { id: string; expr: string; hash: string }[] = [];
    for (const region of walkRegions(content)) {
      if (region.type !== "math" || region.disabled) continue;
      if (!isSymbolic(region.source)) continue;
      const hash = symbolicCacheHash(region.source);
      const cache = region.cache;
      if (cache && cache.v === 1 && cache.hash === hash) continue; // fresh
      const expr = splitDefinition(normalizeSource(region.source)).expr;
      if (!expr) continue;
      if (inFlight.current.has(`${region.id}:${hash}`)) continue;
      pending.push({ id: region.id, expr, hash });
    }
    if (pending.length === 0) return;

    let cancelled = false;
    const patchStatus = (id: string, next: SymbolicStatus | null) => {
      if (cancelled) return;
      setStatus((prev) => {
        const map = new Map(prev);
        if (next) map.set(id, next);
        else map.delete(id);
        return map;
      });
    };

    for (const { id, expr, hash } of pending) {
      const key = `${id}:${hash}`;
      inFlight.current.add(key);
      patchStatus(id, { state: "computing" });
      void (async () => {
        try {
          const backend = await getBackend();
          const { tex, value } = await backend.symbolicEval(expr);
          if (cancelled) return;
          dispatch({
            type: "SET_REGION_PROP",
            id,
            patch: {
              cache: { v: 1, hash, tex, value, computedAt: new Date().toISOString() },
            },
          });
          patchStatus(id, null);
        } catch (err) {
          const reason = err instanceof PyBackendError ? err.message : "the symbolic engine is unavailable";
          patchStatus(id, { state: "error", message: `Couldn't evaluate symbolically: ${reason}.` });
        } finally {
          inFlight.current.delete(key);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [content, canEdit, dispatch]);

  return status;
}
