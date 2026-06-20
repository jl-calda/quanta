/**
 * Build MathLive configuration from a Quanta keymap.
 *
 * The keymap is the single source of truth for math entry. MathLive natively
 * covers `/`→fraction, `^`/`_`, `\`→command mode, and Space→exit-group, so we
 * only translate the Quanta-specific moves: the `:`→`:=` assign (Mathcad) or
 * the `:=` literal (Default), explicit fraction / square-root / Greek
 * keybindings for the Default profile, and a curated set of engineering unit
 * shortcuts so unit tokens stay upright and survive the LaTeX→engine round-trip
 * (`12\mathrm{kN}` → `12 kN`).
 *
 * Typed loosely (no import of the `mathlive` package) so the keymap layer stays
 * portable — the editor casts this onto MathLive's option types.
 */
import type { Keymap } from "./types";

export interface MathfieldKeybinding {
  key: string;
  command: string | unknown[];
}

export interface MathfieldKeymapConfig {
  inlineShortcuts: Record<string, string>;
  keybindings: MathfieldKeybinding[];
}

/**
 * Engineering units worth keeping upright. Multi-letter only — single letters
 * (`m`, `s`, `N`, `g`) are too often variables to auto-format; the engine still
 * reads them as units after a number (`12N`) when no variable shadows them.
 */
const UNIT_SHORTCUTS: Record<string, string> = {
  kN: "\\mathrm{kN}",
  MN: "\\mathrm{MN}",
  kip: "\\mathrm{kip}",
  Pa: "\\mathrm{Pa}",
  kPa: "\\mathrm{kPa}",
  MPa: "\\mathrm{MPa}",
  GPa: "\\mathrm{GPa}",
  psi: "\\mathrm{psi}",
  ksi: "\\mathrm{ksi}",
  mm: "\\mathrm{mm}",
  cm: "\\mathrm{cm}",
  km: "\\mathrm{km}",
  kg: "\\mathrm{kg}",
  rad: "\\mathrm{rad}",
  deg: "\\mathrm{deg}",
  mol: "\\mathrm{mol}",
};

/** Quanta key chord → MathLive keystroke string (only modifier chords apply). */
function toMathliveKey(keys: string): string | null {
  const norm = keys.toLowerCase();
  if (norm.startsWith("ctrl+")) return norm; // ctrl+/, ctrl+r, ctrl+g
  return null; // single keys / Space / F9 are native, or owned by the editor
}

/** MathLive insert command for an action MathLive has no native binding for. */
function commandForAction(action: string): MathfieldKeybinding["command"] | null {
  switch (action) {
    case "insertFraction":
      return ["insert", "\\frac{#@}{#?}"];
    case "insertSqrt":
      return ["insert", "\\sqrt{#0}"];
    case "insertGreek":
      // Switch to LaTeX command mode so the next typed name becomes a symbol.
      return ["switchMode", "latex"];
    default:
      return null;
  }
}

export function mathfieldOptionsFromKeymap(keymap: Keymap): MathfieldKeymapConfig {
  const inlineShortcuts: Record<string, string> = { ...UNIT_SHORTCUTS };
  const keybindings: MathfieldKeybinding[] = [];

  for (const b of keymap.bindings) {
    if (b.scope !== "math" || !b.chord) continue; // app accelerators / native keys
    if (b.action === "insertAssign") {
      // `:` (Mathcad) or `:=` (Default) → the assignment glyphs.
      inlineShortcuts[b.chord] = ":=";
      continue;
    }
    const key = toMathliveKey(b.chord);
    const command = commandForAction(b.action);
    if (key && command) keybindings.push({ key, command });
  }

  return { inlineShortcuts, keybindings };
}
