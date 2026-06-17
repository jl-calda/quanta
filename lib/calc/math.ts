/**
 * The single, shared mathjs instance for the whole engine.
 *
 * mathjs is unit-aware (`12 kN`, `700 MPa`, `16 mm`), runs dimensional analysis,
 * handles matrices/complex, and exposes `toTex` for textbook rendering — the
 * numeric/units foundation. Every module imports this one instance so parsing,
 * evaluation, and formatting share identical configuration. Symbolic algebra and
 * heavy numeric work run separately in the Pyodide worker (see ./worker).
 *
 * Keep this free of I/O and browser-only APIs: the engine must evaluate
 * identically on the client, the Web Worker, and Node (for server-side export).
 */
import { create, all } from "mathjs";

export const math = create(all, {});

export type MathNode = import("mathjs").MathNode;
export type Unit = import("mathjs").Unit;
