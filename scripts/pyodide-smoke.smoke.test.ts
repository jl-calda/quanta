import { describe, expect, it } from "vitest";
import { getBackend } from "@/lib/calc/worker/backend";
import { createNodeRunner } from "@/lib/calc/worker/node-runner";
import { parseEnvelope, wrapEnvelope } from "@/lib/calc/worker/python/envelope";

/**
 * Pyodide NODE round-trip smoke (DONE-WHEN proof for the Node path).
 *
 * Runs under `npm run test:pyodide` (vitest.pyodide.config.ts), NOT the default
 * suite. In a Node env `getBackend()` resolves the in-process Node runner.
 *
 * Two layers:
 *  1. OFFLINE — boots the real Pyodide runtime from the local npm package and
 *     round-trips a Python-stdlib op (boot -> run -> JSON envelope -> parse).
 *     No network; always runs.
 *  2. CDN — the actual SymPy + SciPy round-trips. The scientific wheels are only
 *     distributed via the JsDelivr CDN, so these are gated on CDN reachability:
 *     they run wherever outbound CDN access is allowed and skip (with a notice)
 *     where the network policy blocks it.
 */

const PYODIDE_CDN =
  "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide-lock.json";

async function cdnReachable(): Promise<boolean> {
  try {
    const res = await fetch(PYODIDE_CDN, {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Top-level await: probe once so the CDN-only cases can self-skip cleanly.
const CDN_OK = await cdnReachable();
if (!CDN_OK) {
  console.warn(
    "[pyodide-smoke] JsDelivr CDN unreachable — skipping the SymPy/SciPy " +
      "wheel-download cases. The offline Node-bridge case still runs.",
  );
}

describe("Pyodide Node bridge (offline — no CDN)", () => {
  it("boots Pyodide in Node and round-trips a stdlib op through the envelope", async () => {
    const runner = createNodeRunner();
    const raw = await runner.run(
      wrapEnvelope("import math\nreturn math.factorial(5)"),
      { autoLoad: false },
    );
    expect(parseEnvelope<number>(raw)).toBe(120);
  });
});

describe.skipIf(!CDN_OK)("Pyodide Node round-trip (SymPy + SciPy)", () => {
  it("simplifies a symbolic expression via SymPy", async () => {
    const backend = await getBackend();
    const simplified = await backend.simplify("(x + 1)**2 - x**2");
    expect(simplified.replace(/\s+/g, "")).toBe("2*x+1");
  });

  it("solves a linear system via NumPy/SciPy", async () => {
    const backend = await getBackend();
    const x = await backend.linearSolve(
      [
        [2, 1],
        [1, 3],
      ],
      [3, 5],
    );
    expect(x[0]).toBeCloseTo(0.8, 9);
    expect(x[1]).toBeCloseTo(1.4, 9);
  });
});
