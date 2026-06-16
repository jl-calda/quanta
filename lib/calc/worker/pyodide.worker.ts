/**
 * Pyodide Web Worker.
 *
 * Lazily loads Pyodide (which carries SymPy / NumPy / SciPy) from a CDN on the
 * first request, then runs Python off the main thread. This is the runtime
 * behind symbolic algebra, heavy numeric work, and Python scripted controls.
 *
 * It is a classic worker so it can `importScripts()` the CDN bundle; the wasm
 * runtime is never bundled into the app — it is fetched only when a calculation
 * actually needs it.
 */
import type { WorkerRequest, WorkerResponse } from "./messages";

// Pin the runtime; the index URL also hosts the package wheels.
const PYODIDE_VERSION = "0.27.2";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Globals provided by the worker scope / the CDN bundle (not in the DOM lib).
declare function importScripts(...urls: string[]): void;
declare function loadPyodide(config: { indexURL: string }): Promise<PyodideApi>;

interface PyodideApi {
  loadPackage(names: string | string[]): Promise<void>;
  loadPackagesFromImports(code: string): Promise<void>;
  runPythonAsync(code: string): Promise<unknown>;
}

let pyodidePromise: Promise<PyodideApi> | null = null;

function getPyodide(): Promise<PyodideApi> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      importScripts(`${PYODIDE_INDEX_URL}pyodide.js`);
      return loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    })().catch((error) => {
      // Clear the memo so a later request can re-attempt the load — a transient
      // first-load failure (offline, CDN/CSP block) must not be permanent.
      pyodidePromise = null;
      throw error;
    });
  }
  return pyodidePromise;
}

// `self.postMessage` in a worker takes a single argument; the DOM lib types it
// as Window.postMessage (which wants a targetOrigin), so post through a cast.
const post = (message: WorkerResponse) =>
  (self as unknown as { postMessage: (m: WorkerResponse) => void }).postMessage(
    message,
  );

/** Convert a possible Python proxy into a structured-cloneable value. */
function toTransferable(value: unknown): unknown {
  const proxy = value as
    | {
        toJs?: (options?: {
          dict_converter?: (entries: Iterable<[unknown, unknown]>) => unknown;
          create_proxies?: boolean;
        }) => unknown;
        destroy?: () => void;
      }
    | null;
  if (proxy && typeof proxy.toJs === "function") {
    // dict_converter → plain objects (not Map); create_proxies: false so no
    // nested PyProxy survives to break structured clone on postMessage.
    const js = proxy.toJs({
      dict_converter: Object.fromEntries,
      create_proxies: false,
    });
    proxy.destroy?.();
    return js;
  }
  return value;
}

self.addEventListener(
  "message",
  async (event: MessageEvent<WorkerRequest>) => {
    const request = event.data;
    try {
      switch (request.type) {
        case "init": {
          await getPyodide();
          post({ id: request.id, type: "ready" });
          break;
        }
        case "loadPackages": {
          const pyodide = await getPyodide();
          await pyodide.loadPackage(request.packages);
          post({ id: request.id, type: "ok" });
          break;
        }
        case "run": {
          const pyodide = await getPyodide();
          if (request.autoLoad !== false) {
            await pyodide.loadPackagesFromImports(request.code);
          }
          const result = await pyodide.runPythonAsync(request.code);
          post({ id: request.id, type: "result", result: toTransferable(result) });
          break;
        }
      }
    } catch (error) {
      post({
        id: request.id,
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
