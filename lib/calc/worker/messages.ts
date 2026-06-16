/**
 * Message protocol between the main thread and the Pyodide Web Worker.
 * Every request carries a numeric `id` the client uses to match the response.
 */

export type WorkerRequestPayload =
  | { type: "init" }
  | { type: "loadPackages"; packages: string[] }
  | { type: "run"; code: string; autoLoad?: boolean };

export type WorkerRequest = WorkerRequestPayload & { id: number };

export type WorkerResponse =
  | { id: number; type: "ready" }
  | { id: number; type: "ok" }
  | { id: number; type: "result"; result: unknown }
  | { id: number; type: "error"; message: string };
