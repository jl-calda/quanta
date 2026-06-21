/**
 * Browser PythonRunner — wraps the existing Pyodide Web Worker client.
 *
 * This adds no new Pyodide logic; it adapts ./pyodide-client (init / load /
 * runPython) to the runtime-agnostic {@link PythonRunner} seam so the typed
 * backend can drive the worker without knowing it is a worker. Browser only —
 * the factory in ./backend dynamic-imports this branch only when `window` exists.
 */
import {
  initPyodide,
  loadPyodidePackages,
  runPython,
  terminatePyodide,
} from "./pyodide-client";
import type { PythonRunner } from "./python-runner";

export function createBrowserRunner(): PythonRunner {
  return {
    async ensure(packages) {
      await initPyodide();
      if (packages && packages.length) {
        await loadPyodidePackages([...packages]);
      }
    },
    async run(code, opts) {
      await initPyodide();
      if (opts?.packages && opts.packages.length) {
        await loadPyodidePackages([...opts.packages]);
      }
      return runPython(code, { autoLoad: opts?.autoLoad });
    },
    dispose() {
      terminatePyodide();
    },
  };
}
