/**
 * PythonRunner — the low-level "run this Python, get a JS value back" seam.
 *
 * There is one implementation per runtime: the browser runner (./browser-runner)
 * wraps the existing Pyodide Web Worker; the Node runner (./node-runner) loads
 * Pyodide in-process. The higher-level typed backend (./backend) is written once
 * against this interface, so callers never depend on which runtime is active.
 */
export interface PythonRunner {
  /** Boot the runtime and ensure `packages` are loaded; safe to call repeatedly. */
  ensure(packages?: readonly string[]): Promise<void>;
  /**
   * Run Python source and return the converted JS value. With the envelope
   * contract this is the JSON string the op produced.
   * @param opts.packages packages to load before running
   * @param opts.autoLoad also auto-load packages detected in `import` statements
   *   (default true, matching the Web Worker)
   */
  run(
    code: string,
    opts?: { packages?: readonly string[]; autoLoad?: boolean },
  ): Promise<unknown>;
  /** Optional teardown (browser: terminate the worker; Node: drop the singleton). */
  dispose?(): void;
}
