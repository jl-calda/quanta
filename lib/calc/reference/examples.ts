/**
 * Worked-example runner — the anti-drift core of the Reference library.
 *
 * Runs a {@link WorkedExample}'s region sources through the real calc engine
 * ({@link evaluateSheet}) so the detail pane renders a *computed* result, never a
 * hard-coded one. Unit-aware throughout: target display units and result
 * formatting flow exactly as they would in a worksheet. Pure and deterministic,
 * so the catalog integrity test can assert every example evaluates cleanly.
 */
import { evaluateSheet } from "../recalc";
import { SI_SYSTEM } from "../units";
import type { RegionInput } from "../types";
import type { WorkedExample } from "./types";

export interface ExampleLine {
  /** TeX of `name := formula` (or the bare formula), for KaTeX rendering. */
  tex: string;
  /** Formatted result carrying its unit, e.g. `"12.53 mm"`. */
  formatted: string;
  /** The defined name, if this region is a definition. */
  name: string | null;
  /** True for the last (highlighted) region. */
  isResult: boolean;
  status: "current" | "error";
}

export interface RunResult {
  ok: boolean;
  lines: ExampleLine[];
  /** App-voice message when a region failed (should never fire in production). */
  error?: string;
}

/** Run a worked example through the engine and normalise it for rendering. */
export function runExample(spec: WorkedExample): RunResult {
  const last = spec.regions.length - 1;
  const inputs: RegionInput[] = spec.regions.map((source, i) => ({
    id: `ex-${i}`,
    source,
    unit: spec.units?.[i],
    format: i === last ? spec.format : undefined,
  }));

  const sheet = evaluateSheet(inputs, { unitSystem: SI_SYSTEM });

  let error: string | undefined;
  const lines: ExampleLine[] = sheet.regions.map((r, i) => {
    if (r.status === "error" && !error) {
      error = r.error?.message ?? "This example couldn't be evaluated.";
    }
    return {
      tex: r.tex,
      formatted: r.formatted,
      name: r.name,
      isResult: i === last,
      status: r.status === "error" ? "error" : "current",
    };
  });

  return { ok: error == null, lines, error };
}
