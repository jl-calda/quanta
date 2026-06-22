"use client";

import { useEffect, useRef, useState, type Dispatch } from "react";
import { isUnit, odeConfigHash, serializeForScope } from "@/lib/calc";
import { getBackend, PyBackendError, type IntegratorRequest } from "@/lib/calc/worker/backend";
import { walkRegions } from "@/lib/worksheet/flatten";
import type { SolveRegion, WorksheetContent } from "@/lib/worksheet/content";
import type { EditorAction } from "./editor-reducer";

/**
 * Transient (never-persisted) status of an ODE region's worker integration. The
 * successful solution lives in `region.solution` (persisted via autosave); only
 * the in-flight / failed states are held here, in React state, per CLAUDE.md.
 */
export type SolveEvalStatus =
  | { state: "computing" }
  | { state: "error"; message: string };

/**
 * The ODE producer — the editor-side half of the ODE-integrate seam, the exact
 * counterpart to the symbolic producer (`useSymbolicEval`). The pure numeric
 * engine can't integrate an ODE (it needs SciPy), so this hook walks the content
 * tree, finds `odesolve` solve regions whose cached `solution` is stale or absent,
 * integrates each through the async SciPy worker (`getBackend().odesolve`), and
 * writes the sampled trajectory back into `region.solution` (versioned + keyed by
 * `odeConfigHash`, with a snapshot of the referenced scope constants). The existing
 * autosave persists it; the pure `evaluateSolve` then reads the same cache
 * synchronously — so downstream regions, plots, and the Node export path get the
 * solution with no Pyodide.
 *
 * Worker-available gate: this is a client hook that runs only when `canEdit` (a
 * viewer can't write the cache under RLS, exactly like symbolic); the live SciPy
 * call is wrapped in try/catch and degrades to a transient `error` state on any
 * worker/runtime failure — it never throws and never runs in `node --check` or the
 * Pyodide-free test run.
 *
 * Returns the transient status map (computing / error), keyed by region id.
 */
export function useSolveEval({
  content,
  canEdit,
  scope,
  dispatch,
}: {
  content: WorksheetContent;
  canEdit: boolean;
  /** The settled worksheet scope (name → value), to resolve ODE constants. */
  scope: Record<string, unknown>;
  dispatch: Dispatch<EditorAction>;
}): Map<string, SolveEvalStatus> {
  const [status, setStatus] = useState<Map<string, SolveEvalStatus>>(() => new Map());
  // Guards against firing a second integrate for a region+config+inputs in flight.
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!canEdit) return;

    // Collect ODE regions needing a fresh integrate, synchronously, off the tree.
    const pending: { id: string; req: IntegratorRequest; hash: string; inputs: Record<string, string>; key: string }[] = [];
    for (const region of walkRegions(content)) {
      if (region.type !== "solve" || region.disabled) continue;
      if (region.algorithm !== "odesolve") continue;
      const prepared = prepareRequest(region, scope);
      if (!prepared) continue; // not enough config to integrate yet
      const { req, inputs } = prepared;
      const hash = odeConfigHash(region);
      if (isFresh(region, hash, inputs)) continue; // cached solution still valid
      const key = `${region.id}:${hash}:${JSON.stringify(inputs)}`;
      if (inFlight.current.has(key)) continue;
      pending.push({ id: region.id, req, hash, inputs, key });
    }
    if (pending.length === 0) return;

    let cancelled = false;
    const patchStatus = (id: string, next: SolveEvalStatus | null) => {
      if (cancelled) return;
      setStatus((prev) => {
        const map = new Map(prev);
        if (next) map.set(id, next);
        else map.delete(id);
        return map;
      });
    };

    for (const { id, req, hash, inputs, key } of pending) {
      inFlight.current.add(key);
      patchStatus(id, { state: "computing" });
      void (async () => {
        try {
          const backend = await getBackend();
          const sol = await backend.odesolve(req);
          if (cancelled) return;
          dispatch({
            type: "SET_REGION_PROP",
            id,
            patch: {
              solution: {
                v: 1,
                hash,
                indepVar: sol.indepVar,
                indep: sol.indep,
                vars: sol.vars,
                inputs,
                computedAt: new Date().toISOString(),
              },
            },
          });
          patchStatus(id, null);
        } catch (err) {
          const reason = err instanceof PyBackendError ? err.message : "the integrator is unavailable";
          patchStatus(id, { state: "error", message: `Couldn't integrate the ODE: ${reason}.` });
        } finally {
          inFlight.current.delete(key);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [content, canEdit, scope, dispatch]);

  return status;
}

/* ------------------------------------------------------------------ *
 * Pure helpers (shared staleness logic with the engine's evaluateSolve)
 * ------------------------------------------------------------------ */

/**
 * Build the integrator request from a region's ODE config + the live scope, or
 * null when the config can't be integrated yet (no system / no upper range). The
 * `inputs` snapshot serializes every referenced scope constant the same way the
 * engine's freshness gate does, so producer and consumer agree on staleness.
 */
function prepareRequest(
  region: SolveRegion,
  scope: Record<string, unknown>,
): { req: IntegratorRequest; inputs: Record<string, string> } | null {
  const ode = region.ode;
  const system = (ode?.system ?? []).filter((s) => s.trim());
  if (system.length === 0) return null;
  const min = ode?.range?.min ?? 0;
  const max = ode?.range?.max;
  if (max === undefined || !Number.isFinite(max) || !Number.isFinite(min)) return null;

  const indepVar = (ode?.indepVar ?? "x").trim() || "x";
  const conditions = (ode?.conditions ?? []).filter((c) => c.trim());

  // Names the equations reference that resolve in scope (excluding state vars).
  const stateNames = new Set<string>([indepVar, ...region.guesses.map((g) => g.var?.trim()).filter(Boolean)]);
  const reqScope: Record<string, number> = {};
  const inputs: Record<string, string> = {};
  const text = [...system, ...conditions].join(" ");
  for (const m of text.matchAll(/[A-Za-z_]\w*/g)) {
    const tok = m[0];
    if (stateNames.has(tok) || tok in reqScope || !(tok in scope)) continue;
    const num = magnitudeOf(scope[tok]);
    if (num === null) continue;
    reqScope[tok] = num;
    const ser = serializeForScope(scope[tok]);
    if (ser !== null) inputs[tok] = ser;
  }

  return {
    req: { system, indepVar, range: { min, max }, conditions, step: ode?.step, mesh: ode?.mesh, scope: reqScope },
    inputs,
  };
}

/** A cached solution is fresh when the config hash matches and every referenced constant is unchanged. */
function isFresh(region: SolveRegion, hash: string, inputs: Record<string, string>): boolean {
  const cache = region.solution;
  if (!cache || cache.v !== 1 || cache.hash !== hash) return false;
  const snap = cache.inputs ?? {};
  const keys = new Set([...Object.keys(snap), ...Object.keys(inputs)]);
  for (const k of keys) {
    if (snap[k] !== inputs[k]) return false;
  }
  return true;
}

/** Numeric magnitude of a scope value (plain number or mathjs Unit), or null. */
function magnitudeOf(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (isUnit(value)) {
    try {
      const u = value as { toNumber: (unit?: string) => number; formatUnits: () => string };
      const n = u.toNumber(u.formatUnits());
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }
  return null;
}
