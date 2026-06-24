"use client";

import { useEffect, useRef } from "react";
import type { MathfieldElement } from "mathlive";
import { mathfieldOptionsFromKeymap, type Keymap } from "@/lib/keymap";
import { latexToSource, looksLikeLatex, sourceToLatex } from "@/lib/calc";

/**
 * MathField — the PRIMARY math-entry surface: MathLive's `<math-field>` web
 * component wired to the Quanta keymap and the calc engine. Typing builds 2D
 * notation live (Mathcad-style); on commit the LaTeX is converted to the
 * engine's plain-text source ({@link latexToSource}) so results are unchanged.
 *
 * MathLive touches `window` at import and registers a custom element, so it is
 * loaded lazily inside an effect (never a top-level import) — keeping the editor
 * server-renderable. The committed region still renders through KaTeX from the
 * engine's TeX; MathLive owns only the edit field.
 */

let configured = false;
async function loadMathlive(): Promise<typeof import("mathlive")> {
  const mod = await import("mathlive");
  if (!configured) {
    // Serve fonts/sounds locally — no runtime CDN dependency. Fonts affect only
    // the edit field; committed math uses KaTeX.
    mod.MathfieldElement.fontsDirectory = "/mathlive/fonts";
    mod.MathfieldElement.soundsDirectory = null;
    configured = true;
  }
  return mod;
}

export interface MathFieldProps {
  /** Canonical plain-text source to seed the field with. */
  value: string;
  keymap: Keymap;
  /** Committed (Enter / blur) — receives engine plain-text source. */
  onCommit: (source: string) => void;
  /** Escape — discard and leave edit mode. */
  onCancel: () => void;
  /** Live LaTeX on each keystroke (lets the parent read it when toggling mode). */
  onLatexChange?: (latex: string) => void;
  /**
   * Explicit seed LaTeX, overriding `sourceToLatex(value)`. For sources whose
   * own `toTex` would misrepresent them — e.g. a solve-block constraint `x = y`,
   * which mathjs parses as an assignment; the caller seeds via `constraintToLatex`
   * instead. The commit path is unchanged (`latexToSource(mf.value)`).
   */
  seedLatex?: string;
  /**
   * Low-chrome, in-place styling: drops the boxed border/glow so the field reads
   * as a caret in the worksheet flow (Mathcad/BlockPad feel). Opt-in — the boxed
   * default stays for callers like the solve block.
   */
  chromeless?: boolean;
  /**
   * Enter commits and advances (no literal newline). When set, Enter is
   * intercepted and reported here with the engine source; when absent, Enter
   * keeps MathLive's default (the `change` event commits), which the solve block
   * relies on.
   */
  onEnter?: (source: string) => void;
  /**
   * Esc commits instead of cancelling (matches click-away). Opt-in — the solve
   * block keeps Esc as cancel/discard.
   */
  commitOnEscape?: boolean;
}

export function MathField({
  value,
  keymap,
  onCommit,
  onCancel,
  onLatexChange,
  seedLatex,
  chromeless,
  onEnter,
  commitOnEscape,
}: MathFieldProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  // Keep callbacks/value in a ref so the mount effect runs exactly once.
  const cb = useRef({ onCommit, onCancel, onLatexChange, value, keymap, seedLatex, chromeless, onEnter, commitOnEscape });
  cb.current = { onCommit, onCancel, onLatexChange, value, keymap, seedLatex, chromeless, onEnter, commitOnEscape };

  useEffect(() => {
    let disposed = false;
    let done = false; // commit/cancel is terminal — guard the blur→change echo
    let mf: MathfieldElement | null = null;

    loadMathlive().then(({ MathfieldElement }) => {
      if (disposed || !hostRef.current) return;
      mf = new MathfieldElement();

      const opts = mathfieldOptionsFromKeymap(cb.current.keymap);
      mf.inlineShortcuts = { ...mf.inlineShortcuts, ...opts.inlineShortcuts };
      if (opts.keybindings.length) {
        mf.keybindings = [...mf.keybindings, ...(opts.keybindings as typeof mf.keybindings)];
      }
      mf.mathVirtualKeyboardPolicy = "manual"; // Quanta has its own keypad
      mf.smartMode = false; // letters stay math, not prose
      mf.className = "ed-mathfield" + (cb.current.chromeless ? " ed-mathfield--inplace" : "");

      // Seed before wiring listeners so the initial value emits no events.
      mf.setValue(cb.current.seedLatex ?? sourceToLatex(cb.current.value));

      mf.addEventListener("input", () => {
        if (mf) cb.current.onLatexChange?.(mf.value);
      });
      mf.addEventListener("change", () => {
        if (disposed || done || !mf) return;
        done = true;
        cb.current.onCommit(latexToSource(mf.value));
      });
      mf.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          done = true;
          // Esc commits (like click-away) when the caller opts in; otherwise the
          // legacy cancel/discard (solve block).
          if (cb.current.commitOnEscape && mf) cb.current.onCommit(latexToSource(mf.value));
          else cb.current.onCancel();
        } else if (e.key === "Enter" && cb.current.onEnter && mf) {
          // Enter commits and advances to the next line — never a literal
          // newline. Shift+Enter commits in place (no new region), so an
          // engineer can finish a region without flowing on.
          e.preventDefault();
          e.stopPropagation();
          done = true;
          if (e.shiftKey) cb.current.onCommit(latexToSource(mf.value));
          else cb.current.onEnter(latexToSource(mf.value));
        }
      });
      // LaTeX paste — deterministic, not reliant on MathLive's format sniffing.
      // When the clipboard holds LaTeX (`\frac{a}{b}`, `x^{2}`), insert it as
      // LaTeX so it renders as 2D notation; otherwise let MathLive handle the
      // paste natively (plain ascii-math expressions still parse on commit).
      mf.addEventListener("paste", (e: ClipboardEvent) => {
        const text = e.clipboardData?.getData("text/plain") ?? "";
        if (text && looksLikeLatex(text) && mf) {
          e.preventDefault();
          mf.executeCommand(["insert", text, { format: "latex" }]);
        }
      });

      hostRef.current.appendChild(mf);
      mf.focus();
    });

    return () => {
      disposed = true;
      mf?.remove();
      mf = null;
    };
    // Mount once; live value is read from the ref. The region remounts (keyed by
    // id) when a different region is edited.
  }, []);

  return (
    <span ref={hostRef} className="ed-mathfield-host" onClick={(e) => e.stopPropagation()} />
  );
}
