"use client";

import { useMemo } from "react";
import katex from "katex";

/**
 * Render the calc engine's TeX (`RegionResult.tex` / `substitutedTex`) as
 * textbook notation. The engine already emits KaTeX-safe LaTeX from mathjs
 * `toTex`, so any user formula renders faithfully. `throwOnError: false` (plus a
 * guard) means a malformed string degrades to its raw text rather than crashing
 * a region — the editor never goes blank over one bad formula.
 */
export interface KatexMathProps {
  tex: string;
  /** Block (centered) vs inline layout. */
  display?: boolean;
  /** Font size in px for the rendered math (respects the math floor). */
  size?: number;
}

export function KatexMath({ tex, display = false, size }: KatexMathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        throwOnError: false,
        displayMode: display,
        output: "html",
        strict: false,
      });
    } catch {
      return null;
    }
  }, [tex, display]);

  if (html == null) {
    return (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: size ?? 14 }}>
        {tex}
      </span>
    );
  }

  return (
    <span
      className="ed-katex"
      style={size ? { fontSize: size } : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
