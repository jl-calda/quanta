/**
 * Quanta calc engine — public entry point.
 *
 * Pure and deterministic; identical on the client, the Web Worker, and Node.
 * The Pyodide-backed symbolic/heavy-numeric layer lives under ./worker and is
 * loaded lazily, only in the browser.
 */
export { evaluate } from "./evaluate";
export type {
  CalcResult,
  CalcOk,
  CalcErr,
  CalcError,
  CalcErrorCode,
} from "./types";
