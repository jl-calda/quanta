"use client";

import { useEffect, useRef } from "react";
import type { MathfieldElement } from "mathlive";
import { mathfieldOptionsFromKeymap, type Keymap } from "@/lib/keymap";
import { latexToSource, sourceToLatex } from "@/lib/calc";

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
}

export function MathField({ value, keymap, onCommit, onCancel, onLatexChange }: MathFieldProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  // Keep callbacks/value in a ref so the mount effect runs exactly once.
  const cb = useRef({ onCommit, onCancel, onLatexChange, value, keymap });
  cb.current = { onCommit, onCancel, onLatexChange, value, keymap };

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
      mf.className = "ed-mathfield";

      // Seed before wiring listeners so the initial value emits no events.
      mf.setValue(sourceToLatex(cb.current.value));

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
          cb.current.onCancel();
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
