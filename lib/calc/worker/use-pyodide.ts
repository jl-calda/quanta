"use client";

import { useCallback, useRef, useState } from "react";
import { initPyodide, runPython } from "./pyodide-client";

export type PyodideStatus = "idle" | "loading" | "ready" | "error";

/**
 * React hook for the Pyodide worker. Boots the runtime lazily on first use and
 * exposes a `run(code)` helper plus loading status, so a region can show a
 * "loading Python…" state the first time symbolic/heavy-numeric work is needed.
 */
export function usePyodide() {
  const [status, setStatus] = useState<PyodideStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);

  const ensureReady = useCallback(() => {
    if (!readyRef.current) {
      setStatus("loading");
      readyRef.current = initPyodide()
        .then(() => {
          setStatus("ready");
        })
        .catch((cause: unknown) => {
          setStatus("error");
          setError(cause instanceof Error ? cause.message : String(cause));
          readyRef.current = null; // allow a retry
          throw cause;
        });
    }
    return readyRef.current;
  }, []);

  const run = useCallback(
    async (code: string) => {
      await ensureReady();
      return runPython(code);
    },
    [ensureReady],
  );

  return { status, error, ensureReady, run };
}
