/**
 * JSON-envelope contract shared by both Pyodide runtimes (browser worker + Node).
 *
 * Every Python op is wrapped so it returns a single `json.dumps(...)` STRING:
 *   {"ok": true,  "value": <json>}            on success
 *   {"ok": false, "error": {"kind","message"}} on failure
 *
 * The JS side parses that string. Returning a plain string (never a PyProxy,
 * dict, or array) sidesteps structured-clone / PyProxy lifetime surprises and
 * guarantees the browser worker and the Node runtime behave identically.
 */

export interface PyEnvelopeOk<T> {
  ok: true;
  value: T;
}
export interface PyEnvelopeErr {
  ok: false;
  error: { kind: string; message: string };
}
export type PyEnvelope<T> = PyEnvelopeOk<T> | PyEnvelopeErr;

/** Error thrown when a Python op reports failure; carries the Python class name. */
export class PyBackendError extends Error {
  readonly kind: string;
  constructor(message: string, kind: string) {
    super(message);
    this.name = "PyBackendError";
    this.kind = kind;
  }
}

/**
 * Produce a safe Python string literal. JSON string syntax is a subset of
 * Python's, so `JSON.stringify` yields a valid (double-quoted, fully escaped)
 * literal for any input — including quotes, backslashes, and newlines.
 */
export function pyStr(value: string): string {
  return JSON.stringify(value);
}

/**
 * Wrap a Python body (statements ending in a `return <json-serializable>`) so it
 * runs inside a try/except and the last expression is the JSON envelope string.
 */
export function wrapEnvelope(body: string): string {
  const indented = body
    .split("\n")
    .map((line) => (line.length ? "    " + line : line))
    .join("\n");
  return [
    "import json as __quanta_json",
    "def __quanta_op__():",
    indented,
    "try:",
    "    __quanta_value = __quanta_op__()",
    '    __quanta_out = __quanta_json.dumps({"ok": True, "value": __quanta_value})',
    "except Exception as __quanta_exc:",
    '    __quanta_out = __quanta_json.dumps({"ok": False, "error": {"kind": type(__quanta_exc).__name__, "message": str(__quanta_exc)}})',
    "__quanta_out",
  ].join("\n");
}

/** Parse the envelope string the runtime returned; throw {@link PyBackendError} on failure. */
export function parseEnvelope<T>(raw: unknown): T {
  if (typeof raw !== "string") {
    throw new Error(
      `Pyodide returned a ${typeof raw}, expected a JSON envelope string.`,
    );
  }
  let env: PyEnvelope<T>;
  try {
    env = JSON.parse(raw) as PyEnvelope<T>;
  } catch {
    throw new Error("Pyodide returned malformed JSON from the backend.");
  }
  if (!env.ok) {
    throw new PyBackendError(env.error.message, env.error.kind);
  }
  return env.value;
}
