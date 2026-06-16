/**
 * Typed, promise-based client for the Pyodide Web Worker.
 *
 * The worker is created lazily on first use (browser only) and reused across
 * calls. Requests are matched to responses by id.
 */
import type {
  WorkerRequestPayload,
  WorkerResponse,
} from "./messages";

interface Pending {
  resolve: (response: WorkerResponse) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function ensureWorker(): Worker {
  if (typeof window === "undefined") {
    throw new Error("The Pyodide worker is only available in the browser.");
  }
  if (!worker) {
    worker = new Worker(new URL("./pyodide.worker.ts", import.meta.url));
    worker.addEventListener(
      "message",
      (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const entry = pending.get(response.id);
        if (!entry) return;
        pending.delete(response.id);
        if (response.type === "error") {
          entry.reject(new Error(response.message));
        } else {
          entry.resolve(response);
        }
      },
    );
  }
  return worker;
}

function request(payload: WorkerRequestPayload): Promise<WorkerResponse> {
  const activeWorker = ensureWorker();
  const id = nextId++;
  return new Promise<WorkerResponse>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    activeWorker.postMessage({ ...payload, id });
  });
}

/** Boot Pyodide (downloads the runtime on first call). */
export async function initPyodide(): Promise<void> {
  await request({ type: "init" });
}

/** Preload Python packages, e.g. ["sympy", "numpy", "scipy"]. */
export async function loadPyodidePackages(packages: string[]): Promise<void> {
  await request({ type: "loadPackages", packages });
}

/** Run Python and return the (structured-cloneable) result. */
export async function runPython(
  code: string,
  options?: { autoLoad?: boolean },
): Promise<unknown> {
  const response = await request({
    type: "run",
    code,
    autoLoad: options?.autoLoad,
  });
  return response.type === "result" ? response.result : undefined;
}

/** Tear the worker down (e.g. on sign-out). */
export function terminatePyodide(): void {
  worker?.terminate();
  worker = null;
  // Reject any in-flight requests — the worker is gone, so their responses will
  // never arrive and the awaiting callers would otherwise hang forever.
  for (const entry of pending.values()) {
    entry.reject(new Error("The Pyodide worker was terminated."));
  }
  pending.clear();
  // nextId is intentionally left monotonic to avoid id reuse if a new worker is
  // created while a late message from the old one is still in flight.
}
