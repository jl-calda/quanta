"use client";

import { type Keymap } from "@/lib/keymap";
import { latexToSource } from "@/lib/calc";
import { MathField } from "./math-field";

/**
 * MathInput — the reusable math-entry seam. Natural 2D entry via MathLive is the
 * sole authoring mode (Mathcad/BlockPad-style): the field edits **in place** in
 * the worksheet flow (low-chrome — just a thin blinking caret), with no
 * style-mode toggle and no palette over the canvas. The build-notation palette
 * lives in the docked bottom toolbar (the Math keypad). Entry round-trips through
 * the engine's plain-text `source` (never LaTeX in the content tree); the keymap
 * comes from `/lib/keymap`.
 *
 * It owns only the entry surface — commit (blur / Esc) and advance (Enter → next
 * line) are reported to the caller.
 */
export interface MathInputProps {
  /** Canonical engine-plain-text source to seed entry with. */
  value: string;
  keymap: Keymap;
  /** Committed (blur / Esc) — receives engine plain-text source. */
  onCommit: (source: string) => void;
  /** Enter — commit and advance to the next line. Optional. */
  onEnter?: (source: string) => void;
  /** Live source as it changes (e.g. for an external preview). Optional. */
  onChange?: (source: string) => void;
}

export function MathInput({ value, keymap, onCommit, onEnter, onChange }: MathInputProps) {
  return (
    <MathField
      value={value}
      keymap={keymap}
      chromeless
      commitOnEscape
      onCommit={onCommit}
      onEnter={onEnter}
      onLatexChange={onChange ? (latex) => onChange(latexToSource(latex)) : undefined}
      // Esc commits via `commitOnEscape`; onCancel is required by MathField but
      // unused on this path — fall back to committing the seed value.
      onCancel={() => onCommit(value)}
    />
  );
}
