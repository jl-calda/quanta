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
import { registerMatrixFunctions } from "./matrix";
import { registerProgramDispatcher } from "./program-registry";
import { registerIteratorFunctions } from "./iterators";

export const math = create(all, {});

// Unit-aware Mathcad-named linear algebra (eigenvalues, lsolve). Registered once,
// here, so every module shares one configured instance. matrix.ts takes the
// instance as an argument (no static import back to ./math) to stay cycle-free.
registerMatrixFunctions(math);

// Range variables (`a..b`) and the live-evaluating ∑ / ∏ / ∫ operators
// (`summation`, `product`, `integral`, `__quantaRange`). Registered once, here, so
// the unmodified recalc engine evaluates and renders them. iterators.ts takes the
// instance as an argument (no static import back to ./math) to stay cycle-free.
registerIteratorFunctions(math);

// Program-block dispatcher: a single static function `__quantaProgram(token, …)`
// that resolves a compiled program closure by token (see ./program-registry).
// Registered once here so a program region folded into the worksheet as a
// synthetic function-assignment is callable through the unmodified recalc engine.
registerProgramDispatcher(math);

export type MathNode = import("mathjs").MathNode;
export type Unit = import("mathjs").Unit;
